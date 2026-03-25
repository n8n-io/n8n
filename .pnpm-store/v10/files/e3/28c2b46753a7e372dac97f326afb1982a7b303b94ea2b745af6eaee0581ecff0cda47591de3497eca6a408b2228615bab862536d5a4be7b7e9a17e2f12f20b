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
var socksInterceptor_exports = {};
__export(socksInterceptor_exports, {
  SocksInterceptor: () => SocksInterceptor
});
module.exports = __toCommonJS(socksInterceptor_exports);
var import_events = __toESM(require("events"));
var socks = __toESM(require("./utils/socksProxy"));
var import_validator = require("../protocol/validator");
var import_debug = require("./utils/debug");
class SocksInterceptor {
  constructor(transport, pattern, redirectPortForTest) {
    this._ids = /* @__PURE__ */ new Set();
    this._handler = new socks.SocksProxyHandler(pattern, redirectPortForTest);
    let lastId = -1;
    this._channel = new Proxy(new import_events.default(), {
      get: (obj, prop) => {
        if (prop in obj || obj[prop] !== void 0 || typeof prop !== "string")
          return obj[prop];
        return (params) => {
          try {
            const id = --lastId;
            this._ids.add(id);
            const validator = (0, import_validator.findValidator)("SocksSupport", prop, "Params");
            params = validator(params, "", { tChannelImpl: tChannelForSocks, binary: "toBase64", isUnderTest: import_debug.isUnderTest });
            transport.send({ id, guid: this._socksSupportObjectGuid, method: prop, params, metadata: { stack: [], apiName: "", internal: true } });
          } catch (e) {
          }
        };
      }
    });
    this._handler.on(socks.SocksProxyHandler.Events.SocksConnected, (payload) => this._channel.socksConnected(payload));
    this._handler.on(socks.SocksProxyHandler.Events.SocksData, (payload) => this._channel.socksData(payload));
    this._handler.on(socks.SocksProxyHandler.Events.SocksError, (payload) => this._channel.socksError(payload));
    this._handler.on(socks.SocksProxyHandler.Events.SocksFailed, (payload) => this._channel.socksFailed(payload));
    this._handler.on(socks.SocksProxyHandler.Events.SocksEnd, (payload) => this._channel.socksEnd(payload));
    this._channel.on("socksRequested", (payload) => this._handler.socketRequested(payload));
    this._channel.on("socksClosed", (payload) => this._handler.socketClosed(payload));
    this._channel.on("socksData", (payload) => this._handler.sendSocketData(payload));
  }
  cleanup() {
    this._handler.cleanup();
  }
  interceptMessage(message) {
    if (this._ids.has(message.id)) {
      this._ids.delete(message.id);
      return true;
    }
    if (message.method === "__create__" && message.params.type === "SocksSupport") {
      this._socksSupportObjectGuid = message.params.guid;
      return false;
    }
    if (this._socksSupportObjectGuid && message.guid === this._socksSupportObjectGuid) {
      const validator = (0, import_validator.findValidator)("SocksSupport", message.method, "Event");
      const params = validator(message.params, "", { tChannelImpl: tChannelForSocks, binary: "fromBase64", isUnderTest: import_debug.isUnderTest });
      this._channel.emit(message.method, params);
      return true;
    }
    return false;
  }
}
function tChannelForSocks(names, arg, path, context) {
  throw new import_validator.ValidationError(`${path}: channels are not expected in SocksSupport`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SocksInterceptor
});
