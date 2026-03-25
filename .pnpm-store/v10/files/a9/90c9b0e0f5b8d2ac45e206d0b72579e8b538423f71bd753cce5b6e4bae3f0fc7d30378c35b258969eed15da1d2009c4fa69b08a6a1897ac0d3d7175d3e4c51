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
var ffNetworkManager_exports = {};
__export(ffNetworkManager_exports, {
  FFNetworkManager: () => FFNetworkManager
});
module.exports = __toCommonJS(ffNetworkManager_exports);
var import_eventsHelper = require("../utils/eventsHelper");
var network = __toESM(require("../network"));
class FFNetworkManager {
  constructor(session, page) {
    this._session = session;
    this._requests = /* @__PURE__ */ new Map();
    this._page = page;
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestWillBeSent", this._onRequestWillBeSent.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.responseReceived", this._onResponseReceived.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestFinished", this._onRequestFinished.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestFailed", this._onRequestFailed.bind(this))
    ];
  }
  dispose() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
  }
  async setRequestInterception(enabled) {
    await Promise.all([
      this._session.send("Network.setRequestInterception", { enabled }),
      this._session.send("Page.setCacheDisabled", { cacheDisabled: enabled })
    ]);
  }
  _onRequestWillBeSent(event) {
    const redirectedFrom = event.redirectedFrom ? this._requests.get(event.redirectedFrom) || null : null;
    const frame = redirectedFrom ? redirectedFrom.request.frame() : event.frameId ? this._page.frameManager.frame(event.frameId) : null;
    if (!frame)
      return;
    if (event.method === "OPTIONS" && !event.isIntercepted)
      return;
    if (redirectedFrom)
      this._requests.delete(redirectedFrom._id);
    const request = new InterceptableRequest(frame, redirectedFrom, event);
    let route;
    if (event.isIntercepted)
      route = new FFRouteImpl(this._session, request);
    this._requests.set(request._id, request);
    this._page.frameManager.requestStarted(request.request, route);
  }
  _onResponseReceived(event) {
    const request = this._requests.get(event.requestId);
    if (!request)
      return;
    const getResponseBody = async () => {
      const response2 = await this._session.send("Network.getResponseBody", {
        requestId: request._id
      });
      if (response2.evicted)
        throw new Error(`Response body for ${request.request.method()} ${request.request.url()} was evicted!`);
      return Buffer.from(response2.base64body, "base64");
    };
    const startTime = event.timing.startTime;
    function relativeToStart(time) {
      if (!time)
        return -1;
      return (time - startTime) / 1e3;
    }
    const timing = {
      startTime: startTime / 1e3,
      domainLookupStart: relativeToStart(event.timing.domainLookupStart),
      domainLookupEnd: relativeToStart(event.timing.domainLookupEnd),
      connectStart: relativeToStart(event.timing.connectStart),
      secureConnectionStart: relativeToStart(event.timing.secureConnectionStart),
      connectEnd: relativeToStart(event.timing.connectEnd),
      requestStart: relativeToStart(event.timing.requestStart),
      responseStart: relativeToStart(event.timing.responseStart)
    };
    const response = new network.Response(request.request, event.status, event.statusText, parseMultivalueHeaders(event.headers), timing, getResponseBody, event.fromServiceWorker);
    if (event?.remoteIPAddress && typeof event?.remotePort === "number") {
      response._serverAddrFinished({
        ipAddress: event.remoteIPAddress,
        port: event.remotePort
      });
    } else {
      response._serverAddrFinished();
    }
    response._securityDetailsFinished({
      protocol: event?.securityDetails?.protocol,
      subjectName: event?.securityDetails?.subjectName,
      issuer: event?.securityDetails?.issuer,
      validFrom: event?.securityDetails?.validFrom,
      validTo: event?.securityDetails?.validTo
    });
    response.setRawResponseHeaders(null);
    response.setResponseHeadersSize(null);
    this._page.frameManager.requestReceivedResponse(response);
  }
  _onRequestFinished(event) {
    const request = this._requests.get(event.requestId);
    if (!request)
      return;
    const response = request.request._existingResponse();
    response.setTransferSize(event.transferSize);
    response.setEncodedBodySize(event.encodedBodySize);
    const isRedirected = response.status() >= 300 && response.status() <= 399;
    const responseEndTime = event.responseEndTime ? event.responseEndTime / 1e3 - response.timing().startTime : -1;
    if (isRedirected) {
      response._requestFinished(responseEndTime);
    } else {
      this._requests.delete(request._id);
      response._requestFinished(responseEndTime);
    }
    if (event.protocolVersion)
      response._setHttpVersion(event.protocolVersion);
    this._page.frameManager.reportRequestFinished(request.request, response);
  }
  _onRequestFailed(event) {
    const request = this._requests.get(event.requestId);
    if (!request)
      return;
    this._requests.delete(request._id);
    const response = request.request._existingResponse();
    if (response) {
      response.setTransferSize(null);
      response.setEncodedBodySize(null);
      response._requestFinished(-1);
    }
    request.request._setFailureText(event.errorCode);
    this._page.frameManager.requestFailed(request.request, event.errorCode === "NS_BINDING_ABORTED");
  }
}
const causeToResourceType = {
  TYPE_INVALID: "other",
  TYPE_OTHER: "other",
  TYPE_SCRIPT: "script",
  TYPE_IMAGE: "image",
  TYPE_STYLESHEET: "stylesheet",
  TYPE_OBJECT: "other",
  TYPE_DOCUMENT: "document",
  TYPE_SUBDOCUMENT: "document",
  TYPE_REFRESH: "document",
  TYPE_XBL: "other",
  TYPE_PING: "other",
  TYPE_XMLHTTPREQUEST: "xhr",
  TYPE_OBJECT_SUBREQUEST: "other",
  TYPE_DTD: "other",
  TYPE_FONT: "font",
  TYPE_MEDIA: "media",
  TYPE_WEBSOCKET: "websocket",
  TYPE_CSP_REPORT: "cspreport",
  TYPE_XSLT: "other",
  TYPE_BEACON: "beacon",
  TYPE_FETCH: "fetch",
  TYPE_IMAGESET: "image",
  TYPE_WEB_MANIFEST: "manifest"
};
const internalCauseToResourceType = {
  TYPE_INTERNAL_EVENTSOURCE: "eventsource"
};
class InterceptableRequest {
  constructor(frame, redirectedFrom, payload) {
    this._id = payload.requestId;
    if (redirectedFrom)
      redirectedFrom._redirectedTo = this;
    let postDataBuffer = null;
    if (payload.postData)
      postDataBuffer = Buffer.from(payload.postData, "base64");
    this.request = new network.Request(
      frame._page.browserContext,
      frame,
      null,
      redirectedFrom ? redirectedFrom.request : null,
      payload.navigationId,
      payload.url,
      internalCauseToResourceType[payload.internalCause] || causeToResourceType[payload.cause] || "other",
      payload.method,
      postDataBuffer,
      payload.headers
    );
    this.request.setRawRequestHeaders(null);
  }
  _finalRequest() {
    let request = this;
    while (request._redirectedTo)
      request = request._redirectedTo;
    return request;
  }
}
class FFRouteImpl {
  constructor(session, request) {
    this._session = session;
    this._request = request;
  }
  async continue(overrides) {
    await this._session.sendMayFail("Network.resumeInterceptedRequest", {
      requestId: this._request._id,
      url: overrides.url,
      method: overrides.method,
      headers: overrides.headers,
      postData: overrides.postData ? Buffer.from(overrides.postData).toString("base64") : void 0
    });
  }
  async fulfill(response) {
    const base64body = response.isBase64 ? response.body : Buffer.from(response.body).toString("base64");
    await this._session.sendMayFail("Network.fulfillInterceptedRequest", {
      requestId: this._request._id,
      status: response.status,
      statusText: network.statusText(response.status),
      headers: response.headers,
      base64body
    });
  }
  async abort(errorCode) {
    await this._session.sendMayFail("Network.abortInterceptedRequest", {
      requestId: this._request._id,
      errorCode
    });
  }
}
function parseMultivalueHeaders(headers) {
  const result = [];
  for (const header of headers) {
    const separator = header.name.toLowerCase() === "set-cookie" ? "\n" : ",";
    const tokens = header.value.split(separator).map((s) => s.trim());
    for (const token of tokens)
      result.push({ name: header.name, value: token });
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FFNetworkManager
});
