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
var sha256_common_exports = {};
__export(sha256_common_exports, {
  computeSha256Hash: () => computeSha256Hash,
  computeSha256Hmac: () => computeSha256Hmac
});
module.exports = __toCommonJS(sha256_common_exports);
var import_bytesEncoding = require("./bytesEncoding.js");
let subtleCrypto;
function getCrypto() {
  if (subtleCrypto) {
    return subtleCrypto;
  }
  if (!self.crypto || !self.crypto.subtle) {
    throw new Error("Your browser environment does not support cryptography functions.");
  }
  subtleCrypto = self.crypto.subtle;
  return subtleCrypto;
}
async function computeSha256Hmac(key, stringToSign, encoding) {
  const crypto = getCrypto();
  const keyBytes = (0, import_bytesEncoding.stringToUint8Array)(key, "base64");
  const stringToSignBytes = (0, import_bytesEncoding.stringToUint8Array)(stringToSign, "utf-8");
  const cryptoKey = await crypto.importKey(
    "raw",
    keyBytes,
    {
      name: "HMAC",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );
  const signature = await crypto.sign(
    {
      name: "HMAC",
      hash: { name: "SHA-256" }
    },
    cryptoKey,
    stringToSignBytes
  );
  return (0, import_bytesEncoding.uint8ArrayToString)(new Uint8Array(signature), encoding);
}
async function computeSha256Hash(content, encoding) {
  const contentBytes = (0, import_bytesEncoding.stringToUint8Array)(content, "utf-8");
  const digest = await getCrypto().digest({ name: "SHA-256" }, contentBytes);
  return (0, import_bytesEncoding.uint8ArrayToString)(new Uint8Array(digest), encoding);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeSha256Hash,
  computeSha256Hmac
});
