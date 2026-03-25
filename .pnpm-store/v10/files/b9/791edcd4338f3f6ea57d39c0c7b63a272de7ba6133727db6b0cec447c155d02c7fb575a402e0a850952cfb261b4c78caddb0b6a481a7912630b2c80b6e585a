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
  RawHeaders: () => RawHeaders,
  Request: () => Request,
  Response: () => Response,
  Route: () => Route,
  RouteHandler: () => RouteHandler,
  WebSocket: () => WebSocket,
  WebSocketRoute: () => WebSocketRoute,
  WebSocketRouteHandler: () => WebSocketRouteHandler,
  validateHeaders: () => validateHeaders
});
module.exports = __toCommonJS(network_exports);
var import_channelOwner = require("./channelOwner");
var import_errors = require("./errors");
var import_events = require("./events");
var import_fetch = require("./fetch");
var import_frame = require("./frame");
var import_waiter = require("./waiter");
var import_worker = require("./worker");
var import_assert = require("../utils/isomorphic/assert");
var import_headers = require("../utils/isomorphic/headers");
var import_urlMatch = require("../utils/isomorphic/urlMatch");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_multimap = require("../utils/isomorphic/multimap");
var import_rtti = require("../utils/isomorphic/rtti");
var import_stackTrace = require("../utils/isomorphic/stackTrace");
var import_mimeType = require("../utils/isomorphic/mimeType");
class Request extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._redirectedFrom = null;
    this._redirectedTo = null;
    this._failureText = null;
    this._fallbackOverrides = {};
    this._hasResponse = false;
    this._redirectedFrom = Request.fromNullable(initializer.redirectedFrom);
    if (this._redirectedFrom)
      this._redirectedFrom._redirectedTo = this;
    this._provisionalHeaders = new RawHeaders(initializer.headers);
    this._timing = {
      startTime: 0,
      domainLookupStart: -1,
      domainLookupEnd: -1,
      connectStart: -1,
      secureConnectionStart: -1,
      connectEnd: -1,
      requestStart: -1,
      responseStart: -1,
      responseEnd: -1
    };
    this._hasResponse = this._initializer.hasResponse;
    this._channel.on("response", () => this._hasResponse = true);
  }
  static from(request) {
    return request._object;
  }
  static fromNullable(request) {
    return request ? Request.from(request) : null;
  }
  url() {
    return this._fallbackOverrides.url || this._initializer.url;
  }
  resourceType() {
    return this._initializer.resourceType;
  }
  method() {
    return this._fallbackOverrides.method || this._initializer.method;
  }
  postData() {
    return (this._fallbackOverrides.postDataBuffer || this._initializer.postData)?.toString("utf-8") || null;
  }
  postDataBuffer() {
    return this._fallbackOverrides.postDataBuffer || this._initializer.postData || null;
  }
  postDataJSON() {
    const postData = this.postData();
    if (!postData)
      return null;
    const contentType = this.headers()["content-type"];
    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const entries = {};
      const parsed = new URLSearchParams(postData);
      for (const [k, v] of parsed.entries())
        entries[k] = v;
      return entries;
    }
    try {
      return JSON.parse(postData);
    } catch (e) {
      throw new Error("POST data is not a valid JSON object: " + postData);
    }
  }
  /**
   * @deprecated
   */
  headers() {
    if (this._fallbackOverrides.headers)
      return RawHeaders._fromHeadersObjectLossy(this._fallbackOverrides.headers).headers();
    return this._provisionalHeaders.headers();
  }
  async _actualHeaders() {
    if (this._fallbackOverrides.headers)
      return RawHeaders._fromHeadersObjectLossy(this._fallbackOverrides.headers);
    if (!this._actualHeadersPromise) {
      this._actualHeadersPromise = this._wrapApiCall(async () => {
        return new RawHeaders((await this._channel.rawRequestHeaders()).headers);
      }, { internal: true });
    }
    return await this._actualHeadersPromise;
  }
  async allHeaders() {
    return (await this._actualHeaders()).headers();
  }
  async headersArray() {
    return (await this._actualHeaders()).headersArray();
  }
  async headerValue(name) {
    return (await this._actualHeaders()).get(name);
  }
  async response() {
    return Response.fromNullable((await this._channel.response()).response);
  }
  async _internalResponse() {
    return Response.fromNullable((await this._channel.response()).response);
  }
  frame() {
    if (!this._initializer.frame) {
      (0, import_assert.assert)(this.serviceWorker());
      throw new Error("Service Worker requests do not have an associated frame.");
    }
    const frame = import_frame.Frame.from(this._initializer.frame);
    if (!frame._page) {
      throw new Error([
        "Frame for this navigation request is not available, because the request",
        "was issued before the frame is created. You can check whether the request",
        "is a navigation request by calling isNavigationRequest() method."
      ].join("\n"));
    }
    return frame;
  }
  _safePage() {
    return import_frame.Frame.fromNullable(this._initializer.frame)?._page || null;
  }
  serviceWorker() {
    return this._initializer.serviceWorker ? import_worker.Worker.from(this._initializer.serviceWorker) : null;
  }
  isNavigationRequest() {
    return this._initializer.isNavigationRequest;
  }
  redirectedFrom() {
    return this._redirectedFrom;
  }
  redirectedTo() {
    return this._redirectedTo;
  }
  failure() {
    if (this._failureText === null)
      return null;
    return {
      errorText: this._failureText
    };
  }
  timing() {
    return this._timing;
  }
  async sizes() {
    const response = await this.response();
    if (!response)
      throw new Error("Unable to fetch sizes for failed request");
    return (await response._channel.sizes()).sizes;
  }
  _setResponseEndTiming(responseEndTiming) {
    this._timing.responseEnd = responseEndTiming;
    if (this._timing.responseStart === -1)
      this._timing.responseStart = responseEndTiming;
  }
  _finalRequest() {
    return this._redirectedTo ? this._redirectedTo._finalRequest() : this;
  }
  _applyFallbackOverrides(overrides) {
    if (overrides.url)
      this._fallbackOverrides.url = overrides.url;
    if (overrides.method)
      this._fallbackOverrides.method = overrides.method;
    if (overrides.headers)
      this._fallbackOverrides.headers = overrides.headers;
    if ((0, import_rtti.isString)(overrides.postData))
      this._fallbackOverrides.postDataBuffer = Buffer.from(overrides.postData, "utf-8");
    else if (overrides.postData instanceof Buffer)
      this._fallbackOverrides.postDataBuffer = overrides.postData;
    else if (overrides.postData)
      this._fallbackOverrides.postDataBuffer = Buffer.from(JSON.stringify(overrides.postData), "utf-8");
  }
  _fallbackOverridesForContinue() {
    return this._fallbackOverrides;
  }
  _targetClosedScope() {
    return this.serviceWorker()?._closedScope || this._safePage()?._closedOrCrashedScope || new import_manualPromise.LongStandingScope();
  }
}
class Route extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._handlingPromise = null;
    this._didThrow = false;
  }
  static from(route) {
    return route._object;
  }
  request() {
    return Request.from(this._initializer.request);
  }
  async _raceWithTargetClose(promise) {
    return await this.request()._targetClosedScope().safeRace(promise);
  }
  async _startHandling() {
    this._handlingPromise = new import_manualPromise.ManualPromise();
    return await this._handlingPromise;
  }
  async fallback(options = {}) {
    this._checkNotHandled();
    this.request()._applyFallbackOverrides(options);
    this._reportHandled(false);
  }
  async abort(errorCode) {
    await this._handleRoute(async () => {
      await this._raceWithTargetClose(this._channel.abort({ errorCode }));
    });
  }
  async _redirectNavigationRequest(url) {
    await this._handleRoute(async () => {
      await this._raceWithTargetClose(this._channel.redirectNavigationRequest({ url }));
    });
  }
  async fetch(options = {}) {
    return await this._wrapApiCall(async () => {
      return await this._context.request._innerFetch({ request: this.request(), data: options.postData, ...options });
    });
  }
  async fulfill(options = {}) {
    await this._handleRoute(async () => {
      await this._innerFulfill(options);
    });
  }
  async _handleRoute(callback) {
    this._checkNotHandled();
    try {
      await callback();
      this._reportHandled(true);
    } catch (e) {
      this._didThrow = true;
      throw e;
    }
  }
  async _innerFulfill(options = {}) {
    let fetchResponseUid;
    let { status: statusOption, headers: headersOption, body } = options;
    if (options.json !== void 0) {
      (0, import_assert.assert)(options.body === void 0, "Can specify either body or json parameters");
      body = JSON.stringify(options.json);
    }
    if (options.response instanceof import_fetch.APIResponse) {
      statusOption ??= options.response.status();
      headersOption ??= options.response.headers();
      if (body === void 0 && options.path === void 0) {
        if (options.response._request._connection === this._connection)
          fetchResponseUid = options.response._fetchUid();
        else
          body = await options.response.body();
      }
    }
    let isBase64 = false;
    let length = 0;
    if (options.path) {
      const buffer = await this._platform.fs().promises.readFile(options.path);
      body = buffer.toString("base64");
      isBase64 = true;
      length = buffer.length;
    } else if ((0, import_rtti.isString)(body)) {
      isBase64 = false;
      length = Buffer.byteLength(body);
    } else if (body) {
      length = body.length;
      body = body.toString("base64");
      isBase64 = true;
    }
    const headers = {};
    for (const header of Object.keys(headersOption || {}))
      headers[header.toLowerCase()] = String(headersOption[header]);
    if (options.contentType)
      headers["content-type"] = String(options.contentType);
    else if (options.json)
      headers["content-type"] = "application/json";
    else if (options.path)
      headers["content-type"] = (0, import_mimeType.getMimeTypeForPath)(options.path) || "application/octet-stream";
    if (length && !("content-length" in headers))
      headers["content-length"] = String(length);
    await this._raceWithTargetClose(this._channel.fulfill({
      status: statusOption || 200,
      headers: (0, import_headers.headersObjectToArray)(headers),
      body,
      isBase64,
      fetchResponseUid
    }));
  }
  async continue(options = {}) {
    await this._handleRoute(async () => {
      this.request()._applyFallbackOverrides(options);
      await this._innerContinue(
        false
        /* isFallback */
      );
    });
  }
  _checkNotHandled() {
    if (!this._handlingPromise)
      throw new Error("Route is already handled!");
  }
  _reportHandled(done) {
    const chain = this._handlingPromise;
    this._handlingPromise = null;
    chain.resolve(done);
  }
  async _innerContinue(isFallback) {
    const options = this.request()._fallbackOverridesForContinue();
    return await this._raceWithTargetClose(this._channel.continue({
      url: options.url,
      method: options.method,
      headers: options.headers ? (0, import_headers.headersObjectToArray)(options.headers) : void 0,
      postData: options.postDataBuffer,
      isFallback
    }));
  }
}
class WebSocketRoute extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._connected = false;
    this._server = {
      onMessage: (handler) => {
        this._onServerMessage = handler;
      },
      onClose: (handler) => {
        this._onServerClose = handler;
      },
      connectToServer: () => {
        throw new Error(`connectToServer must be called on the page-side WebSocketRoute`);
      },
      url: () => {
        return this._initializer.url;
      },
      close: async (options = {}) => {
        await this._channel.closeServer({ ...options, wasClean: true }).catch(() => {
        });
      },
      send: (message) => {
        if ((0, import_rtti.isString)(message))
          this._channel.sendToServer({ message, isBase64: false }).catch(() => {
          });
        else
          this._channel.sendToServer({ message: message.toString("base64"), isBase64: true }).catch(() => {
          });
      },
      async [Symbol.asyncDispose]() {
        await this.close();
      }
    };
    this._channel.on("messageFromPage", ({ message, isBase64 }) => {
      if (this._onPageMessage)
        this._onPageMessage(isBase64 ? Buffer.from(message, "base64") : message);
      else if (this._connected)
        this._channel.sendToServer({ message, isBase64 }).catch(() => {
        });
    });
    this._channel.on("messageFromServer", ({ message, isBase64 }) => {
      if (this._onServerMessage)
        this._onServerMessage(isBase64 ? Buffer.from(message, "base64") : message);
      else
        this._channel.sendToPage({ message, isBase64 }).catch(() => {
        });
    });
    this._channel.on("closePage", ({ code, reason, wasClean }) => {
      if (this._onPageClose)
        this._onPageClose(code, reason);
      else
        this._channel.closeServer({ code, reason, wasClean }).catch(() => {
        });
    });
    this._channel.on("closeServer", ({ code, reason, wasClean }) => {
      if (this._onServerClose)
        this._onServerClose(code, reason);
      else
        this._channel.closePage({ code, reason, wasClean }).catch(() => {
        });
    });
  }
  static from(route) {
    return route._object;
  }
  url() {
    return this._initializer.url;
  }
  async close(options = {}) {
    await this._channel.closePage({ ...options, wasClean: true }).catch(() => {
    });
  }
  connectToServer() {
    if (this._connected)
      throw new Error("Already connected to the server");
    this._connected = true;
    this._channel.connect().catch(() => {
    });
    return this._server;
  }
  send(message) {
    if ((0, import_rtti.isString)(message))
      this._channel.sendToPage({ message, isBase64: false }).catch(() => {
      });
    else
      this._channel.sendToPage({ message: message.toString("base64"), isBase64: true }).catch(() => {
      });
  }
  onMessage(handler) {
    this._onPageMessage = handler;
  }
  onClose(handler) {
    this._onPageClose = handler;
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  async _afterHandle() {
    if (this._connected)
      return;
    await this._channel.ensureOpened().catch(() => {
    });
  }
}
class WebSocketRouteHandler {
  constructor(baseURL, url, handler) {
    this._baseURL = baseURL;
    this.url = url;
    this.handler = handler;
  }
  static prepareInterceptionPatterns(handlers) {
    const patterns = [];
    let all = false;
    for (const handler of handlers) {
      if ((0, import_rtti.isString)(handler.url))
        patterns.push({ glob: handler.url });
      else if ((0, import_rtti.isRegExp)(handler.url))
        patterns.push({ regexSource: handler.url.source, regexFlags: handler.url.flags });
      else
        all = true;
    }
    if (all)
      return [{ glob: "**/*" }];
    return patterns;
  }
  matches(wsURL) {
    return (0, import_urlMatch.urlMatches)(this._baseURL, wsURL, this.url, true);
  }
  async handle(webSocketRoute) {
    const handler = this.handler;
    await handler(webSocketRoute);
    await webSocketRoute._afterHandle();
  }
}
class Response extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._finishedPromise = new import_manualPromise.ManualPromise();
    this._provisionalHeaders = new RawHeaders(initializer.headers);
    this._request = Request.from(this._initializer.request);
    Object.assign(this._request._timing, this._initializer.timing);
  }
  static from(response) {
    return response._object;
  }
  static fromNullable(response) {
    return response ? Response.from(response) : null;
  }
  url() {
    return this._initializer.url;
  }
  ok() {
    return this._initializer.status === 0 || this._initializer.status >= 200 && this._initializer.status <= 299;
  }
  status() {
    return this._initializer.status;
  }
  statusText() {
    return this._initializer.statusText;
  }
  fromServiceWorker() {
    return this._initializer.fromServiceWorker;
  }
  /**
   * @deprecated
   */
  headers() {
    return this._provisionalHeaders.headers();
  }
  async _actualHeaders() {
    if (!this._actualHeadersPromise) {
      this._actualHeadersPromise = (async () => {
        return new RawHeaders((await this._channel.rawResponseHeaders()).headers);
      })();
    }
    return await this._actualHeadersPromise;
  }
  async allHeaders() {
    return (await this._actualHeaders()).headers();
  }
  async headersArray() {
    return (await this._actualHeaders()).headersArray().slice();
  }
  async headerValue(name) {
    return (await this._actualHeaders()).get(name);
  }
  async headerValues(name) {
    return (await this._actualHeaders()).getAll(name);
  }
  async finished() {
    return await this.request()._targetClosedScope().race(this._finishedPromise);
  }
  async body() {
    return (await this._channel.body()).binary;
  }
  async text() {
    const content = await this.body();
    return content.toString("utf8");
  }
  async json() {
    const content = await this.text();
    return JSON.parse(content);
  }
  request() {
    return this._request;
  }
  frame() {
    return this._request.frame();
  }
  async serverAddr() {
    return (await this._channel.serverAddr()).value || null;
  }
  async securityDetails() {
    return (await this._channel.securityDetails()).value || null;
  }
}
class WebSocket extends import_channelOwner.ChannelOwner {
  static from(webSocket) {
    return webSocket._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._isClosed = false;
    this._page = parent;
    this._channel.on("frameSent", (event) => {
      if (event.opcode === 1)
        this.emit(import_events.Events.WebSocket.FrameSent, { payload: event.data });
      else if (event.opcode === 2)
        this.emit(import_events.Events.WebSocket.FrameSent, { payload: Buffer.from(event.data, "base64") });
    });
    this._channel.on("frameReceived", (event) => {
      if (event.opcode === 1)
        this.emit(import_events.Events.WebSocket.FrameReceived, { payload: event.data });
      else if (event.opcode === 2)
        this.emit(import_events.Events.WebSocket.FrameReceived, { payload: Buffer.from(event.data, "base64") });
    });
    this._channel.on("socketError", ({ error }) => this.emit(import_events.Events.WebSocket.Error, error));
    this._channel.on("close", () => {
      this._isClosed = true;
      this.emit(import_events.Events.WebSocket.Close, this);
    });
  }
  url() {
    return this._initializer.url;
  }
  isClosed() {
    return this._isClosed;
  }
  async waitForEvent(event, optionsOrPredicate = {}) {
    return await this._wrapApiCall(async () => {
      const timeout = this._page._timeoutSettings.timeout(typeof optionsOrPredicate === "function" ? {} : optionsOrPredicate);
      const predicate = typeof optionsOrPredicate === "function" ? optionsOrPredicate : optionsOrPredicate.predicate;
      const waiter = import_waiter.Waiter.createForEvent(this, event);
      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== import_events.Events.WebSocket.Error)
        waiter.rejectOnEvent(this, import_events.Events.WebSocket.Error, new Error("Socket error"));
      if (event !== import_events.Events.WebSocket.Close)
        waiter.rejectOnEvent(this, import_events.Events.WebSocket.Close, new Error("Socket closed"));
      waiter.rejectOnEvent(this._page, import_events.Events.Page.Close, () => this._page._closeErrorWithReason());
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }
}
function validateHeaders(headers) {
  for (const key of Object.keys(headers)) {
    const value = headers[key];
    if (!Object.is(value, void 0) && !(0, import_rtti.isString)(value))
      throw new Error(`Expected value of header "${key}" to be String, but "${typeof value}" is found.`);
  }
}
class RouteHandler {
  constructor(platform, baseURL, url, handler, times = Number.MAX_SAFE_INTEGER) {
    this.handledCount = 0;
    this._ignoreException = false;
    this._activeInvocations = /* @__PURE__ */ new Set();
    this._baseURL = baseURL;
    this._times = times;
    this.url = url;
    this.handler = handler;
    this._savedZone = platform.zones.current().pop();
  }
  static prepareInterceptionPatterns(handlers) {
    const patterns = [];
    let all = false;
    for (const handler of handlers) {
      if ((0, import_rtti.isString)(handler.url))
        patterns.push({ glob: handler.url });
      else if ((0, import_rtti.isRegExp)(handler.url))
        patterns.push({ regexSource: handler.url.source, regexFlags: handler.url.flags });
      else
        all = true;
    }
    if (all)
      return [{ glob: "**/*" }];
    return patterns;
  }
  matches(requestURL) {
    return (0, import_urlMatch.urlMatches)(this._baseURL, requestURL, this.url);
  }
  async handle(route) {
    return await this._savedZone.run(async () => this._handleImpl(route));
  }
  async _handleImpl(route) {
    const handlerInvocation = { complete: new import_manualPromise.ManualPromise(), route };
    this._activeInvocations.add(handlerInvocation);
    try {
      return await this._handleInternal(route);
    } catch (e) {
      if (this._ignoreException)
        return false;
      if ((0, import_errors.isTargetClosedError)(e)) {
        (0, import_stackTrace.rewriteErrorMessage)(e, `"${e.message}" while running route callback.
Consider awaiting \`await page.unrouteAll({ behavior: 'ignoreErrors' })\`
before the end of the test to ignore remaining routes in flight.`);
      }
      throw e;
    } finally {
      handlerInvocation.complete.resolve();
      this._activeInvocations.delete(handlerInvocation);
    }
  }
  async stop(behavior) {
    if (behavior === "ignoreErrors") {
      this._ignoreException = true;
    } else {
      const promises = [];
      for (const activation of this._activeInvocations) {
        if (!activation.route._didThrow)
          promises.push(activation.complete);
      }
      await Promise.all(promises);
    }
  }
  async _handleInternal(route) {
    ++this.handledCount;
    const handledPromise = route._startHandling();
    const handler = this.handler;
    const [handled] = await Promise.all([
      handledPromise,
      handler(route, route.request())
    ]);
    return handled;
  }
  willExpire() {
    return this.handledCount + 1 >= this._times;
  }
}
class RawHeaders {
  constructor(headers) {
    this._headersMap = new import_multimap.MultiMap();
    this._headersArray = headers;
    for (const header of headers)
      this._headersMap.set(header.name.toLowerCase(), header.value);
  }
  static _fromHeadersObjectLossy(headers) {
    const headersArray = Object.entries(headers).map(([name, value]) => ({
      name,
      value
    })).filter((header) => header.value !== void 0);
    return new RawHeaders(headersArray);
  }
  get(name) {
    const values = this.getAll(name);
    if (!values || !values.length)
      return null;
    return values.join(name.toLowerCase() === "set-cookie" ? "\n" : ", ");
  }
  getAll(name) {
    return [...this._headersMap.get(name.toLowerCase())];
  }
  headers() {
    const result = {};
    for (const name of this._headersMap.keys())
      result[name] = this.get(name);
    return result;
  }
  headersArray() {
    return this._headersArray;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RawHeaders,
  Request,
  Response,
  Route,
  RouteHandler,
  WebSocket,
  WebSocketRoute,
  WebSocketRouteHandler,
  validateHeaders
});
