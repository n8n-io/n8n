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
var gateway_exports = {};
__export(gateway_exports, {
  Gateway: () => Gateway,
  default: () => gateway_default
});
module.exports = __toCommonJS(gateway_exports);
var import_utils = require("../utils/index");
var import_mappersmith = require("../mappersmith");
var import_response = require("../response");
var import_timeout_error = require("./timeout-error");
const REGEXP_EMULATE_HTTP = /^(delete|put|patch)/i;
class Gateway {
  request;
  configs;
  successCallback;
  failCallback;
  constructor(request, configs) {
    this.request = request;
    this.configs = configs;
    this.successCallback = function() {
      return void 0;
    };
    this.failCallback = function() {
      return void 0;
    };
  }
  get() {
    throw new Error("Not implemented");
  }
  head() {
    throw new Error("Not implemented");
  }
  post() {
    throw new Error("Not implemented");
  }
  put() {
    throw new Error("Not implemented");
  }
  patch() {
    throw new Error("Not implemented");
  }
  delete() {
    throw new Error("Not implemented");
  }
  options() {
    return this.configs;
  }
  shouldEmulateHTTP() {
    return this.options().emulateHTTP && REGEXP_EMULATE_HTTP.test(this.request.method());
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call() {
    const timeStart = (0, import_utils.performanceNow)();
    if (!import_mappersmith.configs.Promise) {
      throw new Error("[Mappersmith] Promise not configured (configs.Promise)");
    }
    return new import_mappersmith.configs.Promise((resolve, reject) => {
      this.successCallback = (response) => {
        response.timeElapsed = (0, import_utils.performanceNow)() - timeStart;
        resolve(response);
      };
      this.failCallback = (response) => {
        response.timeElapsed = (0, import_utils.performanceNow)() - timeStart;
        reject(response);
      };
      try {
        this[this.request.method()].apply(this, arguments);
      } catch (e) {
        const err = e;
        this.dispatchClientError(err.message, err);
      }
    });
  }
  dispatchResponse(response) {
    response.success() ? this.successCallback(response) : this.failCallback(response);
  }
  dispatchClientError(message, error) {
    if ((0, import_timeout_error.isTimeoutError)(error) && this.options().enableHTTP408OnTimeouts) {
      this.failCallback(new import_response.Response(this.request, 408, message, {}, [error]));
    } else {
      this.failCallback(new import_response.Response(this.request, 400, message, {}, [error]));
    }
  }
  prepareBody(method, headers) {
    let body = this.request.body();
    if (this.shouldEmulateHTTP()) {
      body = body || {};
      (0, import_utils.isPlainObject)(body) && (body["_method"] = method);
      headers["x-http-method-override"] = method;
    }
    const bodyString = (0, import_utils.toQueryString)(body);
    if (bodyString) {
      if ((0, import_utils.isPlainObject)(body)) {
        headers["content-type"] = "application/x-www-form-urlencoded;charset=utf-8";
      }
    }
    return bodyString;
  }
}
var gateway_default = Gateway;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Gateway
});
//# sourceMappingURL=gateway.js.map