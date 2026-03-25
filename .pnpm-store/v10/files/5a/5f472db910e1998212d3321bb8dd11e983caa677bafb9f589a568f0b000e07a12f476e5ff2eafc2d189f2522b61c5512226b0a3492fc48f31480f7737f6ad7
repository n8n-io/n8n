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
var network_exports = {};
__export(network_exports, {
  Request: () => Request,
  Response: () => Response,
  Route: () => Route,
  WebSocket: () => WebSocket,
  applyHeadersOverrides: () => applyHeadersOverrides,
  filterCookies: () => filterCookies,
  isLocalHostname: () => isLocalHostname,
  kMaxCookieExpiresDateInSeconds: () => kMaxCookieExpiresDateInSeconds,
  mergeHeaders: () => mergeHeaders,
  parseURL: () => parseURL,
  rewriteCookies: () => rewriteCookies,
  singleHeader: () => singleHeader,
  statusText: () => statusText,
  stripFragmentFromUrl: () => stripFragmentFromUrl
});
module.exports = __toCommonJS(network_exports);
var import_utils = require("../utils");
var import_browserContext = require("./browserContext");
var import_fetch = require("./fetch");
var import_instrumentation = require("./instrumentation");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
function filterCookies(cookies, urls) {
  const parsedURLs = urls.map((s) => new URL(s));
  return cookies.filter((c) => {
    if (!parsedURLs.length)
      return true;
    for (const parsedURL of parsedURLs) {
      let domain = c.domain;
      if (!domain.startsWith("."))
        domain = "." + domain;
      if (!("." + parsedURL.hostname).endsWith(domain))
        continue;
      if (!parsedURL.pathname.startsWith(c.path))
        continue;
      if (parsedURL.protocol !== "https:" && !isLocalHostname(parsedURL.hostname) && c.secure)
        continue;
      return true;
    }
    return false;
  });
}
function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}
const FORBIDDEN_HEADER_NAMES = /* @__PURE__ */ new Set([
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via"
]);
const FORBIDDEN_METHODS = /* @__PURE__ */ new Set(["CONNECT", "TRACE", "TRACK"]);
function isForbiddenHeader(name, value) {
  const lowerName = name.toLowerCase();
  if (FORBIDDEN_HEADER_NAMES.has(lowerName))
    return true;
  if (lowerName.startsWith("proxy-"))
    return true;
  if (lowerName.startsWith("sec-"))
    return true;
  if (lowerName === "x-http-method" || lowerName === "x-http-method-override" || lowerName === "x-method-override") {
    if (value && FORBIDDEN_METHODS.has(value.toUpperCase()))
      return true;
  }
  return false;
}
function applyHeadersOverrides(original, overrides) {
  const forbiddenHeaders = original.filter((header) => isForbiddenHeader(header.name, header.value));
  const allowedHeaders = overrides.filter((header) => !isForbiddenHeader(header.name, header.value));
  return mergeHeaders([allowedHeaders, forbiddenHeaders]);
}
const kMaxCookieExpiresDateInSeconds = 253402300799;
function rewriteCookies(cookies) {
  return cookies.map((c) => {
    (0, import_utils.assert)(c.url || c.domain && c.path, "Cookie should have a url or a domain/path pair");
    (0, import_utils.assert)(!(c.url && c.domain), "Cookie should have either url or domain");
    (0, import_utils.assert)(!(c.url && c.path), "Cookie should have either url or path");
    (0, import_utils.assert)(!(c.expires && c.expires < 0 && c.expires !== -1), "Cookie should have a valid expires, only -1 or a positive number for the unix timestamp in seconds is allowed");
    (0, import_utils.assert)(!(c.expires && c.expires > 0 && c.expires > kMaxCookieExpiresDateInSeconds), "Cookie should have a valid expires, only -1 or a positive number for the unix timestamp in seconds is allowed");
    const copy = { ...c };
    if (copy.url) {
      (0, import_utils.assert)(copy.url !== "about:blank", `Blank page can not have cookie "${c.name}"`);
      (0, import_utils.assert)(!copy.url.startsWith("data:"), `Data URL page can not have cookie "${c.name}"`);
      const url = new URL(copy.url);
      copy.domain = url.hostname;
      copy.path = url.pathname.substring(0, url.pathname.lastIndexOf("/") + 1);
      copy.secure = url.protocol === "https:";
    }
    return copy;
  });
}
function parseURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}
function stripFragmentFromUrl(url) {
  if (!url.includes("#"))
    return url;
  return url.substring(0, url.indexOf("#"));
}
class Request extends import_instrumentation.SdkObject {
  constructor(context, frame, serviceWorker, redirectedFrom, documentId, url, resourceType, method, postData, headers) {
    super(frame || context, "request");
    this._response = null;
    this._redirectedTo = null;
    this._failureText = null;
    this._frame = null;
    this._serviceWorker = null;
    this._rawRequestHeadersPromise = new import_manualPromise.ManualPromise();
    this._waitForResponsePromise = new import_manualPromise.ManualPromise();
    this._responseEndTiming = -1;
    (0, import_utils.assert)(!url.startsWith("data:"), "Data urls should not fire requests");
    this._context = context;
    this._frame = frame;
    this._serviceWorker = serviceWorker;
    this._redirectedFrom = redirectedFrom;
    if (redirectedFrom)
      redirectedFrom._redirectedTo = this;
    this._documentId = documentId;
    this._url = stripFragmentFromUrl(url);
    this._resourceType = resourceType;
    this._method = method;
    this._postData = postData;
    this._headers = headers;
    this._isFavicon = url.endsWith("/favicon.ico") || !!redirectedFrom?._isFavicon;
  }
  static {
    this.Events = {
      Response: "response"
    };
  }
  _setFailureText(failureText) {
    this._failureText = failureText;
    this._waitForResponsePromise.resolve(null);
  }
  _applyOverrides(overrides) {
    this._overrides = { ...this._overrides, ...overrides };
    return this._overrides;
  }
  overrides() {
    return this._overrides;
  }
  url() {
    return this._overrides?.url || this._url;
  }
  resourceType() {
    return this._resourceType;
  }
  method() {
    return this._overrides?.method || this._method;
  }
  postDataBuffer() {
    return this._overrides?.postData || this._postData;
  }
  headers() {
    return this._overrides?.headers || this._headers;
  }
  headerValue(name) {
    const lowerCaseName = name.toLowerCase();
    return this.headers().find((h) => h.name.toLowerCase() === lowerCaseName)?.value;
  }
  // "null" means no raw headers available - we'll use provisional headers as raw headers.
  setRawRequestHeaders(headers) {
    if (!this._rawRequestHeadersPromise.isDone())
      this._rawRequestHeadersPromise.resolve(headers || this._headers);
  }
  async rawRequestHeaders() {
    return this._overrides?.headers || this._rawRequestHeadersPromise;
  }
  response() {
    return this._waitForResponsePromise;
  }
  _existingResponse() {
    return this._response;
  }
  _setResponse(response) {
    this._response = response;
    this._waitForResponsePromise.resolve(response);
    this.emit(Request.Events.Response, response);
  }
  _finalRequest() {
    return this._redirectedTo ? this._redirectedTo._finalRequest() : this;
  }
  frame() {
    return this._frame;
  }
  serviceWorker() {
    return this._serviceWorker;
  }
  isNavigationRequest() {
    return !!this._documentId;
  }
  redirectedFrom() {
    return this._redirectedFrom;
  }
  failure() {
    if (this._failureText === null)
      return null;
    return {
      errorText: this._failureText
    };
  }
  // TODO(bidi): remove once post body is available.
  _setBodySize(size) {
    this._bodySize = size;
  }
  bodySize() {
    return this._bodySize || this.postDataBuffer()?.length || 0;
  }
  async requestHeadersSize() {
    let headersSize = 4;
    headersSize += this.method().length;
    headersSize += new URL(this.url()).pathname.length;
    headersSize += 8;
    const headers = await this.rawRequestHeaders();
    for (const header of headers)
      headersSize += header.name.length + header.value.length + 4;
    return headersSize;
  }
}
class Route extends import_instrumentation.SdkObject {
  constructor(request, delegate) {
    super(request._frame || request._context, "route");
    this._handled = false;
    this._futureHandlers = [];
    this._request = request;
    this._delegate = delegate;
    this._request._context.addRouteInFlight(this);
  }
  handle(handlers) {
    this._futureHandlers = [...handlers];
    this.continue({ isFallback: true }).catch(() => {
    });
  }
  async removeHandler(handler) {
    this._futureHandlers = this._futureHandlers.filter((h) => h !== handler);
    if (handler === this._currentHandler) {
      await this.continue({ isFallback: true }).catch(() => {
      });
      return;
    }
  }
  request() {
    return this._request;
  }
  async abort(errorCode = "failed") {
    this._startHandling();
    this._request._context.emit(import_browserContext.BrowserContext.Events.RequestAborted, this._request);
    await this._delegate.abort(errorCode);
    this._endHandling();
  }
  redirectNavigationRequest(url) {
    this._startHandling();
    (0, import_utils.assert)(this._request.isNavigationRequest());
    this._request.frame().redirectNavigation(url, this._request._documentId, this._request.headerValue("referer"));
    this._endHandling();
  }
  async fulfill(overrides) {
    this._startHandling();
    let body = overrides.body;
    let isBase64 = overrides.isBase64 || false;
    if (body === void 0) {
      if (overrides.fetchResponseUid) {
        const buffer = this._request._context.fetchRequest.fetchResponses.get(overrides.fetchResponseUid) || import_fetch.APIRequestContext.findResponseBody(overrides.fetchResponseUid);
        (0, import_utils.assert)(buffer, "Fetch response has been disposed");
        body = buffer.toString("base64");
        isBase64 = true;
      } else {
        body = "";
        isBase64 = false;
      }
    } else if (!overrides.status || overrides.status < 200 || overrides.status >= 400) {
      this._request._responseBodyOverride = { body, isBase64 };
    }
    const headers = [...overrides.headers || []];
    this._maybeAddCorsHeaders(headers);
    this._request._context.emit(import_browserContext.BrowserContext.Events.RequestFulfilled, this._request);
    await this._delegate.fulfill({
      status: overrides.status || 200,
      headers,
      body,
      isBase64
    });
    this._endHandling();
  }
  // See https://github.com/microsoft/playwright/issues/12929
  _maybeAddCorsHeaders(headers) {
    const origin = this._request.headerValue("origin");
    if (!origin)
      return;
    const requestUrl = new URL(this._request.url());
    if (!requestUrl.protocol.startsWith("http"))
      return;
    if (requestUrl.origin === origin.trim())
      return;
    const corsHeader = headers.find(({ name }) => name === "access-control-allow-origin");
    if (corsHeader)
      return;
    headers.push({ name: "access-control-allow-origin", value: origin });
    headers.push({ name: "access-control-allow-credentials", value: "true" });
    headers.push({ name: "vary", value: "Origin" });
  }
  async continue(overrides) {
    if (overrides.url) {
      const newUrl = new URL(overrides.url);
      const oldUrl = new URL(this._request.url());
      if (oldUrl.protocol !== newUrl.protocol)
        throw new Error("New URL must have same protocol as overridden URL");
    }
    if (overrides.headers) {
      overrides.headers = applyHeadersOverrides(this._request._headers, overrides.headers);
    }
    overrides = this._request._applyOverrides(overrides);
    const nextHandler = this._futureHandlers.shift();
    if (nextHandler) {
      this._currentHandler = nextHandler;
      nextHandler(this, this._request);
      return;
    }
    if (!overrides.isFallback)
      this._request._context.emit(import_browserContext.BrowserContext.Events.RequestContinued, this._request);
    this._startHandling();
    await this._delegate.continue(overrides);
    this._endHandling();
  }
  _startHandling() {
    (0, import_utils.assert)(!this._handled, "Route is already handled!");
    this._handled = true;
    this._currentHandler = void 0;
  }
  _endHandling() {
    this._futureHandlers = [];
    this._currentHandler = void 0;
    this._request._context.removeRouteInFlight(this);
  }
}
class Response extends import_instrumentation.SdkObject {
  constructor(request, status, statusText2, headers, timing, getResponseBodyCallback, fromServiceWorker, httpVersion) {
    super(request.frame() || request._context, "response");
    this._contentPromise = null;
    this._finishedPromise = new import_manualPromise.ManualPromise();
    this._headersMap = /* @__PURE__ */ new Map();
    this._serverAddrPromise = new import_manualPromise.ManualPromise();
    this._securityDetailsPromise = new import_manualPromise.ManualPromise();
    this._rawResponseHeadersPromise = new import_manualPromise.ManualPromise();
    this._encodedBodySizePromise = new import_manualPromise.ManualPromise();
    this._transferSizePromise = new import_manualPromise.ManualPromise();
    this._responseHeadersSizePromise = new import_manualPromise.ManualPromise();
    this._request = request;
    this._timing = timing;
    this._status = status;
    this._statusText = statusText2;
    this._url = request.url();
    this._headers = headers;
    for (const { name, value } of this._headers)
      this._headersMap.set(name.toLowerCase(), value);
    this._getResponseBodyCallback = getResponseBodyCallback;
    this._request._setResponse(this);
    this._httpVersion = httpVersion;
    this._fromServiceWorker = fromServiceWorker;
  }
  _serverAddrFinished(addr) {
    this._serverAddrPromise.resolve(addr);
  }
  _securityDetailsFinished(securityDetails) {
    this._securityDetailsPromise.resolve(securityDetails);
  }
  _requestFinished(responseEndTiming) {
    this._request._responseEndTiming = Math.max(responseEndTiming, this._timing.responseStart);
    if (this._timing.requestStart === -1)
      this._timing.requestStart = this._request._responseEndTiming;
    this._finishedPromise.resolve();
  }
  _setHttpVersion(httpVersion) {
    this._httpVersion = httpVersion;
  }
  url() {
    return this._url;
  }
  status() {
    return this._status;
  }
  statusText() {
    return this._statusText;
  }
  headers() {
    return this._headers;
  }
  headerValue(name) {
    return this._headersMap.get(name);
  }
  async rawResponseHeaders() {
    return this._rawResponseHeadersPromise;
  }
  // "null" means no raw headers available - we'll use provisional headers as raw headers.
  setRawResponseHeaders(headers) {
    if (!this._rawResponseHeadersPromise.isDone())
      this._rawResponseHeadersPromise.resolve(headers || this._headers);
  }
  setTransferSize(size) {
    this._transferSizePromise.resolve(size);
  }
  setEncodedBodySize(size) {
    this._encodedBodySizePromise.resolve(size);
  }
  setResponseHeadersSize(size) {
    this._responseHeadersSizePromise.resolve(size);
  }
  timing() {
    return this._timing;
  }
  async serverAddr() {
    return await this._serverAddrPromise || null;
  }
  async securityDetails() {
    return await this._securityDetailsPromise || null;
  }
  body() {
    if (!this._contentPromise) {
      this._contentPromise = this._finishedPromise.then(async () => {
        if (this._status >= 300 && this._status <= 399)
          throw new Error("Response body is unavailable for redirect responses");
        if (this._request._responseBodyOverride) {
          const { body, isBase64 } = this._request._responseBodyOverride;
          return Buffer.from(body, isBase64 ? "base64" : "utf-8");
        }
        return this._getResponseBodyCallback();
      });
    }
    return this._contentPromise;
  }
  request() {
    return this._request;
  }
  finished() {
    return this._finishedPromise;
  }
  frame() {
    return this._request.frame();
  }
  httpVersion() {
    if (!this._httpVersion)
      return "HTTP/1.1";
    if (this._httpVersion === "http/1.1")
      return "HTTP/1.1";
    if (this._httpVersion === "h2")
      return "HTTP/2.0";
    return this._httpVersion;
  }
  fromServiceWorker() {
    return this._fromServiceWorker;
  }
  async responseHeadersSize() {
    const availableSize = await this._responseHeadersSizePromise;
    if (availableSize !== null)
      return availableSize;
    let headersSize = 4;
    headersSize += 8;
    headersSize += 3;
    headersSize += this.statusText().length;
    const headers = await this._rawResponseHeadersPromise;
    for (const header of headers)
      headersSize += header.name.length + header.value.length + 4;
    headersSize += 2;
    return headersSize;
  }
  async sizes() {
    const requestHeadersSize = await this._request.requestHeadersSize();
    const responseHeadersSize = await this.responseHeadersSize();
    let encodedBodySize = await this._encodedBodySizePromise;
    if (encodedBodySize === null) {
      const headers = await this._rawResponseHeadersPromise;
      const contentLength = headers.find((h) => h.name.toLowerCase() === "content-length")?.value;
      encodedBodySize = contentLength ? +contentLength : 0;
    }
    let transferSize = await this._transferSizePromise;
    if (transferSize === null) {
      transferSize = responseHeadersSize + encodedBodySize;
    }
    return {
      requestBodySize: this._request.bodySize(),
      requestHeadersSize,
      responseBodySize: encodedBodySize,
      responseHeadersSize,
      transferSize
    };
  }
}
class WebSocket extends import_instrumentation.SdkObject {
  constructor(parent, url) {
    super(parent, "ws");
    this._notified = false;
    this._url = url;
  }
  static {
    this.Events = {
      Close: "close",
      SocketError: "socketerror",
      FrameReceived: "framereceived",
      FrameSent: "framesent"
    };
  }
  markAsNotified() {
    if (this._notified)
      return false;
    this._notified = true;
    return true;
  }
  url() {
    return this._url;
  }
  frameSent(opcode, data) {
    this.emit(WebSocket.Events.FrameSent, { opcode, data });
  }
  frameReceived(opcode, data) {
    this.emit(WebSocket.Events.FrameReceived, { opcode, data });
  }
  error(errorMessage) {
    this.emit(WebSocket.Events.SocketError, errorMessage);
  }
  closed() {
    this.emit(WebSocket.Events.Close);
  }
}
const STATUS_TEXTS = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "103": "Early Hints",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "306": "Switch Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Too Early",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "510": "Not Extended",
  "511": "Network Authentication Required"
};
function statusText(status) {
  return STATUS_TEXTS[String(status)] || "Unknown";
}
function singleHeader(name, value) {
  return [{ name, value }];
}
function mergeHeaders(headers) {
  const lowerCaseToValue = /* @__PURE__ */ new Map();
  const lowerCaseToOriginalCase = /* @__PURE__ */ new Map();
  for (const h of headers) {
    if (!h)
      continue;
    for (const { name, value } of h) {
      const lower = name.toLowerCase();
      lowerCaseToOriginalCase.set(lower, name);
      lowerCaseToValue.set(lower, value);
    }
  }
  const result = [];
  for (const [lower, value] of lowerCaseToValue)
    result.push({ name: lowerCaseToOriginalCase.get(lower), value });
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Request,
  Response,
  Route,
  WebSocket,
  applyHeadersOverrides,
  filterCookies,
  isLocalHostname,
  kMaxCookieExpiresDateInSeconds,
  mergeHeaders,
  parseURL,
  rewriteCookies,
  singleHeader,
  statusText,
  stripFragmentFromUrl
});
