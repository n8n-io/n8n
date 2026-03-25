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
var fetch_exports = {};
__export(fetch_exports, {
  Fetch: () => Fetch,
  default: () => fetch_default
});
module.exports = __toCommonJS(fetch_exports);
var import_gateway = require("./gateway");
var import_response = __toESM(require("../response"));
var import_mappersmith = require("../mappersmith");
var import_utils = require("../utils/index");
var import_timeout_error = require("./timeout-error");
class Fetch extends import_gateway.Gateway {
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
    const fetch = import_mappersmith.configs.fetch;
    if (!fetch) {
      throw new Error(
        `[Mappersmith] global fetch does not exist, please assign "configs.fetch" to a valid implementation`
      );
    }
    const customHeaders = {};
    const body = this.prepareBody(requestMethod, customHeaders);
    const auth = this.request.auth();
    if (auth) {
      const username = auth.username || "";
      const password = auth.password || "";
      customHeaders["authorization"] = `Basic ${(0, import_utils.btoa)(`${username}:${password}`)}`;
    }
    const headers = (0, import_utils.assign)(customHeaders, this.request.headers());
    const method = this.shouldEmulateHTTP() ? "post" : requestMethod;
    const signal = this.request.signal();
    const init = (0, import_utils.assign)({ method, headers, body, signal }, this.options().Fetch);
    const timeout = this.request.timeout();
    let timer = null;
    let canceled = false;
    if (timeout) {
      timer = setTimeout(() => {
        canceled = true;
        const error = (0, import_timeout_error.createTimeoutError)(`Timeout (${timeout}ms)`);
        this.dispatchClientError(error.message, error);
      }, timeout);
    }
    fetch(this.request.url(), init).then((fetchResponse) => {
      if (canceled) {
        return;
      }
      timer && clearTimeout(timer);
      let responseData;
      if (this.request.isBinary()) {
        if (typeof fetchResponse.buffer === "function") {
          responseData = fetchResponse.buffer();
        } else {
          responseData = fetchResponse.arrayBuffer();
        }
      } else {
        responseData = fetchResponse.text();
      }
      responseData.then((data) => {
        this.dispatchResponse(this.createResponse(fetchResponse, data));
      });
    }).catch((error) => {
      if (canceled) {
        return;
      }
      timer && clearTimeout(timer);
      this.dispatchClientError(error.message, error);
    });
  }
  createResponse(fetchResponse, data) {
    const status = fetchResponse.status;
    const responseHeaders = {};
    fetchResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    return new import_response.default(this.request, status, data, responseHeaders);
  }
}
var fetch_default = Fetch;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Fetch
});
//# sourceMappingURL=fetch.js.map