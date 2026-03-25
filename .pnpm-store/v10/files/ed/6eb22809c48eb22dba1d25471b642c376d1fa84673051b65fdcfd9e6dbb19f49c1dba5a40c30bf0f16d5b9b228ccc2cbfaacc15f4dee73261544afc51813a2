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
var protocolError_exports = {};
__export(protocolError_exports, {
  ProtocolError: () => ProtocolError,
  isProtocolError: () => isProtocolError,
  isSessionClosedError: () => isSessionClosedError
});
module.exports = __toCommonJS(protocolError_exports);
var import_stackTrace = require("../utils/isomorphic/stackTrace");
class ProtocolError extends Error {
  constructor(type, method, logs) {
    super();
    this.type = type;
    this.method = method;
    this.logs = logs;
  }
  setMessage(message) {
    (0, import_stackTrace.rewriteErrorMessage)(this, `Protocol error (${this.method}): ${message}`);
  }
  browserLogMessage() {
    return this.logs ? "\nBrowser logs:\n" + this.logs : "";
  }
}
function isProtocolError(e) {
  return e instanceof ProtocolError;
}
function isSessionClosedError(e) {
  return e instanceof ProtocolError && (e.type === "closed" || e.type === "crashed");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProtocolError,
  isProtocolError,
  isSessionClosedError
});
