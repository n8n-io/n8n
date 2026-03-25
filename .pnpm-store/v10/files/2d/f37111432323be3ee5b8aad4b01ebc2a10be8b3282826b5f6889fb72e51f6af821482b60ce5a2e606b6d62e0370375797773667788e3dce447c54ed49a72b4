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
var crypto_exports = {};
__export(crypto_exports, {
  createHash: () => createHash,
  md5: () => md5,
  sha1: () => sha1,
  sha256: () => sha256
});
module.exports = __toCommonJS(crypto_exports);
const sha256 = async (data) => {
  const algorithm = { name: "SHA-256", alias: "sha256" };
  const hash = await createHash(data, algorithm);
  return hash;
};
const sha1 = async (data) => {
  const algorithm = { name: "SHA-1", alias: "sha1" };
  const hash = await createHash(data, algorithm);
  return hash;
};
const md5 = async (data) => {
  const algorithm = { name: "MD5", alias: "md5" };
  const hash = await createHash(data, algorithm);
  return hash;
};
const createHash = async (data, algorithm) => {
  let sourceBuffer;
  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    sourceBuffer = data;
  } else {
    if (typeof data === "object") {
      data = JSON.stringify(data);
    }
    sourceBuffer = new TextEncoder().encode(String(data));
  }
  if (crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      {
        name: algorithm.name
      },
      sourceBuffer
    );
    const hash = Array.prototype.map.call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2)).join("");
    return hash;
  }
  return null;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createHash,
  md5,
  sha1,
  sha256
});
