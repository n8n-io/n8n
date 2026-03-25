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
var harTracer_exports = {};
__export(harTracer_exports, {
  HarTracer: () => HarTracer
});
module.exports = __toCommonJS(harTracer_exports);
var import_utils = require("../../utils");
var import_utils2 = require("../../utils");
var import_eventsHelper = require("../utils/eventsHelper");
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
var import_utilsBundle = require("../../utilsBundle");
var import_browserContext = require("../browserContext");
var import_fetch = require("../fetch");
var import_frames = require("../frames");
var import_helper = require("../helper");
var network = __toESM(require("../network"));
const FALLBACK_HTTP_VERSION = "HTTP/1.1";
class HarTracer {
  constructor(context, page, delegate, options) {
    this._barrierPromises = /* @__PURE__ */ new Set();
    this._pageEntries = /* @__PURE__ */ new Map();
    this._eventListeners = [];
    this._started = false;
    this._context = context;
    this._page = page;
    this._delegate = delegate;
    this._options = options;
    if (options.slimMode) {
      options.omitSecurityDetails = true;
      options.omitCookies = true;
      options.omitTiming = true;
      options.omitServerIP = true;
      options.omitSizes = true;
      options.omitPages = true;
    }
    this._entrySymbol = Symbol("requestHarEntry");
    this._baseURL = context instanceof import_fetch.APIRequestContext ? context._defaultOptions().baseURL : context._options.baseURL;
  }
  start(options) {
    if (this._started)
      return;
    this._options.omitScripts = options.omitScripts;
    this._started = true;
    const apiRequest = this._context instanceof import_fetch.APIRequestContext ? this._context : this._context.fetchRequest;
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(apiRequest, import_fetch.APIRequestContext.Events.Request, (event) => this._onAPIRequest(event)),
      import_eventsHelper.eventsHelper.addEventListener(apiRequest, import_fetch.APIRequestContext.Events.RequestFinished, (event) => this._onAPIRequestFinished(event))
    ];
    if (this._context instanceof import_browserContext.BrowserContext) {
      this._eventListeners.push(
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.Page, (page) => this._createPageEntryIfNeeded(page)),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.Request, (request) => this._onRequest(request)),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.RequestFinished, ({ request, response }) => this._onRequestFinished(request, response).catch(() => {
        })),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.RequestFailed, (request) => this._onRequestFailed(request)),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.Response, (response) => this._onResponse(response)),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.RequestAborted, (request) => this._onRequestAborted(request)),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.RequestFulfilled, (request) => this._onRequestFulfilled(request)),
        import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.RequestContinued, (request) => this._onRequestContinued(request))
      );
      for (const page of this._context.pages())
        this._createPageEntryIfNeeded(page);
    }
  }
  _shouldIncludeEntryWithUrl(urlString) {
    return !this._options.urlFilter || (0, import_utils2.urlMatches)(this._baseURL, urlString, this._options.urlFilter);
  }
  _entryForRequest(request) {
    return request[this._entrySymbol];
  }
  _createPageEntryIfNeeded(page) {
    if (!page)
      return;
    if (this._options.omitPages)
      return;
    if (this._page && page !== this._page)
      return;
    let pageEntry = this._pageEntries.get(page);
    if (!pageEntry) {
      const date = /* @__PURE__ */ new Date();
      pageEntry = {
        startedDateTime: date.toISOString(),
        id: page.guid,
        title: "",
        pageTimings: this._options.omitTiming ? {} : {
          onContentLoad: -1,
          onLoad: -1
        }
      };
      pageEntry[startedDateSymbol] = date;
      page.mainFrame().on(import_frames.Frame.Events.AddLifecycle, (event) => {
        if (event === "load")
          this._onLoad(page, pageEntry);
        if (event === "domcontentloaded")
          this._onDOMContentLoaded(page, pageEntry);
      });
      this._pageEntries.set(page, pageEntry);
    }
    return pageEntry;
  }
  _onDOMContentLoaded(page, pageEntry) {
    const promise = page.mainFrame().evaluateExpression(String(() => {
      return {
        title: document.title,
        domContentLoaded: performance.timing.domContentLoadedEventStart
      };
    }), { isFunction: true, world: "utility" }).then((result) => {
      pageEntry.title = result.title;
      if (!this._options.omitTiming)
        pageEntry.pageTimings.onContentLoad = result.domContentLoaded;
    }).catch(() => {
    });
    this._addBarrier(page, promise);
  }
  _onLoad(page, pageEntry) {
    const promise = page.mainFrame().evaluateExpression(String(() => {
      return {
        title: document.title,
        loaded: performance.timing.loadEventStart
      };
    }), { isFunction: true, world: "utility" }).then((result) => {
      pageEntry.title = result.title;
      if (!this._options.omitTiming)
        pageEntry.pageTimings.onLoad = result.loaded;
    }).catch(() => {
    });
    this._addBarrier(page, promise);
  }
  _addBarrier(target, promise) {
    if (!target)
      return null;
    if (!this._options.waitForContentOnStop)
      return;
    const race = target.openScope.safeRace(promise);
    this._barrierPromises.add(race);
    race.then(() => this._barrierPromises.delete(race));
  }
  _onAPIRequest(event) {
    if (!this._shouldIncludeEntryWithUrl(event.url.toString()))
      return;
    const harEntry = createHarEntry(void 0, event.method, event.url, void 0, this._options);
    harEntry._apiRequest = true;
    if (!this._options.omitCookies)
      harEntry.request.cookies = event.cookies;
    harEntry.request.headers = Object.entries(event.headers).map(([name, value]) => ({ name, value }));
    harEntry.request.postData = this._postDataForBuffer(event.postData || null, event.headers["content-type"], this._options.content);
    if (!this._options.omitSizes)
      harEntry.request.bodySize = event.postData?.length || 0;
    event[this._entrySymbol] = harEntry;
    if (this._started)
      this._delegate.onEntryStarted(harEntry);
  }
  _onAPIRequestFinished(event) {
    const harEntry = this._entryForRequest(event.requestEvent);
    if (!harEntry)
      return;
    harEntry.response.status = event.statusCode;
    harEntry.response.statusText = event.statusMessage;
    harEntry.response.httpVersion = event.httpVersion;
    harEntry.response.redirectURL = event.headers.location || "";
    if (!this._options.omitServerIP) {
      harEntry.serverIPAddress = event.serverIPAddress;
      harEntry._serverPort = event.serverPort;
    }
    if (!this._options.omitTiming) {
      harEntry.timings = event.timings;
      this._computeHarEntryTotalTime(harEntry);
    }
    if (!this._options.omitSecurityDetails)
      harEntry._securityDetails = event.securityDetails;
    for (let i = 0; i < event.rawHeaders.length; i += 2) {
      harEntry.response.headers.push({
        name: event.rawHeaders[i],
        value: event.rawHeaders[i + 1]
      });
    }
    harEntry.response.cookies = this._options.omitCookies ? [] : event.cookies.map((c) => {
      return {
        ...c,
        expires: c.expires === -1 ? void 0 : safeDateToISOString(c.expires)
      };
    });
    const content = harEntry.response.content;
    const contentType = event.headers["content-type"];
    if (contentType)
      content.mimeType = contentType;
    this._storeResponseContent(event.body, content, "other");
    if (!this._options.omitSizes)
      harEntry.response.bodySize = event.body?.length ?? 0;
    if (this._started)
      this._delegate.onEntryFinished(harEntry);
  }
  _onRequest(request) {
    if (!this._shouldIncludeEntryWithUrl(request.url()))
      return;
    const page = request.frame()?._page;
    if (this._page && page !== this._page)
      return;
    const url = network.parseURL(request.url());
    if (!url)
      return;
    const pageEntry = this._createPageEntryIfNeeded(page);
    const harEntry = createHarEntry(pageEntry?.id, request.method(), url, request.frame()?.guid, this._options);
    this._recordRequestHeadersAndCookies(harEntry, request.headers());
    harEntry.request.postData = this._postDataForRequest(request, this._options.content);
    if (!this._options.omitSizes)
      harEntry.request.bodySize = request.bodySize();
    if (request.redirectedFrom()) {
      const fromEntry = this._entryForRequest(request.redirectedFrom());
      if (fromEntry)
        fromEntry.response.redirectURL = request.url();
    }
    request[this._entrySymbol] = harEntry;
    (0, import_utils.assert)(this._started);
    this._delegate.onEntryStarted(harEntry);
  }
  _recordRequestHeadersAndCookies(harEntry, headers) {
    if (!this._options.omitCookies) {
      harEntry.request.cookies = [];
      for (const header of headers.filter((header2) => header2.name.toLowerCase() === "cookie"))
        harEntry.request.cookies.push(...header.value.split(";").map(parseCookie));
    }
    harEntry.request.headers = headers;
  }
  _recordRequestOverrides(harEntry, request) {
    if (!request.overrides() || !this._options.recordRequestOverrides)
      return;
    harEntry.request.method = request.method();
    harEntry.request.url = request.url();
    harEntry.request.postData = this._postDataForRequest(request, this._options.content);
    this._recordRequestHeadersAndCookies(harEntry, request.headers());
  }
  async _onRequestFinished(request, response) {
    if (!response)
      return;
    const harEntry = this._entryForRequest(request);
    if (!harEntry)
      return;
    const page = request.frame()?._page;
    if (!this._options.omitServerIP) {
      this._addBarrier(page || request.serviceWorker(), response.serverAddr().then((server) => {
        if (server?.ipAddress)
          harEntry.serverIPAddress = server.ipAddress;
        if (server?.port)
          harEntry._serverPort = server.port;
      }));
    }
    if (!this._options.omitSecurityDetails) {
      this._addBarrier(page || request.serviceWorker(), response.securityDetails().then((details) => {
        if (details)
          harEntry._securityDetails = details;
      }));
    }
    const httpVersion = response.httpVersion();
    harEntry.request.httpVersion = httpVersion;
    harEntry.response.httpVersion = httpVersion;
    const compressionCalculationBarrier = this._options.omitSizes ? void 0 : {
      _encodedBodySize: -1,
      _decodedBodySize: -1,
      barrier: new import_manualPromise.ManualPromise(),
      _check: function() {
        if (this._encodedBodySize !== -1 && this._decodedBodySize !== -1) {
          harEntry.response.content.compression = Math.max(0, this._decodedBodySize - this._encodedBodySize);
          this.barrier.resolve();
        }
      },
      setEncodedBodySize: function(encodedBodySize) {
        this._encodedBodySize = encodedBodySize;
        this._check();
      },
      setDecodedBodySize: function(decodedBodySize) {
        this._decodedBodySize = decodedBodySize;
        this._check();
      }
    };
    if (compressionCalculationBarrier)
      this._addBarrier(page || request.serviceWorker(), compressionCalculationBarrier.barrier);
    const promise = response.body().then((buffer) => {
      if (this._options.omitScripts && request.resourceType() === "script") {
        compressionCalculationBarrier?.setDecodedBodySize(0);
        return;
      }
      const content = harEntry.response.content;
      compressionCalculationBarrier?.setDecodedBodySize(buffer.length);
      this._storeResponseContent(buffer, content, request.resourceType());
    }).catch(() => {
      compressionCalculationBarrier?.setDecodedBodySize(0);
    }).then(() => {
      if (this._started)
        this._delegate.onEntryFinished(harEntry);
    });
    this._addBarrier(page || request.serviceWorker(), promise);
    const timing = response.timing();
    harEntry.timings.receive = response.request()._responseEndTiming !== -1 ? import_helper.helper.millisToRoundishMillis(response.request()._responseEndTiming - timing.responseStart) : -1;
    this._computeHarEntryTotalTime(harEntry);
    if (!this._options.omitSizes) {
      this._addBarrier(page || request.serviceWorker(), response.sizes().then((sizes) => {
        harEntry.response.bodySize = sizes.responseBodySize;
        harEntry.response.headersSize = sizes.responseHeadersSize;
        harEntry.response._transferSize = sizes.transferSize;
        harEntry.request.headersSize = sizes.requestHeadersSize;
        compressionCalculationBarrier?.setEncodedBodySize(sizes.responseBodySize);
      }));
    }
  }
  async _onRequestFailed(request) {
    const harEntry = this._entryForRequest(request);
    if (!harEntry)
      return;
    if (request._failureText !== null)
      harEntry.response._failureText = request._failureText;
    this._recordRequestOverrides(harEntry, request);
    if (this._started)
      this._delegate.onEntryFinished(harEntry);
  }
  _onRequestAborted(request) {
    const harEntry = this._entryForRequest(request);
    if (harEntry)
      harEntry._wasAborted = true;
  }
  _onRequestFulfilled(request) {
    const harEntry = this._entryForRequest(request);
    if (harEntry)
      harEntry._wasFulfilled = true;
  }
  _onRequestContinued(request) {
    const harEntry = this._entryForRequest(request);
    if (harEntry)
      harEntry._wasContinued = true;
  }
  _storeResponseContent(buffer, content, resourceType) {
    if (!buffer) {
      content.size = 0;
      return;
    }
    if (!this._options.omitSizes)
      content.size = buffer.length;
    if (this._options.content === "embed") {
      if ((0, import_utils2.isTextualMimeType)(content.mimeType) && resourceType !== "font") {
        content.text = buffer.toString();
      } else {
        content.text = buffer.toString("base64");
        content.encoding = "base64";
      }
    } else if (this._options.content === "attach") {
      const sha1 = (0, import_utils.calculateSha1)(buffer) + "." + (import_utilsBundle.mime.getExtension(content.mimeType) || "dat");
      if (this._options.includeTraceInfo)
        content._sha1 = sha1;
      else
        content._file = sha1;
      if (this._started)
        this._delegate.onContentBlob(sha1, buffer);
    }
  }
  _onResponse(response) {
    const harEntry = this._entryForRequest(response.request());
    if (!harEntry)
      return;
    const page = response.frame()?._page;
    const pageEntry = this._createPageEntryIfNeeded(page);
    const request = response.request();
    harEntry.response = {
      status: response.status(),
      statusText: response.statusText(),
      httpVersion: response.httpVersion(),
      // These are bad values that will be overwritten below.
      cookies: [],
      headers: [],
      content: {
        size: -1,
        mimeType: "x-unknown"
      },
      headersSize: -1,
      bodySize: -1,
      redirectURL: "",
      _transferSize: this._options.omitSizes ? void 0 : -1
    };
    if (!this._options.omitTiming) {
      const startDateTime = pageEntry ? pageEntry[startedDateSymbol].valueOf() : 0;
      const timing = response.timing();
      if (pageEntry && startDateTime > timing.startTime)
        pageEntry.startedDateTime = new Date(timing.startTime).toISOString();
      const dns = timing.domainLookupEnd !== -1 ? import_helper.helper.millisToRoundishMillis(timing.domainLookupEnd - timing.domainLookupStart) : -1;
      const connect = timing.connectEnd !== -1 ? import_helper.helper.millisToRoundishMillis(timing.connectEnd - timing.connectStart) : -1;
      const ssl = timing.connectEnd !== -1 ? import_helper.helper.millisToRoundishMillis(timing.connectEnd - timing.secureConnectionStart) : -1;
      const wait = timing.responseStart !== -1 ? import_helper.helper.millisToRoundishMillis(timing.responseStart - timing.requestStart) : -1;
      const receive = -1;
      harEntry.timings = {
        dns,
        connect,
        ssl,
        send: 0,
        wait,
        receive
      };
      this._computeHarEntryTotalTime(harEntry);
    }
    this._recordRequestOverrides(harEntry, request);
    this._addBarrier(page || request.serviceWorker(), request.rawRequestHeaders().then((headers) => {
      this._recordRequestHeadersAndCookies(harEntry, headers);
    }));
    this._recordResponseHeaders(harEntry, response.headers());
    this._addBarrier(page || request.serviceWorker(), response.rawResponseHeaders().then((headers) => {
      this._recordResponseHeaders(harEntry, headers);
    }));
  }
  _recordResponseHeaders(harEntry, headers) {
    if (!this._options.omitCookies) {
      harEntry.response.cookies = headers.filter((header) => header.name.toLowerCase() === "set-cookie").map((header) => parseCookie(header.value));
    }
    harEntry.response.headers = headers;
    const contentType = headers.find((header) => header.name.toLowerCase() === "content-type");
    if (contentType)
      harEntry.response.content.mimeType = contentType.value;
  }
  _computeHarEntryTotalTime(harEntry) {
    harEntry.time = [
      harEntry.timings.dns,
      harEntry.timings.connect,
      harEntry.timings.ssl,
      harEntry.timings.wait,
      harEntry.timings.receive
    ].reduce((pre, cur) => (cur || -1) > 0 ? cur + pre : pre, 0);
  }
  async flush() {
    await Promise.all(this._barrierPromises);
  }
  stop() {
    this._started = false;
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    this._barrierPromises.clear();
    const context = this._context instanceof import_browserContext.BrowserContext ? this._context : void 0;
    const log = {
      version: "1.2",
      creator: {
        name: "Playwright",
        version: (0, import_utils2.getPlaywrightVersion)()
      },
      browser: {
        name: context?._browser.options.name || "",
        version: context?._browser.version() || ""
      },
      pages: this._pageEntries.size ? Array.from(this._pageEntries.values()) : void 0,
      entries: []
    };
    if (!this._options.omitTiming) {
      for (const pageEntry of log.pages || []) {
        const startDateTime = pageEntry[startedDateSymbol].valueOf();
        if (typeof pageEntry.pageTimings.onContentLoad === "number" && pageEntry.pageTimings.onContentLoad >= 0)
          pageEntry.pageTimings.onContentLoad -= startDateTime;
        else
          pageEntry.pageTimings.onContentLoad = -1;
        if (typeof pageEntry.pageTimings.onLoad === "number" && pageEntry.pageTimings.onLoad >= 0)
          pageEntry.pageTimings.onLoad -= startDateTime;
        else
          pageEntry.pageTimings.onLoad = -1;
      }
    }
    this._pageEntries.clear();
    return log;
  }
  _postDataForRequest(request, content) {
    const postData = request.postDataBuffer();
    if (!postData)
      return;
    const contentType = request.headerValue("content-type");
    return this._postDataForBuffer(postData, contentType, content);
  }
  _postDataForBuffer(postData, contentType, content) {
    if (!postData)
      return;
    contentType ??= "application/octet-stream";
    const result = {
      mimeType: contentType,
      text: "",
      params: []
    };
    if (content === "embed" && contentType !== "application/octet-stream")
      result.text = postData.toString();
    if (content === "attach") {
      const sha1 = (0, import_utils.calculateSha1)(postData) + "." + (import_utilsBundle.mime.getExtension(contentType) || "dat");
      if (this._options.includeTraceInfo)
        result._sha1 = sha1;
      else
        result._file = sha1;
      this._delegate.onContentBlob(sha1, postData);
    }
    if (contentType === "application/x-www-form-urlencoded") {
      const parsed = new URLSearchParams(postData.toString());
      for (const [name, value] of parsed.entries())
        result.params.push({ name, value });
    }
    return result;
  }
}
function createHarEntry(pageRef, method, url, frameref, options) {
  const harEntry = {
    pageref: pageRef,
    startedDateTime: (/* @__PURE__ */ new Date()).toISOString(),
    time: -1,
    request: {
      method,
      url: url.toString(),
      httpVersion: FALLBACK_HTTP_VERSION,
      cookies: [],
      headers: [],
      queryString: [...url.searchParams].map((e) => ({ name: e[0], value: e[1] })),
      headersSize: -1,
      bodySize: -1
    },
    response: {
      status: -1,
      statusText: "",
      httpVersion: FALLBACK_HTTP_VERSION,
      cookies: [],
      headers: [],
      content: {
        size: -1,
        mimeType: "x-unknown"
      },
      headersSize: -1,
      bodySize: -1,
      redirectURL: "",
      _transferSize: options.omitSizes ? void 0 : -1
    },
    cache: {},
    timings: {
      send: -1,
      wait: -1,
      receive: -1
    },
    _frameref: options.includeTraceInfo ? frameref : void 0,
    _monotonicTime: options.includeTraceInfo ? (0, import_utils.monotonicTime)() : void 0
  };
  return harEntry;
}
function parseCookie(c) {
  const cookie = {
    name: "",
    value: ""
  };
  let first = true;
  for (const pair of c.split(/; */)) {
    const indexOfEquals = pair.indexOf("=");
    const name = indexOfEquals !== -1 ? pair.substr(0, indexOfEquals).trim() : pair.trim();
    const value = indexOfEquals !== -1 ? pair.substr(indexOfEquals + 1, pair.length).trim() : "";
    if (first) {
      first = false;
      cookie.name = name;
      cookie.value = value;
      continue;
    }
    if (name === "Domain")
      cookie.domain = value;
    if (name === "Expires")
      cookie.expires = safeDateToISOString(value);
    if (name === "HttpOnly")
      cookie.httpOnly = true;
    if (name === "Max-Age")
      cookie.expires = safeDateToISOString(Date.now() + +value * 1e3);
    if (name === "Path")
      cookie.path = value;
    if (name === "SameSite")
      cookie.sameSite = value;
    if (name === "Secure")
      cookie.secure = true;
  }
  return cookie;
}
function safeDateToISOString(value) {
  try {
    return new Date(value).toISOString();
  } catch (e) {
  }
}
const startedDateSymbol = Symbol("startedDate");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HarTracer
});
