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
var sha256_exports = {};
__export(sha256_exports, {
  computeSha256Hash: () => computeSha256Hash,
  computeSha256Hmac: () => computeSha256Hmac
});
module.exports = __toCommonJS(sha256_exports);
var import_node_crypto = require("node:crypto");
async function computeSha256Hmac(key, stringToSign, encoding) {
  const decodedKey = Buffer.from(key, "base64");
  return (0, import_node_crypto.createHmac)("sha256", decodedKey).update(stringToSign).digest(encoding);
}
async function computeSha256Hash(content, encoding) {
  return (0, import_node_crypto.createHash)("sha256").update(content).digest(encoding);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeSha256Hash,
  computeSha256Hmac
});
