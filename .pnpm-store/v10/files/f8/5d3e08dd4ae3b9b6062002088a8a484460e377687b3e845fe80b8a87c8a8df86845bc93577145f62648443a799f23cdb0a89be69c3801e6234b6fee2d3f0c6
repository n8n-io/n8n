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
var crNetworkManager_exports = {};
__export(crNetworkManager_exports, {
  CRNetworkManager: () => CRNetworkManager
});
module.exports = __toCommonJS(crNetworkManager_exports);
var import_utils = require("../../utils");
var import_eventsHelper = require("../utils/eventsHelper");
var import_helper = require("../helper");
var network = __toESM(require("../network"));
var import_protocolError = require("../protocolError");
class CRNetworkManager {
  constructor(page, serviceWorker) {
    this._requestIdToRequest = /* @__PURE__ */ new Map();
    this._requestIdToRequestWillBeSentEvent = /* @__PURE__ */ new Map();
    this._credentials = null;
    this._attemptedAuthentications = /* @__PURE__ */ new Set();
    this._userRequestInterceptionEnabled = false;
    this._protocolRequestInterceptionEnabled = false;
    this._offline = false;
    this._extraHTTPHeaders = [];
    this._requestIdToRequestPausedEvent = /* @__PURE__ */ new Map();
    this._responseExtraInfoTracker = new ResponseExtraInfoTracker();
    this._sessions = /* @__PURE__ */ new Map();
    this._page = page;
    this._serviceWorker = serviceWorker;
  }
  async addSession(session, workerFrame, isMain) {
    const sessionInfo = { session, isMain, workerFrame, eventListeners: [] };
    sessionInfo.eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(session, "Fetch.requestPaused", this._onRequestPaused.bind(this, sessionInfo)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Fetch.authRequired", this._onAuthRequired.bind(this, sessionInfo)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestWillBeSent", this._onRequestWillBeSent.bind(this, sessionInfo)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestWillBeSentExtraInfo", this._onRequestWillBeSentExtraInfo.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestServedFromCache", this._onRequestServedFromCache.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.responseReceived", this._onResponseReceived.bind(this, sessionInfo)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.responseReceivedExtraInfo", this._onResponseReceivedExtraInfo.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.loadingFinished", this._onLoadingFinished.bind(this, sessionInfo)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.loadingFailed", this._onLoadingFailed.bind(this, sessionInfo))
    ];
    if (this._page) {
      sessionInfo.eventListeners.push(...[
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketCreated", (e) => this._page.frameManager.onWebSocketCreated(e.requestId, e.url)),
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketWillSendHandshakeRequest", (e) => this._page.frameManager.onWebSocketRequest(e.requestId)),
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketHandshakeResponseReceived", (e) => this._page.frameManager.onWebSocketResponse(e.requestId, e.response.status, e.response.statusText)),
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketFrameSent", (e) => e.response.payloadData && this._page.frameManager.onWebSocketFrameSent(e.requestId, e.response.opcode, e.response.payloadData)),
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketFrameReceived", (e) => e.response.payloadData && this._page.frameManager.webSocketFrameReceived(e.requestId, e.response.opcode, e.response.payloadData)),
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketClosed", (e) => this._page.frameManager.webSocketClosed(e.requestId)),
        import_eventsHelper.eventsHelper.addEventListener(session, "Network.webSocketFrameError", (e) => this._page.frameManager.webSocketError(e.requestId, e.errorMessage))
      ]);
    }
    this._sessions.set(session, sessionInfo);
    await Promise.all([
      session.send("Network.enable"),
      this._updateProtocolRequestInterceptionForSession(
        sessionInfo,
        true
        /* initial */
      ),
      this._setOfflineForSession(
        sessionInfo,
        true
        /* initial */
      ),
      this._setExtraHTTPHeadersForSession(
        sessionInfo,
        true
        /* initial */
      )
    ]);
  }
  removeSession(session) {
    const info = this._sessions.get(session);
    if (info)
      import_eventsHelper.eventsHelper.removeEventListeners(info.eventListeners);
    this._sessions.delete(session);
  }
  async _forEachSession(cb) {
    await Promise.all([...this._sessions.values()].map((info) => {
      if (info.isMain)
        return cb(info);
      return cb(info).catch((e) => {
        if ((0, import_protocolError.isSessionClosedError)(e))
          return;
        throw e;
      });
    }));
  }
  async authenticate(credentials) {
    this._credentials = credentials;
    await this._updateProtocolRequestInterception();
  }
  async setOffline(offline) {
    if (offline === this._offline)
      return;
    this._offline = offline;
    await this._forEachSession((info) => this._setOfflineForSession(info));
  }
  async _setOfflineForSession(info, initial) {
    if (initial && !this._offline)
      return;
    if (info.workerFrame)
      return;
    await info.session.send("Network.emulateNetworkConditions", {
      offline: this._offline,
      // values of 0 remove any active throttling. crbug.com/456324#c9
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    });
  }
  async setRequestInterception(value) {
    this._userRequestInterceptionEnabled = value;
    await this._updateProtocolRequestInterception();
  }
  async _updateProtocolRequestInterception() {
    const enabled = this._userRequestInterceptionEnabled || !!this._credentials;
    if (enabled === this._protocolRequestInterceptionEnabled)
      return;
    this._protocolRequestInterceptionEnabled = enabled;
    await this._forEachSession((info) => this._updateProtocolRequestInterceptionForSession(info));
  }
  async _updateProtocolRequestInterceptionForSession(info, initial) {
    const enabled = this._protocolRequestInterceptionEnabled;
    if (initial && !enabled)
      return;
    const cachePromise = info.session.send("Network.setCacheDisabled", { cacheDisabled: enabled });
    let fetchPromise = Promise.resolve(void 0);
    if (!info.workerFrame) {
      if (enabled)
        fetchPromise = info.session.send("Fetch.enable", { handleAuthRequests: true, patterns: [{ urlPattern: "*", requestStage: "Request" }] });
      else
        fetchPromise = info.session.send("Fetch.disable");
    }
    await Promise.all([cachePromise, fetchPromise]);
  }
  async setExtraHTTPHeaders(extraHTTPHeaders) {
    if (!this._extraHTTPHeaders.length && !extraHTTPHeaders.length)
      return;
    this._extraHTTPHeaders = extraHTTPHeaders;
    await this._forEachSession((info) => this._setExtraHTTPHeadersForSession(info));
  }
  async _setExtraHTTPHeadersForSession(info, initial) {
    if (initial && !this._extraHTTPHeaders.length)
      return;
    await info.session.send("Network.setExtraHTTPHeaders", { headers: (0, import_utils.headersArrayToObject)(
      this._extraHTTPHeaders,
      false
      /* lowerCase */
    ) });
  }
  async clearCache() {
    await this._forEachSession(async (info) => {
      await info.session.send("Network.setCacheDisabled", { cacheDisabled: true });
      if (!this._protocolRequestInterceptionEnabled)
        await info.session.send("Network.setCacheDisabled", { cacheDisabled: false });
      if (!info.workerFrame)
        await info.session.send("Network.clearBrowserCache");
    });
  }
  _onRequestWillBeSent(sessionInfo, event) {
    if (this._protocolRequestInterceptionEnabled && !event.request.url.startsWith("data:")) {
      const requestId = event.requestId;
      const requestPausedEvent = this._requestIdToRequestPausedEvent.get(requestId);
      if (requestPausedEvent) {
        this._onRequest(sessionInfo, event, requestPausedEvent.sessionInfo, requestPausedEvent.event);
        this._requestIdToRequestPausedEvent.delete(requestId);
      } else {
        this._requestIdToRequestWillBeSentEvent.set(event.requestId, { sessionInfo, event });
      }
    } else {
      this._onRequest(sessionInfo, event, void 0, void 0);
    }
  }
  _onRequestServedFromCache(event) {
    this._responseExtraInfoTracker.requestServedFromCache(event);
  }
  _onRequestWillBeSentExtraInfo(event) {
    this._responseExtraInfoTracker.requestWillBeSentExtraInfo(event);
  }
  _onAuthRequired(sessionInfo, event) {
    let response = "Default";
    const shouldProvideCredentials = this._shouldProvideCredentials(event.request.url);
    if (this._attemptedAuthentications.has(event.requestId)) {
      response = "CancelAuth";
    } else if (shouldProvideCredentials) {
      response = "ProvideCredentials";
      this._attemptedAuthentications.add(event.requestId);
    }
    const { username, password } = shouldProvideCredentials && this._credentials ? this._credentials : { username: void 0, password: void 0 };
    sessionInfo.session._sendMayFail("Fetch.continueWithAuth", {
      requestId: event.requestId,
      authChallengeResponse: { response, username, password }
    });
  }
  _shouldProvideCredentials(url) {
    if (!this._credentials)
      return false;
    return !this._credentials.origin || new URL(url).origin.toLowerCase() === this._credentials.origin.toLowerCase();
  }
  _onRequestPaused(sessionInfo, event) {
    if (!event.networkId) {
      sessionInfo.session._sendMayFail("Fetch.continueRequest", { requestId: event.requestId });
      return;
    }
    if (event.request.url.startsWith("data:"))
      return;
    const requestId = event.networkId;
    const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(requestId);
    if (requestWillBeSentEvent) {
      this._onRequest(requestWillBeSentEvent.sessionInfo, requestWillBeSentEvent.event, sessionInfo, event);
      this._requestIdToRequestWillBeSentEvent.delete(requestId);
    } else {
      const existingRequest = this._requestIdToRequest.get(requestId);
      const alreadyContinuedParams = existingRequest?._route?._alreadyContinuedParams;
      if (alreadyContinuedParams && !event.redirectedRequestId) {
        sessionInfo.session._sendMayFail("Fetch.continueRequest", {
          ...alreadyContinuedParams,
          requestId: event.requestId
        });
        return;
      }
      this._requestIdToRequestPausedEvent.set(requestId, { sessionInfo, event });
    }
  }
  _onRequest(requestWillBeSentSessionInfo, requestWillBeSentEvent, requestPausedSessionInfo, requestPausedEvent) {
    if (requestWillBeSentEvent.request.url.startsWith("data:"))
      return;
    let redirectedFrom = null;
    if (requestWillBeSentEvent.redirectResponse) {
      const request2 = this._requestIdToRequest.get(requestWillBeSentEvent.requestId);
      if (request2) {
        this._handleRequestRedirect(request2, requestWillBeSentEvent.redirectResponse, requestWillBeSentEvent.timestamp, requestWillBeSentEvent.redirectHasExtraInfo);
        redirectedFrom = request2;
      }
    }
    let frame = requestWillBeSentEvent.frameId ? this._page?.frameManager.frame(requestWillBeSentEvent.frameId) : requestWillBeSentSessionInfo.workerFrame;
    if (!frame && this._page && requestPausedEvent && requestPausedEvent.frameId)
      frame = this._page.frameManager.frame(requestPausedEvent.frameId);
    if (!frame && this._page && requestWillBeSentEvent.frameId === (this._page?.delegate)._targetId) {
      frame = this._page.frameManager.frameAttached(requestWillBeSentEvent.frameId, null);
    }
    const isInterceptedOptionsPreflight = !!requestPausedEvent && requestPausedEvent.request.method === "OPTIONS" && requestWillBeSentEvent.initiator.type === "preflight";
    if (isInterceptedOptionsPreflight && (this._page || this._serviceWorker).needsRequestInterception()) {
      const requestHeaders = requestPausedEvent.request.headers;
      const responseHeaders = [
        { name: "Access-Control-Allow-Origin", value: requestHeaders["Origin"] || "*" },
        { name: "Access-Control-Allow-Methods", value: requestHeaders["Access-Control-Request-Method"] || "GET, POST, OPTIONS, DELETE" },
        { name: "Access-Control-Allow-Credentials", value: "true" }
      ];
      if (requestHeaders["Access-Control-Request-Headers"])
        responseHeaders.push({ name: "Access-Control-Allow-Headers", value: requestHeaders["Access-Control-Request-Headers"] });
      requestPausedSessionInfo.session._sendMayFail("Fetch.fulfillRequest", {
        requestId: requestPausedEvent.requestId,
        responseCode: 204,
        responsePhrase: network.statusText(204),
        responseHeaders,
        body: ""
      });
      return;
    }
    if (!frame && !this._serviceWorker) {
      if (requestPausedEvent)
        requestPausedSessionInfo.session._sendMayFail("Fetch.continueRequest", { requestId: requestPausedEvent.requestId });
      return;
    }
    let route = null;
    let headersOverride;
    if (requestPausedEvent) {
      if (redirectedFrom || !this._userRequestInterceptionEnabled && this._protocolRequestInterceptionEnabled) {
        headersOverride = redirectedFrom?._originalRequestRoute?._alreadyContinuedParams?.headers;
        if (headersOverride) {
          const originalHeaders = Object.entries(requestPausedEvent.request.headers).map(([name, value]) => ({ name, value }));
          headersOverride = network.applyHeadersOverrides(originalHeaders, headersOverride);
        }
        requestPausedSessionInfo.session._sendMayFail("Fetch.continueRequest", { requestId: requestPausedEvent.requestId, headers: headersOverride });
      } else {
        route = new RouteImpl(requestPausedSessionInfo.session, requestPausedEvent.requestId);
      }
    }
    const isNavigationRequest = requestWillBeSentEvent.requestId === requestWillBeSentEvent.loaderId && requestWillBeSentEvent.type === "Document";
    const documentId = isNavigationRequest ? requestWillBeSentEvent.loaderId : void 0;
    const request = new InterceptableRequest({
      session: requestWillBeSentSessionInfo.session,
      context: (this._page || this._serviceWorker).browserContext,
      frame: frame || null,
      serviceWorker: this._serviceWorker || null,
      documentId,
      route,
      requestWillBeSentEvent,
      requestPausedEvent,
      redirectedFrom,
      headersOverride: headersOverride || null
    });
    this._requestIdToRequest.set(requestWillBeSentEvent.requestId, request);
    if (route) {
      request.request.setRawRequestHeaders((0, import_utils.headersObjectToArray)(requestPausedEvent.request.headers, "\n"));
    }
    (this._page?.frameManager || this._serviceWorker).requestStarted(request.request, route || void 0);
  }
  _createResponse(request, responsePayload, hasExtraInfo) {
    const getResponseBody = async () => {
      const contentLengthHeader = Object.entries(responsePayload.headers).find((header) => header[0].toLowerCase() === "content-length");
      const expectedLength = contentLengthHeader ? +contentLengthHeader[1] : void 0;
      const session = request.session;
      const response2 = await session.send("Network.getResponseBody", { requestId: request._requestId });
      if (response2.body || !expectedLength)
        return Buffer.from(response2.body, response2.base64Encoded ? "base64" : "utf8");
      if (request._route?._fulfilled)
        return Buffer.from("");
      const resource = await session.send("Network.loadNetworkResource", { url: request.request.url(), frameId: this._serviceWorker ? void 0 : request.request.frame()._id, options: { disableCache: false, includeCredentials: true } });
      const chunks = [];
      while (resource.resource.stream) {
        const chunk = await session.send("IO.read", { handle: resource.resource.stream });
        chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf-8"));
        if (chunk.eof) {
          await session.send("IO.close", { handle: resource.resource.stream });
          break;
        }
      }
      return Buffer.concat(chunks);
    };
    const timingPayload = responsePayload.timing;
    let timing;
    if (timingPayload && !this._responseExtraInfoTracker.servedFromCache(request._requestId)) {
      timing = {
        startTime: (timingPayload.requestTime - request._timestamp + request._wallTime) * 1e3,
        domainLookupStart: timingPayload.dnsStart,
        domainLookupEnd: timingPayload.dnsEnd,
        connectStart: timingPayload.connectStart,
        secureConnectionStart: timingPayload.sslStart,
        connectEnd: timingPayload.connectEnd,
        requestStart: timingPayload.sendStart,
        responseStart: timingPayload.receiveHeadersEnd
      };
    } else {
      timing = {
        startTime: request._wallTime * 1e3,
        domainLookupStart: -1,
        domainLookupEnd: -1,
        connectStart: -1,
        secureConnectionStart: -1,
        connectEnd: -1,
        requestStart: -1,
        responseStart: -1
      };
    }
    const response = new network.Response(request.request, responsePayload.status, responsePayload.statusText, (0, import_utils.headersObjectToArray)(responsePayload.headers), timing, getResponseBody, !!responsePayload.fromServiceWorker, responsePayload.protocol);
    if (responsePayload?.remoteIPAddress && typeof responsePayload?.remotePort === "number") {
      response._serverAddrFinished({
        ipAddress: responsePayload.remoteIPAddress,
        port: responsePayload.remotePort
      });
    } else {
      response._serverAddrFinished();
    }
    response._securityDetailsFinished({
      protocol: responsePayload?.securityDetails?.protocol,
      subjectName: responsePayload?.securityDetails?.subjectName,
      issuer: responsePayload?.securityDetails?.issuer,
      validFrom: responsePayload?.securityDetails?.validFrom,
      validTo: responsePayload?.securityDetails?.validTo
    });
    this._responseExtraInfoTracker.processResponse(request._requestId, response, hasExtraInfo);
    return response;
  }
  _deleteRequest(request) {
    this._requestIdToRequest.delete(request._requestId);
    if (request._interceptionId)
      this._attemptedAuthentications.delete(request._interceptionId);
  }
  _handleRequestRedirect(request, responsePayload, timestamp, hasExtraInfo) {
    const response = this._createResponse(request, responsePayload, hasExtraInfo);
    response.setTransferSize(null);
    response.setEncodedBodySize(null);
    response._requestFinished((timestamp - request._timestamp) * 1e3);
    this._deleteRequest(request);
    (this._page?.frameManager || this._serviceWorker).requestReceivedResponse(response);
    (this._page?.frameManager || this._serviceWorker).reportRequestFinished(request.request, response);
  }
  _onResponseReceivedExtraInfo(event) {
    this._responseExtraInfoTracker.responseReceivedExtraInfo(event);
  }
  _onResponseReceived(sessionInfo, event) {
    let request = this._requestIdToRequest.get(event.requestId);
    if (!request && event.response.fromServiceWorker) {
      const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(event.requestId);
      if (requestWillBeSentEvent) {
        this._requestIdToRequestWillBeSentEvent.delete(event.requestId);
        this._onRequest(sessionInfo, requestWillBeSentEvent.event, void 0, void 0);
        request = this._requestIdToRequest.get(event.requestId);
      }
    }
    if (!request)
      return;
    const response = this._createResponse(request, event.response, event.hasExtraInfo);
    (this._page?.frameManager || this._serviceWorker).requestReceivedResponse(response);
  }
  _onLoadingFinished(sessionInfo, event) {
    this._responseExtraInfoTracker.loadingFinished(event);
    const request = this._requestIdToRequest.get(event.requestId);
    if (!request)
      return;
    this._maybeUpdateRequestSession(sessionInfo, request);
    const response = request.request._existingResponse();
    if (response) {
      response.setTransferSize(event.encodedDataLength);
      response.responseHeadersSize().then((size) => response.setEncodedBodySize(event.encodedDataLength - size));
      response._requestFinished(import_helper.helper.secondsToRoundishMillis(event.timestamp - request._timestamp));
    }
    this._deleteRequest(request);
    (this._page?.frameManager || this._serviceWorker).reportRequestFinished(request.request, response);
  }
  _onLoadingFailed(sessionInfo, event) {
    this._responseExtraInfoTracker.loadingFailed(event);
    let request = this._requestIdToRequest.get(event.requestId);
    if (!request) {
      const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(event.requestId);
      if (requestWillBeSentEvent) {
        this._requestIdToRequestWillBeSentEvent.delete(event.requestId);
        this._onRequest(sessionInfo, requestWillBeSentEvent.event, void 0, void 0);
        request = this._requestIdToRequest.get(event.requestId);
      }
    }
    if (!request)
      return;
    this._maybeUpdateRequestSession(sessionInfo, request);
    const response = request.request._existingResponse();
    if (response) {
      response.setTransferSize(null);
      response.setEncodedBodySize(null);
      response._requestFinished(import_helper.helper.secondsToRoundishMillis(event.timestamp - request._timestamp));
    } else {
      request.request.setRawRequestHeaders(null);
    }
    this._deleteRequest(request);
    request.request._setFailureText(event.errorText || event.blockedReason || "");
    (this._page?.frameManager || this._serviceWorker).requestFailed(request.request, !!event.canceled);
  }
  _maybeUpdateRequestSession(sessionInfo, request) {
    if (request.session !== sessionInfo.session && !sessionInfo.isMain && (request._documentId === request._requestId || sessionInfo.workerFrame))
      request.session = sessionInfo.session;
  }
}
class InterceptableRequest {
  constructor(options) {
    const { session, context, frame, documentId, route, requestWillBeSentEvent, requestPausedEvent, redirectedFrom, serviceWorker, headersOverride } = options;
    this.session = session;
    this._timestamp = requestWillBeSentEvent.timestamp;
    this._wallTime = requestWillBeSentEvent.wallTime;
    this._requestId = requestWillBeSentEvent.requestId;
    this._interceptionId = requestPausedEvent && requestPausedEvent.requestId;
    this._documentId = documentId;
    this._route = route;
    this._originalRequestRoute = route ?? redirectedFrom?._originalRequestRoute;
    const {
      headers,
      method,
      url,
      postDataEntries = null
    } = requestPausedEvent ? requestPausedEvent.request : requestWillBeSentEvent.request;
    let postDataBuffer = null;
    const entries = postDataEntries?.filter((entry) => entry.bytes);
    if (entries && entries.length)
      postDataBuffer = Buffer.concat(entries.map((entry) => Buffer.from(entry.bytes, "base64")));
    this.request = new network.Request(context, frame, serviceWorker, redirectedFrom?.request || null, documentId, url, toResourceType(requestWillBeSentEvent.type || "Other"), method, postDataBuffer, headersOverride || (0, import_utils.headersObjectToArray)(headers));
  }
}
class RouteImpl {
  constructor(session, interceptionId) {
    this._fulfilled = false;
    this._session = session;
    this._interceptionId = interceptionId;
  }
  async continue(overrides) {
    this._alreadyContinuedParams = {
      requestId: this._interceptionId,
      url: overrides.url,
      headers: overrides.headers,
      method: overrides.method,
      postData: overrides.postData ? overrides.postData.toString("base64") : void 0
    };
    await catchDisallowedErrors(async () => {
      await this._session.send("Fetch.continueRequest", this._alreadyContinuedParams);
    });
  }
  async fulfill(response) {
    this._fulfilled = true;
    const body = response.isBase64 ? response.body : Buffer.from(response.body).toString("base64");
    const responseHeaders = splitSetCookieHeader(response.headers);
    await catchDisallowedErrors(async () => {
      await this._session.send("Fetch.fulfillRequest", {
        requestId: this._interceptionId,
        responseCode: response.status,
        responsePhrase: network.statusText(response.status),
        responseHeaders,
        body
      });
    });
  }
  async abort(errorCode = "failed") {
    const errorReason = errorReasons[errorCode];
    (0, import_utils.assert)(errorReason, "Unknown error code: " + errorCode);
    await catchDisallowedErrors(async () => {
      await this._session.send("Fetch.failRequest", {
        requestId: this._interceptionId,
        errorReason
      });
    });
  }
}
async function catchDisallowedErrors(callback) {
  try {
    return await callback();
  } catch (e) {
    if ((0, import_protocolError.isProtocolError)(e) && e.message.includes("Invalid http status code or phrase"))
      throw e;
    if ((0, import_protocolError.isProtocolError)(e) && e.message.includes("Unsafe header"))
      throw e;
  }
}
function splitSetCookieHeader(headers) {
  const index = headers.findIndex(({ name }) => name.toLowerCase() === "set-cookie");
  if (index === -1)
    return headers;
  const header = headers[index];
  const values = header.value.split("\n");
  if (values.length === 1)
    return headers;
  const result = headers.slice();
  result.splice(index, 1, ...values.map((value) => ({ name: header.name, value })));
  return result;
}
const errorReasons = {
  "aborted": "Aborted",
  "accessdenied": "AccessDenied",
  "addressunreachable": "AddressUnreachable",
  "blockedbyclient": "BlockedByClient",
  "blockedbyresponse": "BlockedByResponse",
  "connectionaborted": "ConnectionAborted",
  "connectionclosed": "ConnectionClosed",
  "connectionfailed": "ConnectionFailed",
  "connectionrefused": "ConnectionRefused",
  "connectionreset": "ConnectionReset",
  "internetdisconnected": "InternetDisconnected",
  "namenotresolved": "NameNotResolved",
  "timedout": "TimedOut",
  "failed": "Failed"
};
class ResponseExtraInfoTracker {
  constructor() {
    this._requests = /* @__PURE__ */ new Map();
  }
  requestWillBeSentExtraInfo(event) {
    const info = this._getOrCreateEntry(event.requestId);
    info.requestWillBeSentExtraInfo.push(event);
    this._patchHeaders(info, info.requestWillBeSentExtraInfo.length - 1);
    this._checkFinished(info);
  }
  requestServedFromCache(event) {
    const info = this._getOrCreateEntry(event.requestId);
    info.servedFromCache = true;
  }
  servedFromCache(requestId) {
    const info = this._requests.get(requestId);
    return !!info?.servedFromCache;
  }
  responseReceivedExtraInfo(event) {
    const info = this._getOrCreateEntry(event.requestId);
    info.responseReceivedExtraInfo.push(event);
    this._patchHeaders(info, info.responseReceivedExtraInfo.length - 1);
    this._checkFinished(info);
  }
  processResponse(requestId, response, hasExtraInfo) {
    let info = this._requests.get(requestId);
    if (!hasExtraInfo || info?.servedFromCache) {
      response.request().setRawRequestHeaders(null);
      response.setResponseHeadersSize(null);
      response.setRawResponseHeaders(null);
      return;
    }
    info = this._getOrCreateEntry(requestId);
    info.responses.push(response);
    this._patchHeaders(info, info.responses.length - 1);
  }
  loadingFinished(event) {
    const info = this._requests.get(event.requestId);
    if (!info)
      return;
    info.loadingFinished = event;
    this._checkFinished(info);
  }
  loadingFailed(event) {
    const info = this._requests.get(event.requestId);
    if (!info)
      return;
    info.loadingFailed = event;
    this._checkFinished(info);
  }
  _getOrCreateEntry(requestId) {
    let info = this._requests.get(requestId);
    if (!info) {
      info = {
        requestId,
        requestWillBeSentExtraInfo: [],
        responseReceivedExtraInfo: [],
        responses: []
      };
      this._requests.set(requestId, info);
    }
    return info;
  }
  _patchHeaders(info, index) {
    const response = info.responses[index];
    const requestExtraInfo = info.requestWillBeSentExtraInfo[index];
    if (response && requestExtraInfo) {
      response.request().setRawRequestHeaders((0, import_utils.headersObjectToArray)(requestExtraInfo.headers, "\n"));
      info.requestWillBeSentExtraInfo[index] = void 0;
    }
    const responseExtraInfo = info.responseReceivedExtraInfo[index];
    if (response && responseExtraInfo) {
      response.setResponseHeadersSize(responseExtraInfo.headersText?.length || 0);
      response.setRawResponseHeaders((0, import_utils.headersObjectToArray)(responseExtraInfo.headers, "\n"));
      info.responseReceivedExtraInfo[index] = void 0;
    }
  }
  _checkFinished(info) {
    if (!info.loadingFinished && !info.loadingFailed)
      return;
    if (info.responses.length <= info.responseReceivedExtraInfo.length) {
      this._stopTracking(info.requestId);
      return;
    }
  }
  _stopTracking(requestId) {
    this._requests.delete(requestId);
  }
}
function toResourceType(type) {
  switch (type) {
    case "Document":
      return "document";
    case "Stylesheet":
      return "stylesheet";
    case "Image":
      return "image";
    case "Media":
      return "media";
    case "Font":
      return "font";
    case "Script":
      return "script";
    case "TextTrack":
      return "texttrack";
    case "XHR":
      return "xhr";
    case "Fetch":
      return "fetch";
    case "EventSource":
      return "eventsource";
    case "WebSocket":
      return "websocket";
    case "Manifest":
      return "manifest";
    case "Ping":
      return "ping";
    case "CSPViolationReport":
      return "cspreport";
    case "Prefetch":
    case "SignedExchange":
    case "Preflight":
    case "FedCM":
    default:
      return "other";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRNetworkManager
});
