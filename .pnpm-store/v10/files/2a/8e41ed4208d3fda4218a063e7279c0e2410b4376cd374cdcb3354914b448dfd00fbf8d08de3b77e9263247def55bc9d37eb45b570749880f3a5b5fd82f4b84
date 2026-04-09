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
var bytesEncoding_common_exports = {};
__export(bytesEncoding_common_exports, {
  base64ToUint8Array: () => base64ToUint8Array,
  base64UrlToUint8Array: () => base64UrlToUint8Array,
  hexStringToUint8Array: () => hexStringToUint8Array,
  stringToUint8Array: () => stringToUint8Array,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64Url: () => uint8ArrayToBase64Url,
  uint8ArrayToHexString: () => uint8ArrayToHexString,
  uint8ArrayToString: () => uint8ArrayToString,
  uint8ArrayToUtf8String: () => uint8ArrayToUtf8String,
  utf8StringToUint8Array: () => utf8StringToUint8Array
});
module.exports = __toCommonJS(bytesEncoding_common_exports);
function uint8ArrayToString(bytes, format) {
  switch (format) {
    case "utf-8":
      return uint8ArrayToUtf8String(bytes);
    case "base64":
      return uint8ArrayToBase64(bytes);
    case "base64url":
      return uint8ArrayToBase64Url(bytes);
    case "hex":
      return uint8ArrayToHexString(bytes);
  }
}
function stringToUint8Array(value, format) {
  switch (format) {
    case "utf-8":
      return utf8StringToUint8Array(value);
    case "base64":
      return base64ToUint8Array(value);
    case "base64url":
      return base64UrlToUint8Array(value);
    case "hex":
      return hexStringToUint8Array(value);
  }
}
function uint8ArrayToBase64(bytes) {
  return btoa([...bytes].map((x) => String.fromCharCode(x)).join(""));
}
function uint8ArrayToBase64Url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function uint8ArrayToUtf8String(bytes) {
  const decoder = new TextDecoder();
  const dataString = decoder.decode(bytes);
  return dataString;
}
function uint8ArrayToHexString(bytes) {
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function utf8StringToUint8Array(value) {
  return new TextEncoder().encode(value);
}
function base64ToUint8Array(value) {
  return new Uint8Array([...atob(value)].map((x) => x.charCodeAt(0)));
}
function base64UrlToUint8Array(value) {
  const base64String = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToUint8Array(base64String);
}
const hexDigits = new Set("0123456789abcdefABCDEF");
function hexStringToUint8Array(value) {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length / 2; ++i) {
    const highNibble = value[2 * i];
    const lowNibble = value[2 * i + 1];
    if (!hexDigits.has(highNibble) || !hexDigits.has(lowNibble)) {
      return bytes.slice(0, i);
    }
    bytes[i] = parseInt(`${highNibble}${lowNibble}`, 16);
  }
  return bytes;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  base64ToUint8Array,
  base64UrlToUint8Array,
  hexStringToUint8Array,
  stringToUint8Array,
  uint8ArrayToBase64,
  uint8ArrayToBase64Url,
  uint8ArrayToHexString,
  uint8ArrayToString,
  uint8ArrayToUtf8String,
  utf8StringToUint8Array
});
