/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
importScripts('dist/shim.min.js');
/* uncomment the next line for encoding support */
importScripts('dist/cpexcel.js');
importScripts('xlsx.js');
postMessage({t:"ready"});

onmessage = function (evt) {
  var v;
  try {
    v = XLSX.read(evt.data.d, {type: evt.data.b, codepage: evt.data.c});
postMessage({t:"xlsx", d:JSON.stringify(v)});
  } catch(e) { postMessage({t:"e",d:e.stack||e}); }
};
