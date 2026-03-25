"use strict";
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
var headers_exports = {};
__export(headers_exports, {
  headersArrayToObject: () => headersArrayToObject,
  headersObjectToArray: () => headersObjectToArray
});
module.exports = __toCommonJS(headers_exports);
function headersObjectToArray(headers, separator, setCookieSeparator) {
  if (!setCookieSeparator)
    setCookieSeparator = separator;
  const result = [];
  for (const name in headers) {
    const values = headers[name];
    if (values === void 0)
      continue;
    if (separator) {
      const sep = name.toLowerCase() === "set-cookie" ? setCookieSeparator : separator;
      for (const value of values.split(sep))
        result.push({ name, value: value.trim() });
    } else {
      result.push({ name, value: values });
    }
  }
  return result;
}
function headersArrayToObject(headers, lowerCase) {
  const result = {};
  for (const { name, value } of headers)
    result[lowerCase ? name.toLowerCase() : name] = value;
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  headersArrayToObject,
  headersObjectToArray
});
