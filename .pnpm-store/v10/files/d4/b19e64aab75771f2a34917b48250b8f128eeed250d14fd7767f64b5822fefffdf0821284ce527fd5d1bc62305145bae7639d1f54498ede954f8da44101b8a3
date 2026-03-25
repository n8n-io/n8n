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
var timeout_error_exports = {};
__export(timeout_error_exports, {
  createTimeoutError: () => createTimeoutError,
  isTimeoutError: () => isTimeoutError
});
module.exports = __toCommonJS(timeout_error_exports);
const isTimeoutError = (e) => {
  return e && e.name === "TimeoutError";
};
const createTimeoutError = (message) => {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createTimeoutError,
  isTimeoutError
});
//# sourceMappingURL=timeout-error.js.map