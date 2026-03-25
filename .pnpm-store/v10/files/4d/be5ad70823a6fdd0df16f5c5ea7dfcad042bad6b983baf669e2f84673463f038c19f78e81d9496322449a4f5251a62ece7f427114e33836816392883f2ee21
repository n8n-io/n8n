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
var wkConnection_exports = {};
__export(wkConnection_exports, {
  WKConnection: () => WKConnection,
  WKSession: () => WKSession,
  kBrowserCloseMessageId: () => kBrowserCloseMessageId,
  kPageProxyMessageReceived: () => kPageProxyMessageReceived
});
module.exports = __toCommonJS(wkConnection_exports);
var import_events = require("events");
var import_utils = require("../../utils");
var import_debugLogger = require("../utils/debugLogger");
var import_helper = require("../helper");
var import_protocolError = require("../protocolError");
const kBrowserCloseMessageId = -9999;
const kPageProxyMessageReceived = Symbol("kPageProxyMessageReceived");
class WKConnection {
  constructor(transport, onDisconnect, protocolLogger, browserLogsCollector) {
    this._lastId = 0;
    this._closed = false;
    this._transport = transport;
    this._onDisconnect = onDisconnect;
    this._protocolLogger = protocolLogger;
    this._browserLogsCollector = browserLogsCollector;
    this.browserSession = new WKSession(this, "", (message) => {
      this.rawSend(message);
    });
    this._transport.onmessage = this._dispatchMessage.bind(this);
    this._transport.onclose = this._onClose.bind(this);
  }
  nextMessageId() {
    return ++this._lastId;
  }
  rawSend(message) {
    this._protocolLogger("send", message);
    this._transport.send(message);
  }
  _dispatchMessage(message) {
    this._protocolLogger("receive", message);
    if (message.id === kBrowserCloseMessageId)
      return;
    if (message.pageProxyId) {
      const payload = { message, pageProxyId: message.pageProxyId };
      this.browserSession.dispatchMessage({ method: kPageProxyMessageReceived, params: payload });
      return;
    }
    this.browserSession.dispatchMessage(message);
  }
  _onClose(reason) {
    this._closed = true;
    this._transport.onmessage = void 0;
    this._transport.onclose = void 0;
    this._browserDisconnectedLogs = import_helper.helper.formatBrowserLogs(this._browserLogsCollector.recentLogs(), reason);
    this.browserSession.dispose();
    this._onDisconnect();
  }
  isClosed() {
    return this._closed;
  }
  close() {
    if (!this._closed)
      this._transport.close();
  }
}
class WKSession extends import_events.EventEmitter {
  constructor(connection, sessionId, rawSend) {
    super();
    this._disposed = false;
    this._callbacks = /* @__PURE__ */ new Map();
    this._crashed = false;
    this.setMaxListeners(0);
    this.connection = connection;
    this.sessionId = sessionId;
    this._rawSend = rawSend;
  }
  async send(method, params) {
    if (this._crashed || this._disposed || this.connection._browserDisconnectedLogs)
      throw new import_protocolError.ProtocolError(this._crashed ? "crashed" : "closed", void 0, this.connection._browserDisconnectedLogs);
    const id = this.connection.nextMessageId();
    const messageObj = { id, method, params };
    this._rawSend(messageObj);
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject, error: new import_protocolError.ProtocolError("error", method) });
    });
  }
  sendMayFail(method, params) {
    return this.send(method, params).catch((error) => import_debugLogger.debugLogger.log("error", error));
  }
  markAsCrashed() {
    this._crashed = true;
  }
  isDisposed() {
    return this._disposed;
  }
  dispose() {
    for (const callback of this._callbacks.values()) {
      callback.error.type = this._crashed ? "crashed" : "closed";
      callback.error.logs = this.connection._browserDisconnectedLogs;
      callback.reject(callback.error);
    }
    this._callbacks.clear();
    this._disposed = true;
  }
  dispatchMessage(object) {
    if (object.id && this._callbacks.has(object.id)) {
      const callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error) {
        callback.error.setMessage(object.error.message);
        callback.reject(callback.error);
      } else {
        callback.resolve(object.result);
      }
    } else if (object.id && !object.error) {
      (0, import_utils.assert)(this.isDisposed(), JSON.stringify(object));
    } else {
      Promise.resolve().then(() => this.emit(object.method, object.params));
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKConnection,
  WKSession,
  kBrowserCloseMessageId,
  kPageProxyMessageReceived
});
