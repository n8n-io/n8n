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
var typeGuards_exports = {};
__export(typeGuards_exports, {
  isBinaryBody: () => isBinaryBody,
  isBlob: () => isBlob,
  isNodeReadableStream: () => isNodeReadableStream,
  isReadableStream: () => isReadableStream,
  isWebReadableStream: () => isWebReadableStream
});
module.exports = __toCommonJS(typeGuards_exports);
function isNodeReadableStream(x) {
  return Boolean(x && typeof x["pipe"] === "function");
}
function isWebReadableStream(x) {
  return Boolean(
    x && typeof x.getReader === "function" && typeof x.tee === "function"
  );
}
function isBinaryBody(body) {
  return body !== void 0 && (body instanceof Uint8Array || isReadableStream(body) || typeof body === "function" || body instanceof Blob);
}
function isReadableStream(x) {
  return isNodeReadableStream(x) || isWebReadableStream(x);
}
function isBlob(x) {
  return typeof x.stream === "function";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isBinaryBody,
  isBlob,
  isNodeReadableStream,
  isReadableStream,
  isWebReadableStream
});
