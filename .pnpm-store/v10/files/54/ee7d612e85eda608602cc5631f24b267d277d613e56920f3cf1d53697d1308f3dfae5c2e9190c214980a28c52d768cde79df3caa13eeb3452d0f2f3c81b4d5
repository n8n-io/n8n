// src/mocks/mock-request.js
import MockAssert from "./mock-assert.mjs";
import Response from "../response.mjs";
import { isPlainObject } from "../utils/index.mjs";
import { clone } from "../utils/clone.mjs";
import { sortedUrl, toSortedQueryString, isSubset } from "./mock-utils.mjs";
function MockRequest(id, props) {
  this.id = id;
  this.method = props.method || "get";
  this.urlFunction = typeof props.url === "function";
  this.url = props.url;
  this.bodyFunction = typeof props.body === "function";
  this.body = this.bodyFunction ? props.body : toSortedQueryString(props.body);
  this.headersFunction = typeof props.headers === "function";
  this.headers = props.headersFunction ? props.headers : toSortedQueryString(props.headers);
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
    if (isPlainObject(responseData)) {
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
    const responseData = clone(this.responseData);
    const responseHeaders = clone(this.responseHeaders);
    return new Response(request, status, responseData, responseHeaders);
  },
  /**
   * @return {MockAssert}
   */
  assertObject() {
    return new MockAssert(this.calls);
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
      return this.bodyFunction ? this.body(request.body()) : this.body === toSortedQueryString(request.body());
    };
    const urlMatch = this.urlFunction ? this.url(request.url(), request.params()) : sortedUrl(this.url) === sortedUrl(request.url());
    const headerMatch = !this.headers || (this.headersFunction ? this.headers(request.headers()) : isSubset(this.headersObject, request.headers()));
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
export {
  mock_request_default as default
};
//# sourceMappingURL=mock-request.mjs.map