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
var bidiConnection_exports = {};
__export(bidiConnection_exports, {
  BidiConnection: () => BidiConnection,
  BidiSession: () => BidiSession,
  kBrowserCloseMessageId: () => kBrowserCloseMessageId,
  kShutdownSessionNewMessageId: () => kShutdownSessionNewMessageId
});
module.exports = __toCommonJS(bidiConnection_exports);
var import_events = require("events");
var import_debugLogger = require("../utils/debugLogger");
var import_helper = require("../helper");
var import_protocolError = require("../protocolError");
const kBrowserCloseMessageId = Number.MAX_SAFE_INTEGER - 1;
const kShutdownSessionNewMessageId = kBrowserCloseMessageId - 1;
class BidiConnection {
  constructor(transport, onDisconnect, protocolLogger, browserLogsCollector) {
    this._lastId = 0;
    this._closed = false;
    this._browsingContextToSession = /* @__PURE__ */ new Map();
    this._realmToBrowsingContext = /* @__PURE__ */ new Map();
    // TODO: shared/service workers might have multiple owner realms.
    this._realmToOwnerRealm = /* @__PURE__ */ new Map();
    this._transport = transport;
    this._onDisconnect = onDisconnect;
    this._protocolLogger = protocolLogger;
    this._browserLogsCollector = browserLogsCollector;
    this.browserSession = new BidiSession(this, "", (message) => {
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
    const object = message;
    if (object.type === "event") {
      if (object.method === "script.realmCreated") {
        if ("context" in object.params)
          this._realmToBrowsingContext.set(object.params.realm, object.params.context);
        if (object.params.type === "dedicated-worker")
          this._realmToOwnerRealm.set(object.params.realm, object.params.owners[0]);
      } else if (object.method === "script.realmDestroyed") {
        this._realmToBrowsingContext.delete(object.params.realm);
        this._realmToOwnerRealm.delete(object.params.realm);
      }
      let context;
      let realm;
      if ("context" in object.params) {
        context = object.params.context;
      } else if (object.method === "log.entryAdded" || object.method === "script.message") {
        context = object.params.source?.context;
        realm = object.params.source?.realm;
      } else if (object.method === "script.realmCreated" && object.params.type === "dedicated-worker") {
        realm = object.params.owners[0];
      }
      if (!context && realm) {
        while (this._realmToOwnerRealm.get(realm))
          realm = this._realmToOwnerRealm.get(realm);
        context = this._realmToBrowsingContext.get(realm);
      }
      if (context) {
        const session = this._browsingContextToSession.get(context);
        if (session) {
          session.dispatchMessage(message);
          return;
        }
      }
    } else if (message.id) {
      for (const session of this._browsingContextToSession.values()) {
        if (session.hasCallback(message.id)) {
          session.dispatchMessage(message);
          return;
        }
      }
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
  createMainFrameBrowsingContextSession(bowsingContextId) {
    const result = new BidiSession(this, bowsingContextId, (message) => this.rawSend(message));
    this._browsingContextToSession.set(bowsingContextId, result);
    return result;
  }
}
class BidiSession extends import_events.EventEmitter {
  constructor(connection, sessionId, rawSend) {
    super();
    this._disposed = false;
    this._callbacks = /* @__PURE__ */ new Map();
    this._crashed = false;
    this._browsingContexts = /* @__PURE__ */ new Set();
    this.setMaxListeners(0);
    this.connection = connection;
    this.sessionId = sessionId;
    this._rawSend = rawSend;
    this.on = super.on;
    this.off = super.removeListener;
    this.addListener = super.addListener;
    this.removeListener = super.removeListener;
    this.once = super.once;
  }
  addFrameBrowsingContext(context) {
    this._browsingContexts.add(context);
    this.connection._browsingContextToSession.set(context, this);
  }
  removeFrameBrowsingContext(context) {
    this._browsingContexts.delete(context);
    this.connection._browsingContextToSession.delete(context);
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
    this._disposed = true;
    this.connection._browsingContextToSession.delete(this.sessionId);
    for (const context of this._browsingContexts)
      this.connection._browsingContextToSession.delete(context);
    this._browsingContexts.clear();
    for (const callback of this._callbacks.values()) {
      callback.error.type = this._crashed ? "crashed" : "closed";
      callback.error.setMessage(`Internal server error, session ${callback.error.type}.`);
      callback.error.logs = this.connection._browserDisconnectedLogs;
      callback.reject(callback.error);
    }
    this._callbacks.clear();
  }
  hasCallback(id) {
    return this._callbacks.has(id);
  }
  dispatchMessage(message) {
    const object = message;
    if (object.id === kBrowserCloseMessageId || object.id === kShutdownSessionNewMessageId)
      return;
    if (object.id && this._callbacks.has(object.id)) {
      const callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.type === "error") {
        callback.error.setMessage(object.error + "\nMessage: " + object.message);
        callback.reject(callback.error);
      } else if (object.type === "success") {
        callback.resolve(object.result);
      } else {
        callback.error.setMessage("Internal error, unexpected response type: " + JSON.stringify(object));
        callback.reject(callback.error);
      }
    } else if (object.id) {
    } else {
      Promise.resolve().then(() => this.emit(object.method, object.params));
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiConnection,
  BidiSession,
  kBrowserCloseMessageId,
  kShutdownSessionNewMessageId
});
