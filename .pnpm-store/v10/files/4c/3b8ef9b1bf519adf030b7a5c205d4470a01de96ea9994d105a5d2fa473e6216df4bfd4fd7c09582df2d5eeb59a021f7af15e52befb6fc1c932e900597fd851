var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  blobReader: () => blobReader
});
module.exports = __toCommonJS(src_exports);
var import_util_base64 = require("@smithy/util-base64");
function blobReader(blob, onChunk, chunkSize = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onerror = reject;
    fileReader.onabort = reject;
    const size = blob.size;
    let totalBytesRead = 0;
    const read = /* @__PURE__ */ __name(() => {
      if (totalBytesRead >= size) {
        resolve();
        return;
      }
      fileReader.readAsDataURL(blob.slice(totalBytesRead, Math.min(size, totalBytesRead + chunkSize)));
    }, "read");
    fileReader.onload = (event) => {
      const result = event.target.result;
      const dataOffset = result.indexOf(",") + 1;
      const data = result.substring(dataOffset);
      const decoded = (0, import_util_base64.fromBase64)(data);
      onChunk(decoded);
      totalBytesRead += decoded.byteLength;
      read();
    };
    read();
  });
}
__name(blobReader, "blobReader");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  blobReader
});

