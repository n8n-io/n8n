"use strict";Object.defineProperty(exports, "__esModule", {value: true});// src/utils/bufferUtils.ts
var encoder = new TextEncoder();
function encodeBuffer(text) {
  return encoder.encode(text);
}
function decodeBuffer(buffer, encoding) {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(buffer);
}
function toArrayBuffer(array) {
  return array.buffer.slice(
    array.byteOffset,
    array.byteOffset + array.byteLength
  );
}





exports.encodeBuffer = encodeBuffer; exports.decodeBuffer = decodeBuffer; exports.toArrayBuffer = toArrayBuffer;
//# sourceMappingURL=chunk-LK6DILFK.js.map