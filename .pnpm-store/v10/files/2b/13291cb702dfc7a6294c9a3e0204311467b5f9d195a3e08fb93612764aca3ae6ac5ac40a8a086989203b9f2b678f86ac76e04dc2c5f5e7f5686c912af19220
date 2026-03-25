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
var response_exports = {};
__export(response_exports, {
  REGEXP_CONTENT_TYPE_JSON: () => REGEXP_CONTENT_TYPE_JSON,
  Response: () => Response,
  default: () => response_default
});
module.exports = __toCommonJS(response_exports);
var import_utils = require("./utils/index");
const REGEXP_CONTENT_TYPE_JSON = /^application\/(json|.*\+json)/;
class Response {
  originalRequest;
  responseStatus;
  responseData;
  responseHeaders;
  // eslint-disable-next-line no-use-before-define
  errors;
  timeElapsed;
  constructor(originalRequest, responseStatus, responseData, responseHeaders, errors) {
    const auth = originalRequest.requestParams && originalRequest.requestParams.auth;
    if (auth) {
      const maskedAuth = { ...auth, password: "***" };
      this.originalRequest = originalRequest.enhance({ auth: maskedAuth });
    } else {
      this.originalRequest = originalRequest;
    }
    this.responseStatus = responseStatus;
    this.responseData = responseData ?? null;
    this.responseHeaders = responseHeaders || {};
    this.errors = errors || [];
    this.timeElapsed = null;
  }
  request() {
    return this.originalRequest;
  }
  status() {
    if (this.responseStatus === 1223) {
      return 204;
    }
    return this.responseStatus;
  }
  /**
   * Returns true if status is greater or equal 200 or lower than 400
   */
  success() {
    const status = this.status();
    return status >= 200 && status < 400;
  }
  /**
   * Returns an object with the headers. Header names are converted to
   * lowercase
   */
  headers() {
    return (0, import_utils.lowerCaseObjectKeys)(this.responseHeaders);
  }
  /**
   * Utility method to get a header value by name
   */
  header(name) {
    const key = name.toLowerCase();
    if (key in this.headers()) {
      return this.headers()[key];
    }
    return void 0;
  }
  /**
   * Returns the original response data
   */
  rawData() {
    return this.responseData;
  }
  /**
   * Returns the response data, if "Content-Type" is "application/json"
   * it parses the response and returns an object.
   * Friendly reminder:
   *  - JSON.parse() can return null, an Array or an object.
   */
  data() {
    if (this.isContentTypeJSON() && this.responseData !== null) {
      try {
        return JSON.parse(this.responseData);
      } catch (e) {
      }
    }
    return this.responseData;
  }
  isContentTypeJSON() {
    const contentType = this.header("content-type");
    if (contentType === void 0) {
      return false;
    }
    return REGEXP_CONTENT_TYPE_JSON.test(contentType);
  }
  /**
   * Returns the last error instance that caused the request to fail
   */
  error() {
    const lastError = this.errors[this.errors.length - 1] || null;
    if (typeof lastError === "string") {
      return new Error(lastError);
    }
    return lastError;
  }
  /**
   * Enhances current Response returning a new Response
   *
   * @param {Object} extras
   *   @param {Integer} extras.status - it will replace the current status
   *   @param {String} extras.rawData - it will replace the current rawData
   *   @param {Object} extras.headers - it will be merged with current headers
   *   @param {Error} extras.error    - it will be added to the list of errors
   */
  enhance(extras) {
    const mergedHeaders = { ...this.headers(), ...extras.headers || {} };
    const enhancedResponse = new Response(
      this.request(),
      extras.status || this.status(),
      extras.rawData || this.rawData(),
      mergedHeaders,
      extras.error ? [...this.errors, extras.error] : [...this.errors]
    );
    enhancedResponse.timeElapsed = this.timeElapsed;
    return enhancedResponse;
  }
}
var response_default = Response;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  REGEXP_CONTENT_TYPE_JSON,
  Response
});
//# sourceMappingURL=response.js.map