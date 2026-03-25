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
var http_exports = {};
__export(http_exports, {
  HTTP: () => HTTP,
  default: () => http_default
});
module.exports = __toCommonJS(http_exports);
var import_url = __toESM(require("url"));
var import_http = __toESM(require("http"));
var import_https = __toESM(require("https"));
var import_utils = require("../utils/index");
var import_gateway = require("./gateway");
var import_response = __toESM(require("../response"));
var import_timeout_error = require("./timeout-error");
class HTTP extends import_gateway.Gateway {
  canceled = false;
  get() {
    this.performRequest("get");
  }
  head() {
    this.performRequest("head");
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
  performRequest(requestMethod) {
    const headers = {};
    const defaults = import_url.default.parse(this.request.url());
    const method = this.shouldEmulateHTTP() ? "post" : requestMethod;
    const body = this.prepareBody(requestMethod, headers);
    const timeout = this.request.timeout();
    const signal = this.request.signal();
    this.canceled = false;
    if (body && typeof body !== "boolean" && typeof body !== "number" && typeof body.length === "number") {
      headers["content-length"] = Buffer.byteLength(body);
    }
    const handler = defaults.protocol === "https:" ? import_https.default : import_http.default;
    const requestParams = (0, import_utils.assign)(defaults, {
      method,
      headers: (0, import_utils.assign)(headers, this.request.headers())
    });
    const auth = this.request.auth();
    if (auth) {
      const username = auth.username || "";
      const password = auth.password || "";
      requestParams["auth"] = `${username}:${password}`;
    }
    const httpOptions = this.options().HTTP;
    if (httpOptions.useSocketConnectionTimeout) {
      requestParams["timeout"] = timeout;
    }
    if (httpOptions.configure) {
      (0, import_utils.assign)(requestParams, httpOptions.configure(requestParams));
    }
    if (httpOptions.onRequestWillStart) {
      httpOptions.onRequestWillStart(requestParams);
    }
    if (signal) {
      requestParams.signal = signal;
    }
    const httpRequest = handler.request(
      requestParams,
      (httpResponse) => this.onResponse(httpResponse, httpOptions, requestParams)
    );
    httpRequest.on("socket", (socket) => {
      if (httpOptions.onRequestSocketAssigned) {
        httpOptions.onRequestSocketAssigned(requestParams);
      }
      if (httpRequest.reusedSocket) {
        return;
      }
      if (httpOptions.onSocketLookup) {
        socket.on("lookup", () => {
          var _a;
          (_a = httpOptions.onSocketLookup) == null ? void 0 : _a.call(httpOptions, requestParams);
        });
      }
      if (httpOptions.onSocketConnect) {
        socket.on("connect", () => {
          var _a;
          (_a = httpOptions.onSocketConnect) == null ? void 0 : _a.call(httpOptions, requestParams);
        });
      }
      if (httpOptions.onSocketSecureConnect) {
        socket.on("secureConnect", () => {
          var _a;
          (_a = httpOptions.onSocketSecureConnect) == null ? void 0 : _a.call(httpOptions, requestParams);
        });
      }
    });
    httpRequest.on("error", (e) => this.onError(e));
    body && httpRequest.write(body);
    if (timeout) {
      if (!httpOptions.useSocketConnectionTimeout) {
        httpRequest.setTimeout(timeout);
      }
      httpRequest.on("timeout", () => {
        this.canceled = true;
        httpRequest.abort();
        const error = (0, import_timeout_error.createTimeoutError)(`Timeout (${timeout}ms)`);
        this.dispatchClientError(error.message, error);
      });
    }
    httpRequest.end();
  }
  onResponse(httpResponse, httpOptions, requestParams) {
    const rawData = [];
    if (!this.request.isBinary()) {
      httpResponse.setEncoding("utf8");
    }
    httpResponse.once("readable", () => {
      if (httpOptions.onResponseReadable) {
        httpOptions.onResponseReadable(requestParams);
      }
    });
    httpResponse.on("data", (chunk) => rawData.push(chunk)).on("end", () => {
      if (this.canceled) {
        return;
      }
      this.dispatchResponse(this.createResponse(httpResponse, rawData));
    });
    httpResponse.on("end", () => {
      if (httpOptions.onResponseEnd) {
        httpOptions.onResponseEnd(requestParams);
      }
    });
  }
  onError(e) {
    if (this.canceled) {
      return;
    }
    this.dispatchClientError(e.message, e);
  }
  createResponse(httpResponse, rawData) {
    const responseData = this.request.isBinary() ? Buffer.concat(rawData) : rawData.join("");
    return new import_response.default(
      this.request,
      httpResponse.statusCode,
      responseData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      httpResponse.headers
    );
  }
}
var http_default = HTTP;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HTTP
});
//# sourceMappingURL=http.js.map