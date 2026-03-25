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
var mock_request_exports = {};
__export(mock_request_exports, {
  default: () => mock_request_default
});
module.exports = __toCommonJS(mock_request_exports);
var import_mock_assert = __toESM(require("./mock-assert"));
var import_response = __toESM(require("../response"));
var import_utils = require("../utils/index");
var import_clone = require("../utils/clone");
var import_mock_utils = require("./mock-utils");
function MockRequest(id, props) {
  this.id = id;
  this.method = props.method || "get";
  this.urlFunction = typeof props.url === "function";
  this.url = props.url;
  this.bodyFunction = typeof props.body === "function";
  this.body = this.bodyFunction ? props.body : (0, import_mock_utils.toSortedQueryString)(props.body);
  this.headersFunction = typeof props.headers === "function";
  this.headers = props.headersFunction ? props.headers : (0, import_mock_utils.toSortedQueryString)(props.headers);
  this.headersObject = props.headers;
  this.responseHeaders = props.response.headers || {};
  this.setResponseData(props.response.body);
  this.responseHandler = props.response.handler;
  this.statusFunction = typeof props.response.status === "function";
  this.responseStatus = props.response.status || 200;
  this.calls = [];
}
MockRequest.prototype = {
  /**
   * If passed a plain object, the data is stringified and the content-type header is set to JSON
   *
   * @public
   */
  setResponseData(responseData) {
    if ((0, import_utils.isPlainObject)(responseData)) {
      this.responseData = JSON.stringify(responseData);
      if (!this.responseHeaders["content-type"]) {
        this.responseHeaders["content-type"] = "application/json";
      }
    } else {
      this.responseData = responseData;
    }
  },
  /**
   * @return {Response}
   */
  call(request) {
    const assertObject = this.assertObject();
    if (this.responseHandler) {
      this.setResponseData(this.responseHandler(request, assertObject));
    }
    const status = this.statusFunction ? this.responseStatus(request, assertObject) : this.responseStatus;
    this.calls.push(request);
    const responseData = (0, import_clone.clone)(this.responseData);
    const responseHeaders = (0, import_clone.clone)(this.responseHeaders);
    return new import_response.default(request, status, responseData, responseHeaders);
  },
  /**
   * @return {MockAssert}
   */
  assertObject() {
    return new import_mock_assert.default(this.calls);
  },
  /**
   * Checks if the request matches with the mock HTTP method, URL, headers and body
   *
   * @return {boolean}
   */
  isExactMatch(request) {
    const bodyMatch = () => {
      if (this.body === void 0) {
        return true;
      }
      return this.bodyFunction ? this.body(request.body()) : this.body === (0, import_mock_utils.toSortedQueryString)(request.body());
    };
    const urlMatch = this.urlFunction ? this.url(request.url(), request.params()) : (0, import_mock_utils.sortedUrl)(this.url) === (0, import_mock_utils.sortedUrl)(request.url());
    const headerMatch = !this.headers || (this.headersFunction ? this.headers(request.headers()) : (0, import_mock_utils.isSubset)(this.headersObject, request.headers()));
    return this.method === request.method() && urlMatch && bodyMatch() && headerMatch;
  },
  /**
   * Checks if the request partially matches the mock HTTP method and URL
   *
   * @return {boolean}
   */
  isPartialMatch(request) {
    return new RegExp(this.method).test(request.method()) && new RegExp(this.url).test(request.url());
  },
  /**
   * @return {MockRequest}
   */
  toMockRequest() {
    return this;
  }
};
var mock_request_default = MockRequest;
//# sourceMappingURL=mock-request.js.map