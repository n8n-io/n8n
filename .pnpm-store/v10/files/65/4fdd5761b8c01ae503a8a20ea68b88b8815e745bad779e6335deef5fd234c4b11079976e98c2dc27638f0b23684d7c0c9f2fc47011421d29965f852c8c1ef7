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
var sanitizer_exports = {};
__export(sanitizer_exports, {
  Sanitizer: () => Sanitizer
});
module.exports = __toCommonJS(sanitizer_exports);
var import_object = require("./object.js");
const RedactedString = "REDACTED";
const defaultAllowedHeaderNames = [
  "x-ms-client-request-id",
  "x-ms-return-client-request-id",
  "x-ms-useragent",
  "x-ms-correlation-request-id",
  "x-ms-request-id",
  "client-request-id",
  "ms-cv",
  "return-client-request-id",
  "traceparent",
  "Access-Control-Allow-Credentials",
  "Access-Control-Allow-Headers",
  "Access-Control-Allow-Methods",
  "Access-Control-Allow-Origin",
  "Access-Control-Expose-Headers",
  "Access-Control-Max-Age",
  "Access-Control-Request-Headers",
  "Access-Control-Request-Method",
  "Origin",
  "Accept",
  "Accept-Encoding",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Date",
  "ETag",
  "Expires",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Unmodified-Since",
  "Last-Modified",
  "Pragma",
  "Request-Id",
  "Retry-After",
  "Server",
  "Transfer-Encoding",
  "User-Agent",
  "WWW-Authenticate"
];
const defaultAllowedQueryParameters = ["api-version"];
class Sanitizer {
  allowedHeaderNames;
  allowedQueryParameters;
  constructor({
    additionalAllowedHeaderNames: allowedHeaderNames = [],
    additionalAllowedQueryParameters: allowedQueryParameters = []
  } = {}) {
    allowedHeaderNames = defaultAllowedHeaderNames.concat(allowedHeaderNames);
    allowedQueryParameters = defaultAllowedQueryParameters.concat(allowedQueryParameters);
    this.allowedHeaderNames = new Set(allowedHeaderNames.map((n) => n.toLowerCase()));
    this.allowedQueryParameters = new Set(allowedQueryParameters.map((p) => p.toLowerCase()));
  }
  /**
   * Sanitizes an object for logging.
   * @param obj - The object to sanitize
   * @returns - The sanitized object as a string
   */
  sanitize(obj) {
    const seen = /* @__PURE__ */ new Set();
    return JSON.stringify(
      obj,
      (key, value) => {
        if (value instanceof Error) {
          return {
            ...value,
            name: value.name,
            message: value.message
          };
        }
        if (key === "headers") {
          return this.sanitizeHeaders(value);
        } else if (key === "url") {
          return this.sanitizeUrl(value);
        } else if (key === "query") {
          return this.sanitizeQuery(value);
        } else if (key === "body") {
          return void 0;
        } else if (key === "response") {
          return void 0;
        } else if (key === "operationSpec") {
          return void 0;
        } else if (Array.isArray(value) || (0, import_object.isObject)(value)) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      },
      2
    );
  }
  /**
   * Sanitizes a URL for logging.
   * @param value - The URL to sanitize
   * @returns - The sanitized URL as a string
   */
  sanitizeUrl(value) {
    if (typeof value !== "string" || value === null || value === "") {
      return value;
    }
    const url = new URL(value);
    if (!url.search) {
      return value;
    }
    for (const [key] of url.searchParams) {
      if (!this.allowedQueryParameters.has(key.toLowerCase())) {
        url.searchParams.set(key, RedactedString);
      }
    }
    return url.toString();
  }
  sanitizeHeaders(obj) {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      if (this.allowedHeaderNames.has(key.toLowerCase())) {
        sanitized[key] = obj[key];
      } else {
        sanitized[key] = RedactedString;
      }
    }
    return sanitized;
  }
  sanitizeQuery(value) {
    if (typeof value !== "object" || value === null) {
      return value;
    }
    const sanitized = {};
    for (const k of Object.keys(value)) {
      if (this.allowedQueryParameters.has(k.toLowerCase())) {
        sanitized[k] = value[k];
      } else {
        sanitized[k] = RedactedString;
      }
    }
    return sanitized;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Sanitizer
});
