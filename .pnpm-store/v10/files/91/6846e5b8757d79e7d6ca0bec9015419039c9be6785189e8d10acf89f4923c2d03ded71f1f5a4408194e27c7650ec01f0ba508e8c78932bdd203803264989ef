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
var bidiNetworkManager_exports = {};
__export(bidiNetworkManager_exports, {
  BidiNetworkManager: () => BidiNetworkManager,
  bidiBytesValueToString: () => bidiBytesValueToString
});
module.exports = __toCommonJS(bidiNetworkManager_exports);
var import_eventsHelper = require("../utils/eventsHelper");
var import_cookieStore = require("../cookieStore");
var network = __toESM(require("../network"));
var bidi = __toESM(require("./third_party/bidiProtocol"));
class BidiNetworkManager {
  constructor(bidiSession, page) {
    this._userRequestInterceptionEnabled = false;
    this._protocolRequestInterceptionEnabled = false;
    this._attemptedAuthentications = /* @__PURE__ */ new Set();
    this._session = bidiSession;
    this._requests = /* @__PURE__ */ new Map();
    this._page = page;
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(bidiSession, "network.beforeRequestSent", this._onBeforeRequestSent.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(bidiSession, "network.responseStarted", this._onResponseStarted.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(bidiSession, "network.responseCompleted", this._onResponseCompleted.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(bidiSession, "network.fetchError", this._onFetchError.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(bidiSession, "network.authRequired", this._onAuthRequired.bind(this))
    ];
  }
  dispose() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
  }
  _onBeforeRequestSent(param) {
    if (param.request.url.startsWith("data:"))
      return;
    const redirectedFrom = param.redirectCount ? this._requests.get(param.request.request) || null : null;
    const frame = redirectedFrom ? redirectedFrom.request.frame() : param.context ? this._page.frameManager.frame(param.context) : null;
    if (!frame)
      return;
    if (redirectedFrom)
      this._deleteRequest(redirectedFrom._id);
    let route;
    if (param.intercepts) {
      if (redirectedFrom) {
        let params = {};
        if (redirectedFrom._originalRequestRoute?._alreadyContinuedHeaders)
          params = toBidiRequestHeaders(redirectedFrom._originalRequestRoute._alreadyContinuedHeaders ?? []);
        this._session.sendMayFail("network.continueRequest", {
          request: param.request.request,
          ...params
        });
      } else {
        route = new BidiRouteImpl(this._session, param.request.request);
      }
    }
    const request = new BidiRequest(frame, redirectedFrom, param, route);
    this._requests.set(request._id, request);
    this._page.frameManager.requestStarted(request.request, route);
  }
  _onResponseStarted(params) {
    const request = this._requests.get(params.request.request);
    if (!request)
      return;
    const getResponseBody = async () => {
      const { bytes } = await this._session.send("network.getData", { request: params.request.request, dataType: bidi.Network.DataType.Response });
      const encoding = bytes.type === "base64" ? "base64" : "utf8";
      return Buffer.from(bytes.value, encoding);
    };
    const timings = params.request.timings;
    const startTime = timings.requestTime;
    function relativeToStart(time) {
      if (!time)
        return -1;
      return time - startTime;
    }
    const timing = {
      startTime,
      requestStart: relativeToStart(timings.requestStart),
      responseStart: relativeToStart(timings.responseStart),
      domainLookupStart: relativeToStart(timings.dnsStart),
      domainLookupEnd: relativeToStart(timings.dnsEnd),
      connectStart: relativeToStart(timings.connectStart),
      secureConnectionStart: relativeToStart(timings.tlsStart),
      connectEnd: relativeToStart(timings.connectEnd)
    };
    const response = new network.Response(request.request, params.response.status, params.response.statusText, fromBidiHeaders(params.response.headers), timing, getResponseBody, false);
    response._serverAddrFinished();
    response._securityDetailsFinished();
    response.setRawResponseHeaders(null);
    response.setResponseHeadersSize(params.response.headersSize);
    this._page.frameManager.requestReceivedResponse(response);
  }
  _onResponseCompleted(params) {
    const request = this._requests.get(params.request.request);
    if (!request)
      return;
    const response = request.request._existingResponse();
    response.setTransferSize(params.response.bodySize);
    response.setEncodedBodySize(params.response.bodySize);
    const isRedirected = response.status() >= 300 && response.status() <= 399;
    const responseEndTime = params.request.timings.responseEnd - response.timing().startTime;
    if (isRedirected) {
      response._requestFinished(responseEndTime);
    } else {
      this._deleteRequest(request._id);
      response._requestFinished(responseEndTime);
    }
    response._setHttpVersion(params.response.protocol);
    this._page.frameManager.reportRequestFinished(request.request, response);
  }
  _onFetchError(params) {
    const request = this._requests.get(params.request.request);
    if (!request)
      return;
    this._deleteRequest(request._id);
    const response = request.request._existingResponse();
    if (response) {
      response.setTransferSize(null);
      response.setEncodedBodySize(null);
      response._requestFinished(-1);
    }
    request.request._setFailureText(params.errorText);
    this._page.frameManager.requestFailed(request.request, params.errorText === "NS_BINDING_ABORTED");
  }
  _onAuthRequired(params) {
    const isBasic = params.response.authChallenges?.some((challenge) => challenge.scheme.startsWith("Basic"));
    const credentials = this._page.browserContext._options.httpCredentials;
    if (isBasic && credentials && (!credentials.origin || new URL(params.request.url).origin.toLowerCase() === credentials.origin.toLowerCase())) {
      if (this._attemptedAuthentications.has(params.request.request)) {
        this._session.sendMayFail("network.continueWithAuth", {
          request: params.request.request,
          action: "cancel"
        });
      } else {
        this._attemptedAuthentications.add(params.request.request);
        this._session.sendMayFail("network.continueWithAuth", {
          request: params.request.request,
          action: "provideCredentials",
          credentials: {
            type: "password",
            username: credentials.username,
            password: credentials.password
          }
        });
      }
    } else {
      this._session.sendMayFail("network.continueWithAuth", {
        request: params.request.request,
        action: "cancel"
      });
    }
  }
  _deleteRequest(requestId) {
    this._requests.delete(requestId);
    this._attemptedAuthentications.delete(requestId);
  }
  async setRequestInterception(value) {
    this._userRequestInterceptionEnabled = value;
    await this._updateProtocolRequestInterception();
  }
  async setCredentials(credentials) {
    this._credentials = credentials;
    await this._updateProtocolRequestInterception();
  }
  async _updateProtocolRequestInterception(initial) {
    const enabled = this._userRequestInterceptionEnabled || !!this._credentials;
    if (enabled === this._protocolRequestInterceptionEnabled)
      return;
    this._protocolRequestInterceptionEnabled = enabled;
    if (initial && !enabled)
      return;
    const cachePromise = this._session.send("network.setCacheBehavior", { cacheBehavior: enabled ? "bypass" : "default" });
    let interceptPromise = Promise.resolve(void 0);
    if (enabled) {
      interceptPromise = this._session.send("network.addIntercept", {
        phases: [bidi.Network.InterceptPhase.AuthRequired, bidi.Network.InterceptPhase.BeforeRequestSent],
        urlPatterns: [{ type: "pattern" }]
        // urlPatterns: [{ type: 'string', pattern: '*' }],
      }).then((r) => {
        this._intercepId = r.intercept;
      });
    } else if (this._intercepId) {
      interceptPromise = this._session.send("network.removeIntercept", { intercept: this._intercepId });
      this._intercepId = void 0;
    }
    await Promise.all([cachePromise, interceptPromise]);
  }
}
class BidiRequest {
  constructor(frame, redirectedFrom, payload, route) {
    this._id = payload.request.request;
    if (redirectedFrom)
      redirectedFrom._redirectedTo = this;
    const postDataBuffer = null;
    this.request = new network.Request(
      frame._page.browserContext,
      frame,
      null,
      redirectedFrom ? redirectedFrom.request : null,
      payload.navigation ?? void 0,
      payload.request.url,
      resourceTypeFromBidi(payload.request.destination, payload.request.initiatorType, payload.initiator?.type),
      payload.request.method,
      postDataBuffer,
      fromBidiHeaders(payload.request.headers)
    );
    this.request.setRawRequestHeaders(null);
    this.request._setBodySize(payload.request.bodySize || 0);
    this._originalRequestRoute = route ?? redirectedFrom?._originalRequestRoute;
    route?._setRequest(this.request);
  }
  _finalRequest() {
    let request = this;
    while (request._redirectedTo)
      request = request._redirectedTo;
    return request;
  }
}
class BidiRouteImpl {
  constructor(session, requestId) {
    this._session = session;
    this._requestId = requestId;
  }
  _setRequest(request) {
    this._request = request;
  }
  async continue(overrides) {
    let headers = overrides.headers || this._request.headers();
    if (overrides.postData && headers) {
      headers = headers.map((header) => {
        if (header.name.toLowerCase() === "content-length")
          return { name: header.name, value: overrides.postData.byteLength.toString() };
        return header;
      });
    }
    this._alreadyContinuedHeaders = headers;
    await this._session.sendMayFail("network.continueRequest", {
      request: this._requestId,
      url: overrides.url,
      method: overrides.method,
      ...toBidiRequestHeaders(this._alreadyContinuedHeaders),
      body: overrides.postData ? { type: "base64", value: Buffer.from(overrides.postData).toString("base64") } : void 0
    });
  }
  async fulfill(response) {
    const base64body = response.isBase64 ? response.body : Buffer.from(response.body).toString("base64");
    await this._session.sendMayFail("network.provideResponse", {
      request: this._requestId,
      statusCode: response.status,
      reasonPhrase: network.statusText(response.status),
      ...toBidiResponseHeaders(response.headers),
      body: { type: "base64", value: base64body }
    });
  }
  async abort(errorCode) {
    await this._session.sendMayFail("network.failRequest", {
      request: this._requestId
    });
  }
}
function fromBidiHeaders(bidiHeaders) {
  const result = [];
  for (const { name, value } of bidiHeaders)
    result.push({ name, value: bidiBytesValueToString(value) });
  return result;
}
function toBidiRequestHeaders(allHeaders) {
  const bidiHeaders = toBidiHeaders(allHeaders);
  return { headers: bidiHeaders };
}
function toBidiResponseHeaders(headers) {
  const setCookieHeaders = headers.filter((h) => h.name.toLowerCase() === "set-cookie");
  const otherHeaders = headers.filter((h) => h.name.toLowerCase() !== "set-cookie");
  const rawCookies = setCookieHeaders.map((h) => (0, import_cookieStore.parseRawCookie)(h.value));
  const cookies = rawCookies.filter(Boolean).map((c) => {
    return {
      ...c,
      value: { type: "string", value: c.value },
      sameSite: toBidiSameSite(c.sameSite)
    };
  });
  return { cookies, headers: toBidiHeaders(otherHeaders) };
}
function toBidiHeaders(headers) {
  return headers.map(({ name, value }) => ({ name, value: { type: "string", value } }));
}
function bidiBytesValueToString(value) {
  if (value.type === "string")
    return value.value;
  if (value.type === "base64")
    return Buffer.from(value.type, "base64").toString("binary");
  return "unknown value type: " + value.type;
}
function toBidiSameSite(sameSite) {
  if (!sameSite)
    return void 0;
  if (sameSite === "Strict")
    return bidi.Network.SameSite.Strict;
  if (sameSite === "Lax")
    return bidi.Network.SameSite.Lax;
  return bidi.Network.SameSite.None;
}
function resourceTypeFromBidi(requestDestination, requestInitiatorType, eventInitiatorType) {
  switch (requestDestination) {
    case "audio":
      return "media";
    case "audioworklet":
      return "script";
    case "document":
      return "document";
    case "font":
      return "font";
    case "frame":
      return "document";
    case "iframe":
      return "document";
    case "image":
      return "image";
    case "object":
      return "other";
    case "paintworklet":
      return "script";
    case "script":
      return "script";
    case "serviceworker":
      return "script";
    case "sharedworker":
      return "script";
    case "style":
      return "stylesheet";
    case "track":
      return "texttrack";
    case "video":
      return "media";
    case "worker":
      return "script";
    case "":
      switch (requestInitiatorType) {
        case "fetch":
          return "fetch";
        case "font":
          return "font";
        case "xmlhttprequest":
          return "xhr";
        case null:
          return eventInitiatorType === "script" ? "xhr" : "document";
        default:
          return "other";
      }
    default:
      return "other";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiNetworkManager,
  bidiBytesValueToString
});
