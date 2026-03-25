"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var xhr_exports = {};
__export(xhr_exports, {
  XHR: () => XHR,
  default: () => xhr_default
});
module.exports = __toCommonJS(xhr_exports);
var import_gateway = require("./gateway");
var import_response = __toESM(require("../response"));
var import_utils = require("../utils/index");
var import_timeout_error = require("./timeout-error");
let toBase64;
try {
  toBase64 = window.btoa;
} catch {
  toBase64 = import_utils.btoa;
}
class XHR extends import_gateway.Gateway {
  canceled = false;
  timer;
  get() {
    const xmlHttpRequest = this.createXHR();
    xmlHttpRequest.open("GET", this.request.url(), true);
    this.setHeaders(xmlHttpRequest, {});
    this.configureTimeout(xmlHttpRequest);
    this.configureBinary(xmlHttpRequest);
    this.configureAbort(xmlHttpRequest);
    xmlHttpRequest.send();
  }
  head() {
    const xmlHttpRequest = this.createXHR();
    xmlHttpRequest.open("HEAD", this.request.url(), true);
    this.setHeaders(xmlHttpRequest, {});
    this.configureTimeout(xmlHttpRequest);
    this.configureBinary(xmlHttpRequest);
    this.configureAbort(xmlHttpRequest);
    xmlHttpRequest.send();
  }
  post() {
    this.performRequest("post");
  }
  put() {
    this.performRequest("put");
  }
  patch() {
    this.performRequest("patch");
  }
  delete() {
    this.performRequest("delete");
  }
  configureBinary(xmlHttpRequest) {
    if (this.request.isBinary()) {
      xmlHttpRequest.responseType = "blob";
    }
  }
  configureTimeout(xmlHttpRequest) {
    this.canceled = false;
    this.timer = void 0;
    const timeout = this.request.timeout();
    if (timeout) {
      xmlHttpRequest.timeout = timeout;
      xmlHttpRequest.addEventListener("timeout", () => {
        this.canceled = true;
        this.timer && clearTimeout(this.timer);
        const error = (0, import_timeout_error.createTimeoutError)(`Timeout (${timeout}ms)`);
        this.dispatchClientError(error.message, error);
      });
      this.timer = setTimeout(() => {
        this.canceled = true;
        const error = (0, import_timeout_error.createTimeoutError)(`Timeout (${timeout}ms)`);
        this.dispatchClientError(error.message, error);
      }, timeout + 1);
    }
  }
  configureAbort(xmlHttpRequest) {
    const signal = this.request.signal();
    if (signal) {
      signal.addEventListener("abort", () => {
        xmlHttpRequest.abort();
      });
      xmlHttpRequest.addEventListener("abort", () => {
        this.dispatchClientError(
          "The operation was aborted",
          new Error("The operation was aborted")
        );
      });
    }
  }
  configureCallbacks(xmlHttpRequest) {
    xmlHttpRequest.addEventListener("load", () => {
      if (this.canceled) {
        return;
      }
      this.timer && clearTimeout(this.timer);
      this.dispatchResponse(this.createResponse(xmlHttpRequest));
    });
    xmlHttpRequest.addEventListener("error", (e) => {
      if (this.canceled) {
        return;
      }
      this.timer && clearTimeout(this.timer);
      const guessedErrorCause = e ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e.message || e.name
      ) : xmlHttpRequest.responseText;
      const errorMessage = "Network error";
      const enhancedMessage = guessedErrorCause ? `: ${guessedErrorCause}` : "";
      const error = new Error(`${errorMessage}${enhancedMessage}`);
      this.dispatchClientError(errorMessage, error);
    });
    const xhrOptions = this.options().XHR;
    if (xhrOptions.withCredentials) {
      xmlHttpRequest.withCredentials = true;
    }
    if (xhrOptions.configure) {
      xhrOptions.configure(xmlHttpRequest);
    }
  }
  performRequest(method) {
    const requestMethod = this.shouldEmulateHTTP() ? "post" : method;
    const xmlHttpRequest = this.createXHR();
    xmlHttpRequest.open(requestMethod.toUpperCase(), this.request.url(), true);
    const customHeaders = {};
    const body = this.prepareBody(method, customHeaders);
    this.setHeaders(xmlHttpRequest, customHeaders);
    this.configureTimeout(xmlHttpRequest);
    this.configureBinary(xmlHttpRequest);
    this.configureAbort(xmlHttpRequest);
    xmlHttpRequest.send(body);
  }
  createResponse(xmlHttpRequest) {
    const status = xmlHttpRequest.status;
    const data = this.request.isBinary() ? xmlHttpRequest.response : xmlHttpRequest.responseText;
    const responseHeaders = (0, import_utils.parseResponseHeaders)(xmlHttpRequest.getAllResponseHeaders());
    return new import_response.default(this.request, status, data, responseHeaders);
  }
  setHeaders(xmlHttpRequest, customHeaders) {
    const auth = this.request.auth();
    const headers = (0, import_utils.assign)(customHeaders, {
      ...this.request.headers(),
      ...auth ? { authorization: `Basic ${toBase64(`${auth.username}:${auth.password}`)}` } : {}
    });
    Object.keys(headers).forEach((headerName) => {
      xmlHttpRequest.setRequestHeader(headerName, `${headers[headerName]}`);
    });
  }
  createXHR() {
    const xmlHttpRequest = new XMLHttpRequest();
    this.configureCallbacks(xmlHttpRequest);
    return xmlHttpRequest;
  }
}
var xhr_default = XHR;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  XHR
});
//# sourceMappingURL=xhr.js.map