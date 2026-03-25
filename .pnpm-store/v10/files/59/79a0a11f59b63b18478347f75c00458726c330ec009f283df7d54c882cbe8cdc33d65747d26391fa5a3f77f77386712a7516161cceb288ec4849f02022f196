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
var log_exports = {};
__export(log_exports, {
  LogMiddleware: () => LogMiddleware,
  default: () => log_default,
  defaultErrorLogger: () => defaultErrorLogger,
  defaultSuccessLogger: () => defaultSuccessLogger,
  setErrorLogger: () => setErrorLogger,
  setLoggerEnabled: () => setLoggerEnabled,
  setSuccessLogger: () => setSuccessLogger
});
module.exports = __toCommonJS(log_exports);
var import_response = require("../response");
const defaultSuccessLogger = (message) => {
  const logger = console.info ? console.info : console.log;
  logger(message);
};
const defaultErrorLogger = (message) => {
  const logger = console.error ? console.error : console.log;
  logger(message);
};
let isLoggerEnabled = Boolean(console && console.log);
let successLogger = defaultSuccessLogger;
let errorLogger = defaultErrorLogger;
const setSuccessLogger = (logger) => {
  successLogger = logger;
};
const setErrorLogger = (logger) => {
  errorLogger = logger;
};
const setLoggerEnabled = (value) => {
  isLoggerEnabled = value;
};
const log = (request, response) => {
  if (isLoggerEnabled) {
    const httpCall = `${request.method().toUpperCase()} ${request.url()}`;
    const direction = response ? "<-" : "->";
    const isError = response && !response.success();
    const errorLabel = isError ? "(ERROR) " : "";
    const extra = response ? ` status=${response.status()} '${response.rawData()}'` : "";
    const logger = isError ? errorLogger : successLogger;
    logger(`${direction} ${errorLabel}${httpCall}${extra}`);
  }
  return response || request;
};
const LogMiddleware = () => ({
  async prepareRequest(next) {
    const request = await next();
    log(request);
    return request;
  },
  async response(next) {
    try {
      const response = await next();
      log(response.request(), response);
      return response;
    } catch (err) {
      if (err instanceof import_response.Response) {
        log(err.request(), err);
      }
      throw err;
    }
  }
});
var log_default = LogMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LogMiddleware,
  defaultErrorLogger,
  defaultSuccessLogger,
  setErrorLogger,
  setLoggerEnabled,
  setSuccessLogger
});
//# sourceMappingURL=log.js.map