// src/gateway/gateway.ts
import { performanceNow, toQueryString, isPlainObject } from "../utils/index.mjs";
import { configs as defaultConfigs } from "../mappersmith.mjs";
import { Response } from "../response.mjs";
import { isTimeoutError } from "./timeout-error.mjs";
var REGEXP_EMULATE_HTTP = /^(delete|put|patch)/i;
var Gateway = class {
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
    const timeStart = performanceNow();
    if (!defaultConfigs.Promise) {
      throw new Error("[Mappersmith] Promise not configured (configs.Promise)");
    }
    return new defaultConfigs.Promise((resolve, reject) => {
      this.successCallback = (response) => {
        response.timeElapsed = performanceNow() - timeStart;
        resolve(response);
      };
      this.failCallback = (response) => {
        response.timeElapsed = performanceNow() - timeStart;
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
    if (isTimeoutError(error) && this.options().enableHTTP408OnTimeouts) {
      this.failCallback(new Response(this.request, 408, message, {}, [error]));
    } else {
      this.failCallback(new Response(this.request, 400, message, {}, [error]));
    }
  }
  prepareBody(method, headers) {
    let body = this.request.body();
    if (this.shouldEmulateHTTP()) {
      body = body || {};
      isPlainObject(body) && (body["_method"] = method);
      headers["x-http-method-override"] = method;
    }
    const bodyString = toQueryString(body);
    if (bodyString) {
      if (isPlainObject(body)) {
        headers["content-type"] = "application/x-www-form-urlencoded;charset=utf-8";
      }
    }
    return bodyString;
  }
};
var gateway_default = Gateway;
export {
  Gateway,
  gateway_default as default
};
//# sourceMappingURL=gateway.mjs.map