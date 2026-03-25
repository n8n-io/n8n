// src/request.ts
import { toQueryString, lowerCaseObjectKeys, assign } from "./utils/index.mjs";
var REGEXP_DYNAMIC_SEGMENT = /{([^}?]+)\??}/;
var REGEXP_OPTIONAL_DYNAMIC_SEGMENT = /\/?{([^}?]+)\?}/g;
var REGEXP_TRAILING_SLASH = /\/$/;
var Request = class _Request {
  methodDescriptor;
  requestParams;
  requestContext;
  constructor(methodDescriptor, requestParams = {}, requestContext = {}) {
    this.methodDescriptor = methodDescriptor;
    this.requestParams = requestParams;
    this.requestContext = requestContext;
  }
  isParam(key) {
    return key !== this.methodDescriptor.headersAttr && key !== this.methodDescriptor.bodyAttr && key !== this.methodDescriptor.authAttr && key !== this.methodDescriptor.timeoutAttr && key !== this.methodDescriptor.hostAttr && key !== this.methodDescriptor.signalAttr && key !== this.methodDescriptor.pathAttr;
  }
  params() {
    const params = assign({}, this.methodDescriptor.params, this.requestParams);
    return Object.keys(params).reduce((obj, key) => {
      if (this.isParam(key)) {
        obj[key] = params[key];
      }
      return obj;
    }, {});
  }
  /**
   * Returns the request context; a key value object.
   * Useful to pass information from upstream middleware to a downstream one.
   */
  context() {
    return this.requestContext;
  }
  /**
   * Returns the HTTP method in lowercase
   */
  method() {
    return this.methodDescriptor.method.toLowerCase();
  }
  /**
   * Returns host name without trailing slash
   * Example: 'http://example.org'
   */
  host() {
    const { allowResourceHostOverride, hostAttr, host } = this.methodDescriptor;
    const originalHost = allowResourceHostOverride ? this.requestParams[hostAttr] || host || "" : host || "";
    if (typeof originalHost === "string") {
      return originalHost.replace(REGEXP_TRAILING_SLASH, "");
    }
    return "";
  }
  /**
   * Returns path with parameters and leading slash.
   * Example: '/some/path?param1=true'
   *
   * @throws {Error} if any dynamic segment is missing.
   * Example:
   *  Imagine the path '/some/{name}', the error will be similar to:
   *    '[Mappersmith] required parameter missing (name), "/some/{name}" cannot be resolved'
   */
  path() {
    const { pathAttr: mdPathAttr, path: mdPath } = this.methodDescriptor;
    const originalPath = this.requestParams[mdPathAttr] || mdPath || "";
    const params = this.params();
    let path;
    if (typeof originalPath === "function") {
      path = originalPath(params);
      if (typeof path !== "string") {
        throw new Error(
          `[Mappersmith] method descriptor function did not return a string, params=${JSON.stringify(
            params
          )}`
        );
      }
    } else {
      path = originalPath;
    }
    const regexp = new RegExp(REGEXP_DYNAMIC_SEGMENT, "g");
    const dynamicSegmentKeys = [];
    let match;
    while ((match = regexp.exec(path)) !== null) {
      dynamicSegmentKeys.push(match[1]);
    }
    for (const key of dynamicSegmentKeys) {
      const pattern = new RegExp(`{${key}\\??}`, "g");
      const value = params[key];
      if (value != null && typeof value !== "object") {
        path = path.replace(pattern, this.methodDescriptor.parameterEncoder(value));
        delete params[key];
      }
    }
    path = path.replace(REGEXP_OPTIONAL_DYNAMIC_SEGMENT, "");
    const missingDynamicSegmentMatch = path.match(REGEXP_DYNAMIC_SEGMENT);
    if (missingDynamicSegmentMatch) {
      throw new Error(
        `[Mappersmith] required parameter missing (${missingDynamicSegmentMatch[1]}), "${path}" cannot be resolved`
      );
    }
    const aliasedParams = Object.keys(params).reduce(
      (aliased, key) => {
        const aliasedKey = this.methodDescriptor.queryParamAlias[key] || key;
        const value = params[key];
        if (value != null) {
          aliased[aliasedKey] = value;
        }
        return aliased;
      },
      {}
    );
    const queryString = toQueryString(aliasedParams, this.methodDescriptor.parameterEncoder);
    if (typeof queryString === "string" && queryString.length !== 0) {
      const hasQuery = path.includes("?");
      path += `${hasQuery ? "&" : "?"}${queryString}`;
    }
    if (path[0] !== "/" && path.length > 0) {
      path = `/${path}`;
    }
    return path;
  }
  /**
   * Returns the template path, without params, before interpolation.
   * If path is a function, returns the result of request.path()
   * Example: '/some/{param}/path'
   */
  pathTemplate() {
    const path = this.methodDescriptor.path;
    const prependSlash = (str) => str[0] !== "/" ? `/${str}` : str;
    if (typeof path === "function") {
      return prependSlash(path(this.params()));
    }
    return prependSlash(path);
  }
  /**
   * Returns the full URL
   * Example: http://example.org/some/path?param1=true
   *
   */
  url() {
    return `${this.host()}${this.path()}`;
  }
  /**
   * Returns an object with the headers. Header names are converted to
   * lowercase
   */
  headers() {
    const headerAttr = this.methodDescriptor.headersAttr;
    const headers = this.requestParams[headerAttr] || {};
    if (typeof headers === "function") {
      return headers;
    }
    const mergedHeaders = { ...this.methodDescriptor.headers, ...headers };
    return lowerCaseObjectKeys(mergedHeaders);
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
  body() {
    return this.requestParams[this.methodDescriptor.bodyAttr];
  }
  auth() {
    return this.requestParams[this.methodDescriptor.authAttr];
  }
  timeout() {
    return this.requestParams[this.methodDescriptor.timeoutAttr];
  }
  signal() {
    return this.requestParams[this.methodDescriptor.signalAttr];
  }
  /**
   * Enhances current request returning a new Request
   * @param {RequestParams} extras
   *   @param {Object} extras.auth - it will replace the current auth
   *   @param {String|Object} extras.body - it will replace the current body
   *   @param {Headers} extras.headers - it will be merged with current headers
   *   @param {String} extras.host - it will replace the current timeout
   *   @param {RequestParams} extras.params - it will be merged with current params
   *   @param {Number} extras.timeout - it will replace the current timeout
   * @param {Object} requestContext - Use to pass information between different middleware.
   */
  enhance(extras, requestContext) {
    const authKey = this.methodDescriptor.authAttr;
    const bodyKey = this.methodDescriptor.bodyAttr;
    const headerKey = this.methodDescriptor.headersAttr;
    const hostKey = this.methodDescriptor.hostAttr;
    const timeoutKey = this.methodDescriptor.timeoutAttr;
    const pathKey = this.methodDescriptor.pathAttr;
    const signalKey = this.methodDescriptor.signalAttr;
    const requestParams = assign({}, this.requestParams, extras.params);
    const headers = this.requestParams[headerKey];
    const mergedHeaders = assign({}, headers, extras.headers);
    requestParams[headerKey] = mergedHeaders;
    extras.auth && (requestParams[authKey] = extras.auth);
    extras.body && (requestParams[bodyKey] = extras.body);
    extras.host && (requestParams[hostKey] = extras.host);
    extras.timeout && (requestParams[timeoutKey] = extras.timeout);
    extras.path && (requestParams[pathKey] = extras.path);
    extras.signal && (requestParams[signalKey] = extras.signal);
    const nextContext = { ...this.requestContext, ...requestContext };
    return new _Request(this.methodDescriptor, requestParams, nextContext);
  }
  /**
   * Is the request expecting a binary response?
   */
  isBinary() {
    return this.methodDescriptor.binary;
  }
};
var request_default = Request;
export {
  Request,
  request_default as default
};
//# sourceMappingURL=request.mjs.map