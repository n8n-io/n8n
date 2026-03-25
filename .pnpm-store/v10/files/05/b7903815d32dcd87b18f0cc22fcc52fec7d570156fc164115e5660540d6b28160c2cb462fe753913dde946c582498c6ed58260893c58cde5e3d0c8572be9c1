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
var mock_resource_exports = {};
__export(mock_resource_exports, {
  default: () => mock_resource_default
});
module.exports = __toCommonJS(mock_resource_exports);
var import_mappersmith = require("../mappersmith");
var import_mock_request = __toESM(require("./mock-request"));
var import_request = __toESM(require("../request"));
const VALUE_NOT_MATCHED = "<MAPPERSMITH_VALUE_NOT_MATCHED>";
function MockResource(id, client) {
  if (!client || !client._manifest) {
    throw new Error('[Mappersmith Test] "mockClient" received an invalid client');
  }
  this.id = id;
  this.manifest = client._manifest;
  this.resourceName = null;
  this.methodName = null;
  this.requestParams = {};
  this.responseData = null;
  this.responseHandler = null;
  this.responseHeaders = {};
  this.responseStatus = 200;
  this.responseStatusHandler = null;
  this.mockRequest = null;
  this.asyncFinalRequest = null;
  this.pendingMiddlewareExecution = true;
}
MockResource.prototype = {
  /**
   * @return {MockResource}
   */
  resource(resourceName) {
    this.resourceName = resourceName;
    return this;
  },
  /**
   * @return {MockResource}
   */
  method(methodName) {
    this.methodName = methodName;
    return this;
  },
  /**
   * @return {MockResource}
   */
  with(requestParams) {
    this.requestParams = requestParams;
    return this;
  },
  /**
   * @return {MockResource}
   */
  headers(responseHeaders) {
    this.responseHeaders = responseHeaders;
    return this;
  },
  /**
   * @return {MockResource}
   */
  status(responder) {
    if (typeof responder === "function") {
      this.responseStatusHandler = responder;
    } else {
      this.responseStatus = responder;
    }
    return this;
  },
  /**
   * @return {MockResource}
   */
  response(responder) {
    if (typeof responder === "function") {
      this.responseHandler = responder;
    } else {
      this.responseData = responder;
    }
    return this;
  },
  /**
   * @return {Promise<MockAssert>}
   */
  assertObjectAsync() {
    return this.createAsyncRequest().then((finalRequest) => {
      this.asyncFinalRequest = finalRequest;
      this.pendingMiddlewareExecution = false;
      return this.toMockRequest().assertObject();
    });
  },
  /**
   * @return {MockAssert}
   */
  assertObject() {
    return this.toMockRequest().assertObject();
  },
  /**
   * @return {MockRequest}
   */
  toMockRequest() {
    const finalRequest = this.asyncFinalRequest ? this.asyncFinalRequest : this.createRequest();
    const responseStatus = this.responseStatusHandler || this.responseStatus;
    if (!this.mockRequest) {
      this.mockRequest = new import_mock_request.default(this.id, {
        method: finalRequest.method(),
        url: this.generateUrlMatcher(finalRequest),
        body: finalRequest.body(),
        headers: finalRequest.headers(),
        response: {
          status: responseStatus,
          headers: this.responseHeaders,
          body: this.responseData,
          handler: this.responseHandler
        }
      });
    }
    return this.mockRequest;
  },
  /**
   * @private
   */
  generateUrlMatcher(finalRequest) {
    const params = finalRequest.params();
    const hasParamMatchers = Object.keys(params).find((key) => typeof params[key] === "function");
    if (!hasParamMatchers) {
      return finalRequest.url();
    }
    const urlMatcher = (requestUrl, requestParams) => {
      const additionalParams = this.evaluateParamMatchers(params, requestParams);
      const testRequest = finalRequest.enhance({ params: additionalParams });
      return testRequest.url() === requestUrl;
    };
    return urlMatcher;
  },
  /**
   * @private
   */
  executeMiddlewareStack() {
    return this.createAsyncRequest().then((finalRequest) => {
      this.asyncFinalRequest = finalRequest;
      if (this.mockRequest) {
        const urlMatcher = this.generateUrlMatcher(finalRequest);
        this.mockRequest.url = urlMatcher;
        this.mockRequest.body = finalRequest.body();
        this.pendingMiddlewareExecution = false;
      }
    });
  },
  /**
   * @private
   */
  evaluateParamMatchers(mockParams, requestParams) {
    return Object.keys(mockParams).reduce((obj, key) => {
      const matcher = mockParams[key];
      if (typeof matcher !== "function") {
        return obj;
      }
      const value = requestParams[key];
      if (key in requestParams && matcher(value)) {
        obj[key] = value;
      } else {
        obj[key] = VALUE_NOT_MATCHED;
      }
      return obj;
    }, {});
  },
  /**
   * @private
   * It never runs the middleware stack
   */
  createRequest() {
    const methodDescriptor = this.manifest.createMethodDescriptor(
      this.resourceName,
      this.methodName
    );
    return new import_request.default(methodDescriptor, this.requestParams);
  },
  /**
   * @private
   * Always runs the middleware stack
   */
  createAsyncRequest() {
    const methodDescriptor = this.manifest.createMethodDescriptor(
      this.resourceName,
      this.methodName
    );
    const initialRequest = new import_request.default(methodDescriptor, this.requestParams);
    const middleware = this.manifest.createMiddleware({
      resourceName: this.resourceName,
      resourceMethod: this.methodName,
      mockRequest: true
    });
    const abort = (error) => {
      throw error;
    };
    const getInitialRequest = () => import_mappersmith.configs.Promise.resolve(initialRequest);
    const prepareRequest = middleware.reduce(
      (next, middleware2) => () => import_mappersmith.configs.Promise.resolve().then(() => middleware2.prepareRequest(next, abort)),
      getInitialRequest
    );
    return prepareRequest();
  }
};
var mock_resource_default = MockResource;
//# sourceMappingURL=mock-resource.js.map