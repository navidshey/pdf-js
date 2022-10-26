import React, { useEffect, useState, useRef, useCallback } from "react";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

const Objects = {'Rectangle':0, 'Circle':1, 'Line':2, 'Polygan':3}
const App = ({ url="sample.pdf" }) => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const canvasRef = useRef();
  const ctx = useRef();
  const [pdfRef, setPdfRef] = useState("");
  const shapes= useRef([]);
  const [currentPage, setCurrentPage]=useState(1);
  const [totalPages, setTotalPages]=useState(null);
  const zoomScale=useRef(1);
  const [docScale, setDocScale] = useState(1);
  const object=useRef(Objects.Line);

  const rotateAngle = 0;
  var pdf_image = "";


  const currentScale =
    (width) =>{
    return width * zoomScale.current;
  }

  const baseScale =
    (width)=>{
    return width / zoomScale.current;
  }

    const reDrawPreviousShapes = () =>{  
      ctx.current.beginPath();
      shapes.current.forEach(shape => { 
      if(shape.page !== currentPage) 
        return;
        
      ctx.current.strokeStyle = "#1B9AFF";
      ctx.current.lineWidth = 1;
      switch(shape.type){
        case Objects.Rectangle:{
          ctx.current.rect(currentScale(shape.startX), currentScale(shape.startY), currentScale(shape.width), currentScale(shape.height)); 
          break;
        }
        case Objects.Circle:{
          ctx.current.clearRect(0,0,ctx.current.width,ctx.current.height);
          ctx.current.arc(currentScale(shape.startX), currentScale(shape.startY), Math.max(Math.abs(currentScale(shape.width)),Math.abs(currentScale(shape.height))), 0, 2 * Math.PI); 
          break;
        }
        case Objects.Line:{
          ctx.current.moveTo(currentScale(shape.startX), currentScale(shape.startY));
          ctx.current.lineTo(currentScale(shape.width), currentScale(shape.height));
          break;
        }
        default:
          break;
      }
      ctx.current.stroke();
    })
   }

  const renderPage = useCallback(
    (pageNum, pdf = pdfRef) => {
      pdf &&
        pdf.getPage(pageNum).then(function (page) {
          setTotalPages(page._transport._numPages);
          const viewport = page.getViewport({ scale: docScale, rotation: rotateAngle });
          const canvas = canvasRef.current;
          canvas.height = viewport?.height;
          canvas.width = viewport?.width;
          const renderContext = {
            canvasContext: canvas?.getContext("2d"),
            viewport: viewport,
            textContent: pdfRef,
          };

          page.render(renderContext);
        });
    },
    [docScale, pdfRef]
  );

  useEffect(() => {
    if (url.slice(-4).toLowerCase() === ".pdf") {
      renderPage(currentPage, pdfRef);
    } else {
      setPdfRef("");
    }
  }, [currentPage, pdfRef, renderPage, url]);

  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(
      (loadedPdf) => {
        setPdfRef(loadedPdf);
      },
      function (reason) {
        console.error(reason);
      }
    );
  }, [url]);

  
  
  const cursorInCanvas = useRef(false);
  var canvasOfDoc = canvasRef?.current;
  var startX;
  var startY;
  
  useEffect(() => {
    if (canvasOfDoc) {
      ctx.current = canvasOfDoc.getContext("2d");
    }
  }, [canvasOfDoc]);
  

  const saveInitialCanvas = () => {
    if (canvasOfDoc?.getContext) {
      var canvasPic = new Image();
      canvasPic.src = canvasOfDoc.toDataURL();
      pdf_image = canvasPic;
    }
  };


  function handleMouseIn(e) {
    if (typeof pdf_image == "string") {
      saveInitialCanvas();
    }
    e.preventDefault();
    e.stopPropagation();
    startX = ((e.offsetX * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
    startY = ((e.offsetY * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;

    cursorInCanvas.current = true;
  }

  const isLinear = () => object.current === Objects.Line || object.current === Objects.Polygan;

  

  function handleMouseUp(e){
    e.preventDefault();
    e.stopPropagation();
    let mouseX = ((e.offsetX * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
    let mouseY = ((e.offsetY * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
    
    let width = isLinear() ? mouseX : mouseX - startX ;
    let height = isLinear() ? mouseY : mouseY - startY ;

    if(cursorInCanvas.current){
    shapes.current =  [...shapes.current, {type: object.current, page: currentPage, startX: baseScale(startX), startY: baseScale(startY), width: baseScale(width), height: baseScale(height)}];
  }
    cursorInCanvas.current = false;
    ctx.current.lineTo(mouseX, mouseY);
  }

  function handleMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!cursorInCanvas.current) {
      return;
    }
    let mouseX = ((e.offsetX * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
    let mouseY = ((e.offsetY * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;

    let width = mouseX - startX;
    let height = mouseY - startY;
    if (ctx.current) {
      ctx.current?.clearRect(0, 0, canvasOfDoc.width, canvasOfDoc.height);
      ctx.current?.drawImage(pdf_image, 0, 0);
      ctx.current.beginPath();
      ctx.current.strokeStyle = "#1B9AFF";
      ctx.current.lineWidth = 1;
      
      if(object.current === Objects.Rectangle){
        ctx.current.rect(startX, startY, width, height);
        ctx.current.stroke();
      }
      else if(object.current === Objects.Circle){
        drawOval(width, height);
      }
      else if(object.current === Objects.Line){
        ctx.current.moveTo(startX, startY);
        ctx.current.lineTo(mouseX, mouseY);
        ctx.current.stroke();
      }
      reDrawPreviousShapes();
    }
  }

  function drawOval(x,y){
    ctx.current.clearRect(0,0,ctx.current.width,ctx.current.height);
    ctx.current.beginPath();
    ctx.current.arc(startX, startY, Math.max(Math.abs(x),Math.abs(y)), 0, 2 * Math.PI); 
    ctx.current.stroke();
  }



  canvasOfDoc?.addEventListener("mousedown", handleMouseIn);
  canvasOfDoc?.addEventListener("mousemove", handleMouseMove);
  canvasOfDoc?.addEventListener("mouseup", handleMouseUp);
  canvasOfDoc?.addEventListener("mouseout", handleMouseUp);


function onPrevPage() {
  if (currentPage <= 1) {
    return;
  }
  setCurrentPage((prev) => prev -1);
}

function onNextPage() {
  if (currentPage >= totalPages) {
    return;
  }
  setCurrentPage(prev =>prev+1)
}

function chooseShape(type){
  object.current = type;
}

function zoom(scale){
  zoomScale.current = zoomScale.current+scale;
  setDocScale(prev => prev+scale);
}
  return (
        <>
    <div>
      <button id="prev" onClick={onPrevPage}>Previous</button>
      <button id="next" onClick={onNextPage}>Next</button> 
      <button id="rectangle" onClick={()=>chooseShape(Objects.Rectangle)}>Rectangle</button>
      <button id="circle" onClick={()=>chooseShape(Objects.Circle)}>Circle</button>
      <button id="line" onClick={()=>chooseShape(Objects.Line)}>Line</button>
      <button id="zoom_in" onClick={()=>zoom(.5)}>+</button>
      <button id="zoom_out" onClick={()=>zoom(-.5)}>-</button>
      
      
      { currentPage && totalPages && <span>Page: <span id="page_num">{currentPage}</span> / <span id="page_count">{totalPages}</span><span>scale: {zoomScale.current}</span></span>}
    </div>
    <canvas id="pdf-doc" ref={canvasRef} />
    </>
  );
}
export default App;