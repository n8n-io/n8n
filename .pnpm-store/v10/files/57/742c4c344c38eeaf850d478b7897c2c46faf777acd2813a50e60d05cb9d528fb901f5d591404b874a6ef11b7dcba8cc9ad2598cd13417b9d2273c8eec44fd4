// src/browser.ts
var globalObject = function() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  return window;
}();
var { FormData, Blob, File } = globalObject;
export {
  Blob,
  File,
  FormData
};
