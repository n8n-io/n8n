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
var bytesEncoding_exports = {};
__export(bytesEncoding_exports, {
  stringToUint8Array: () => stringToUint8Array,
  uint8ArrayToString: () => uint8ArrayToString
});
module.exports = __toCommonJS(bytesEncoding_exports);
function uint8ArrayToString(bytes, format) {
  return Buffer.from(bytes).toString(format);
}
function stringToUint8Array(value, format) {
  return Buffer.from(value, format);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  stringToUint8Array,
  uint8ArrayToString
});
