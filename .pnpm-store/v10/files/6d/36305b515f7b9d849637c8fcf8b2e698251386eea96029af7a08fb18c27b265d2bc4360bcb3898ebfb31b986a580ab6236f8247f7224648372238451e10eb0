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
var global_error_handler_exports = {};
__export(global_error_handler_exports, {
  GlobalErrorHandlerMiddleware: () => GlobalErrorHandlerMiddleware,
  default: () => global_error_handler_default,
  setErrorHandler: () => setErrorHandler
});
module.exports = __toCommonJS(global_error_handler_exports);
var import__ = require("../index");
let handler = null;
const setErrorHandler = (errorHandler) => {
  handler = errorHandler;
};
const GlobalErrorHandlerMiddleware = () => ({
  response(next) {
    if (!import__.configs.Promise) {
      return next();
    }
    return new import__.configs.Promise((resolve, reject) => {
      next().then((response) => resolve(response)).catch((response) => {
        let proceed = true;
        handler && (proceed = !(handler(response) === true));
        proceed && reject(response);
      });
    });
  }
});
var global_error_handler_default = GlobalErrorHandlerMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GlobalErrorHandlerMiddleware,
  setErrorHandler
});
//# sourceMappingURL=global-error-handler.js.map