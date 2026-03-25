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
var digest_exports = {};
__export(digest_exports, {
  generateDigest: () => generateDigest
});
module.exports = __toCommonJS(digest_exports);
const mergeBuffers = (buffer1, buffer2) => {
  if (!buffer1) {
    return buffer2;
  }
  const merged = new Uint8Array(
    new ArrayBuffer(buffer1.byteLength + buffer2.byteLength)
  );
  merged.set(new Uint8Array(buffer1), 0);
  merged.set(buffer2, buffer1.byteLength);
  return merged;
};
const generateDigest = async (stream, generator) => {
  if (!stream) {
    return null;
  }
  let result = void 0;
  const reader = stream.getReader();
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    result = await generator(mergeBuffers(result, value));
  }
  if (!result) {
    return null;
  }
  return Array.prototype.map.call(new Uint8Array(result), (x) => x.toString(16).padStart(2, "0")).join("");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateDigest
});
