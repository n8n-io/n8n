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
var wkInterceptableRequest_exports = {};
__export(wkInterceptableRequest_exports, {
  WKInterceptableRequest: () => WKInterceptableRequest,
  WKRouteImpl: () => WKRouteImpl
});
module.exports = __toCommonJS(wkInterceptableRequest_exports);
var import_utils = require("../../utils");
var network = __toESM(require("../network"));
const errorReasons = {
  "aborted": "Cancellation",
  "accessdenied": "AccessControl",
  "addressunreachable": "General",
  "blockedbyclient": "Cancellation",
  "blockedbyresponse": "General",
  "connectionaborted": "General",
  "connectionclosed": "General",
  "connectionfailed": "General",
  "connectionrefused": "General",
  "connectionreset": "General",
  "internetdisconnected": "General",
  "namenotresolved": "General",
  "timedout": "Timeout",
  "failed": "General"
};
class WKInterceptableRequest {
  constructor(session, frame, event, redirectedFrom, documentId) {
    this._session = session;
    this._requestId = event.requestId;
    const resourceType = event.type ? toResourceType(event.type) : redirectedFrom ? redirectedFrom.request.resourceType() : "other";
    let postDataBuffer = null;
    this._timestamp = event.timestamp;
    this._wallTime = event.walltime * 1e3;
    if (event.request.postData)
      postDataBuffer = Buffer.from(event.request.postData, "base64");
    this.request = new network.Request(
      frame._page.browserContext,
      frame,
      null,
      redirectedFrom?.request || null,
      documentId,
      event.request.url,
      resourceType,
      event.request.method,
      postDataBuffer,
      (0, import_utils.headersObjectToArray)(event.request.headers)
    );
  }
  adoptRequestFromNewProcess(newSession, requestId) {
    this._session = newSession;
    this._requestId = requestId;
  }
  createResponse(responsePayload) {
    const getResponseBody = async () => {
      const response2 = await this._session.send("Network.getResponseBody", { requestId: this._requestId });
      return Buffer.from(response2.body, response2.base64Encoded ? "base64" : "utf8");
    };
    const timingPayload = responsePayload.timing;
    const timing = {
      startTime: this._wallTime,
      domainLookupStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.domainLookupStart) : -1,
      domainLookupEnd: timingPayload ? wkMillisToRoundishMillis(timingPayload.domainLookupEnd) : -1,
      connectStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.connectStart) : -1,
      secureConnectionStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.secureConnectionStart) : -1,
      connectEnd: timingPayload ? wkMillisToRoundishMillis(timingPayload.connectEnd) : -1,
      requestStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.requestStart) : -1,
      responseStart: timingPayload ? wkMillisToRoundishMillis(timingPayload.responseStart) : -1
    };
    const setCookieSeparator = process.platform === "darwin" ? "," : "playwright-set-cookie-separator";
    const response = new network.Response(this.request, responsePayload.status, responsePayload.statusText, (0, import_utils.headersObjectToArray)(responsePayload.headers, ",", setCookieSeparator), timing, getResponseBody, responsePayload.source === "service-worker");
    response.setRawResponseHeaders(null);
    response.setTransferSize(null);
    if (responsePayload.requestHeaders && Object.keys(responsePayload.requestHeaders).length) {
      const headers = { ...responsePayload.requestHeaders };
      if (!headers["host"])
        headers["Host"] = new URL(this.request.url()).host;
      this.request.setRawRequestHeaders((0, import_utils.headersObjectToArray)(headers));
    } else {
      this.request.setRawRequestHeaders(null);
    }
    return response;
  }
}
class WKRouteImpl {
  constructor(session, requestId) {
    this._session = session;
    this._requestId = requestId;
  }
  async abort(errorCode) {
    const errorType = errorReasons[errorCode];
    (0, import_utils.assert)(errorType, "Unknown error code: " + errorCode);
    await this._session.sendMayFail("Network.interceptRequestWithError", { requestId: this._requestId, errorType });
  }
  async fulfill(response) {
    if (300 <= response.status && response.status < 400)
      throw new Error("Cannot fulfill with redirect status: " + response.status);
    let mimeType = response.isBase64 ? "application/octet-stream" : "text/plain";
    const headers = (0, import_utils.headersArrayToObject)(
      response.headers,
      true
      /* lowerCase */
    );
    const contentType = headers["content-type"];
    if (contentType)
      mimeType = contentType.split(";")[0].trim();
    await this._session.sendMayFail("Network.interceptRequestWithResponse", {
      requestId: this._requestId,
      status: response.status,
      statusText: network.statusText(response.status),
      mimeType,
      headers,
      base64Encoded: response.isBase64,
      content: response.body
    });
  }
  async continue(overrides) {
    await this._session.sendMayFail("Network.interceptWithRequest", {
      requestId: this._requestId,
      url: overrides.url,
      method: overrides.method,
      headers: overrides.headers ? (0, import_utils.headersArrayToObject)(
        overrides.headers,
        false
        /* lowerCase */
      ) : void 0,
      postData: overrides.postData ? Buffer.from(overrides.postData).toString("base64") : void 0
    });
  }
}
function wkMillisToRoundishMillis(value) {
  if (value === -1e3)
    return -1;
  if (value <= 0) {
    return -1;
  }
  return (value * 1e3 | 0) / 1e3;
}
function toResourceType(type) {
  switch (type) {
    case "Document":
      return "document";
    case "StyleSheet":
      return "stylesheet";
    case "Image":
      return "image";
    case "Font":
      return "font";
    case "Script":
      return "script";
    case "XHR":
      return "xhr";
    case "Fetch":
      return "fetch";
    case "Ping":
      return "ping";
    case "Beacon":
      return "beacon";
    case "WebSocket":
      return "websocket";
    case "EventSource":
      return "eventsource";
    default:
      return "other";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKInterceptableRequest,
  WKRouteImpl
});
