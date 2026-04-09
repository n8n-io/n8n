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
var concat_common_exports = {};
__export(concat_common_exports, {
  concat: () => concat
});
module.exports = __toCommonJS(concat_common_exports);
var import_typeGuards = require("./typeGuards.js");
function drain(stream) {
  return new Response(stream).blob();
}
async function toBlobPart(source) {
  if (source instanceof Blob || source instanceof Uint8Array) {
    return source;
  }
  if ((0, import_typeGuards.isWebReadableStream)(source)) {
    return drain(source);
  } else {
    throw new Error(
      "Unsupported source type. Only Blob, Uint8Array, and ReadableStream are supported in browser."
    );
  }
}
function arrayToArrayBuffer(source) {
  if ("resize" in source.buffer) {
    return source;
  }
  return source.map((x) => x);
}
async function concat(sources) {
  const parts = [];
  for (const source of sources) {
    const blobPart = await toBlobPart(typeof source === "function" ? source() : source);
    if (blobPart instanceof Blob) {
      parts.push(blobPart);
    } else {
      parts.push(new Blob([arrayToArrayBuffer(blobPart)]));
    }
  }
  return new Blob(parts);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  concat
});
