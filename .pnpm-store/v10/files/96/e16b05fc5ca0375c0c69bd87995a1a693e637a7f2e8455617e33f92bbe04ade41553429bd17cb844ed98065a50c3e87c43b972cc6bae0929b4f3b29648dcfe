var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var arrayBuffer_exports = {};
__export(arrayBuffer_exports, {
  arrayBufferViewToArrayBuffer: () => arrayBufferViewToArrayBuffer
});
module.exports = __toCommonJS(arrayBuffer_exports);
function arrayBufferViewToArrayBuffer(source) {
  if (source.buffer instanceof ArrayBuffer && source.byteOffset === 0 && source.byteLength === source.buffer.byteLength) {
    return source.buffer;
  }
  const arrayBuffer = new ArrayBuffer(source.byteLength);
  const view = new Uint8Array(arrayBuffer);
  const sourceView = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  view.set(sourceView);
  return view.buffer;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  arrayBufferViewToArrayBuffer
});
