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
var events_exports = {};
__export(events_exports, {
  Events: () => Events
});
module.exports = __toCommonJS(events_exports);
const Events = {
  AndroidDevice: {
    WebView: "webview",
    Close: "close"
  },
  AndroidSocket: {
    Data: "data",
    Close: "close"
  },
  AndroidWebView: {
    Close: "close"
  },
  Browser: {
    Disconnected: "disconnected"
  },
  BrowserContext: {
    Console: "console",
    Close: "close",
    Dialog: "dialog",
    Page: "page",
    // Can't use just 'error' due to node.js special treatment of error events.
    // @see https://nodejs.org/api/events.html#events_error_events
    WebError: "weberror",
    BackgroundPage: "backgroundpage",
    // Deprecated in v1.56, never emitted anymore.
    ServiceWorker: "serviceworker",
    Request: "request",
    Response: "response",
    RequestFailed: "requestfailed",
    RequestFinished: "requestfinished"
  },
  BrowserServer: {
    Close: "close"
  },
  Page: {
    Close: "close",
    Crash: "crash",
    Console: "console",
    Dialog: "dialog",
    Download: "download",
    FileChooser: "filechooser",
    DOMContentLoaded: "domcontentloaded",
    // Can't use just 'error' due to node.js special treatment of error events.
    // @see https://nodejs.org/api/events.html#events_error_events
    PageError: "pageerror",
    Request: "request",
    Response: "response",
    RequestFailed: "requestfailed",
    RequestFinished: "requestfinished",
    FrameAttached: "frameattached",
    FrameDetached: "framedetached",
    FrameNavigated: "framenavigated",
    Load: "load",
    Popup: "popup",
    WebSocket: "websocket",
    Worker: "worker"
  },
  PageAgent: {
    Turn: "turn"
  },
  WebSocket: {
    Close: "close",
    Error: "socketerror",
    FrameReceived: "framereceived",
    FrameSent: "framesent"
  },
  Worker: {
    Close: "close",
    Console: "console"
  },
  ElectronApplication: {
    Close: "close",
    Console: "console",
    Window: "window"
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Events
});
