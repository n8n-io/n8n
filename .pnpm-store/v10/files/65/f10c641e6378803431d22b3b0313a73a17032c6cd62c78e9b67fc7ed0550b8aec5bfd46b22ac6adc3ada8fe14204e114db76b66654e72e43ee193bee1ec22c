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
var webSocketRouteDispatcher_exports = {};
__export(webSocketRouteDispatcher_exports, {
  WebSocketRouteDispatcher: () => WebSocketRouteDispatcher
});
module.exports = __toCommonJS(webSocketRouteDispatcher_exports);
var import_page = require("../page");
var import_dispatcher = require("./dispatcher");
var import_pageDispatcher = require("./pageDispatcher");
var rawWebSocketMockSource = __toESM(require("../../generated/webSocketMockSource"));
var import_instrumentation = require("../instrumentation");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
var import_eventsHelper = require("../utils/eventsHelper");
class WebSocketRouteDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, id, url, frame) {
    super(scope, new import_instrumentation.SdkObject(scope._object, "webSocketRoute"), "WebSocketRoute", { url });
    this._type_WebSocketRoute = true;
    this._id = id;
    this._frame = frame;
    this._eventListeners.push(
      // When the frame navigates or detaches, there will be no more communication
      // from the mock websocket, so pretend like it was closed.
      import_eventsHelper.eventsHelper.addEventListener(frame._page, import_page.Page.Events.InternalFrameNavigatedToNewDocument, (frame2) => {
        if (frame2 === this._frame)
          this._executionContextGone();
      }),
      import_eventsHelper.eventsHelper.addEventListener(frame._page, import_page.Page.Events.FrameDetached, (frame2) => {
        if (frame2 === this._frame)
          this._executionContextGone();
      }),
      import_eventsHelper.eventsHelper.addEventListener(frame._page, import_page.Page.Events.Close, () => this._executionContextGone()),
      import_eventsHelper.eventsHelper.addEventListener(frame._page, import_page.Page.Events.Crash, () => this._executionContextGone())
    );
    WebSocketRouteDispatcher._idToDispatcher.set(this._id, this);
    scope._dispatchEvent("webSocketRoute", { webSocketRoute: this });
  }
  static {
    this._idToDispatcher = /* @__PURE__ */ new Map();
  }
  static async install(progress, connection, target) {
    const context = target instanceof import_page.Page ? target.browserContext : target;
    let data = context.getBindingClient(kBindingName);
    if (data && data.connection !== connection)
      throw new Error("Another client is already routing WebSockets");
    if (!data) {
      data = { counter: 0, connection, binding: null };
      data.binding = await context.exposeBinding(progress, kBindingName, false, (source, payload) => {
        if (payload.type === "onCreate") {
          const contextDispatcher = connection.existingDispatcher(context);
          const pageDispatcher = contextDispatcher ? import_pageDispatcher.PageDispatcher.fromNullable(contextDispatcher, source.page) : void 0;
          let scope;
          if (pageDispatcher && matchesPattern(pageDispatcher, context._options.baseURL, payload.url))
            scope = pageDispatcher;
          else if (contextDispatcher && matchesPattern(contextDispatcher, context._options.baseURL, payload.url))
            scope = contextDispatcher;
          if (scope) {
            new WebSocketRouteDispatcher(scope, payload.id, payload.url, source.frame);
          } else {
            const request = { id: payload.id, type: "passthrough" };
            source.frame.evaluateExpression(`globalThis.__pwWebSocketDispatch(${JSON.stringify(request)})`).catch(() => {
            });
          }
          return;
        }
        const dispatcher = WebSocketRouteDispatcher._idToDispatcher.get(payload.id);
        if (payload.type === "onMessageFromPage")
          dispatcher?._dispatchEvent("messageFromPage", { message: payload.data.data, isBase64: payload.data.isBase64 });
        if (payload.type === "onMessageFromServer")
          dispatcher?._dispatchEvent("messageFromServer", { message: payload.data.data, isBase64: payload.data.isBase64 });
        if (payload.type === "onClosePage")
          dispatcher?._dispatchEvent("closePage", { code: payload.code, reason: payload.reason, wasClean: payload.wasClean });
        if (payload.type === "onCloseServer")
          dispatcher?._dispatchEvent("closeServer", { code: payload.code, reason: payload.reason, wasClean: payload.wasClean });
      }, data);
    }
    ++data.counter;
    return await target.addInitScript(progress, `
      (() => {
        const module = {};
        ${rawWebSocketMockSource.source}
        (module.exports.inject())(globalThis);
      })();
    `);
  }
  static async uninstall(connection, target, initScript) {
    const context = target instanceof import_page.Page ? target.browserContext : target;
    const data = context.getBindingClient(kBindingName);
    if (!data || data.connection !== connection)
      return;
    if (--data.counter <= 0)
      await context.removeExposedBindings([data.binding]);
    await target.removeInitScripts([initScript]);
  }
  async connect(params, progress) {
    await this._evaluateAPIRequest(progress, { id: this._id, type: "connect" });
  }
  async ensureOpened(params, progress) {
    await this._evaluateAPIRequest(progress, { id: this._id, type: "ensureOpened" });
  }
  async sendToPage(params, progress) {
    await this._evaluateAPIRequest(progress, { id: this._id, type: "sendToPage", data: { data: params.message, isBase64: params.isBase64 } });
  }
  async sendToServer(params, progress) {
    await this._evaluateAPIRequest(progress, { id: this._id, type: "sendToServer", data: { data: params.message, isBase64: params.isBase64 } });
  }
  async closePage(params, progress) {
    await this._evaluateAPIRequest(progress, { id: this._id, type: "closePage", code: params.code, reason: params.reason, wasClean: params.wasClean });
  }
  async closeServer(params, progress) {
    await this._evaluateAPIRequest(progress, { id: this._id, type: "closeServer", code: params.code, reason: params.reason, wasClean: params.wasClean });
  }
  async _evaluateAPIRequest(progress, request) {
    await progress.race(this._frame.evaluateExpression(`globalThis.__pwWebSocketDispatch(${JSON.stringify(request)})`).catch(() => {
    }));
  }
  _onDispose() {
    WebSocketRouteDispatcher._idToDispatcher.delete(this._id);
  }
  _executionContextGone() {
    if (!this._disposed) {
      this._dispatchEvent("closePage", { wasClean: true });
      this._dispatchEvent("closeServer", { wasClean: true });
    }
  }
}
function matchesPattern(dispatcher, baseURL, url) {
  for (const pattern of dispatcher._webSocketInterceptionPatterns || []) {
    const urlMatch = pattern.regexSource ? new RegExp(pattern.regexSource, pattern.regexFlags) : pattern.glob;
    if ((0, import_urlMatch.urlMatches)(baseURL, url, urlMatch, true))
      return true;
  }
  return false;
}
const kBindingName = "__pwWebSocketBinding";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebSocketRouteDispatcher
});
