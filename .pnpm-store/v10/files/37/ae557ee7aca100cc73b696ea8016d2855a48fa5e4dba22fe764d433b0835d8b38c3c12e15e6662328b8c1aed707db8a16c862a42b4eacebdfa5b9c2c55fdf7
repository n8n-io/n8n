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
var channelOwner_exports = {};
__export(channelOwner_exports, {
  ChannelOwner: () => ChannelOwner
});
module.exports = __toCommonJS(channelOwner_exports);
var import_eventEmitter = require("./eventEmitter");
var import_validator = require("../protocol/validator");
var import_protocolMetainfo = require("../utils/isomorphic/protocolMetainfo");
var import_clientStackTrace = require("./clientStackTrace");
var import_stackTrace = require("../utils/isomorphic/stackTrace");
class ChannelOwner extends import_eventEmitter.EventEmitter {
  constructor(parent, type, guid, initializer) {
    const connection = parent instanceof ChannelOwner ? parent._connection : parent;
    super(connection._platform);
    this._objects = /* @__PURE__ */ new Map();
    this._eventToSubscriptionMapping = /* @__PURE__ */ new Map();
    this._wasCollected = false;
    this.setMaxListeners(0);
    this._connection = connection;
    this._type = type;
    this._guid = guid;
    this._parent = parent instanceof ChannelOwner ? parent : void 0;
    this._instrumentation = this._connection._instrumentation;
    this._connection._objects.set(guid, this);
    if (this._parent) {
      this._parent._objects.set(guid, this);
      this._logger = this._parent._logger;
    }
    this._channel = this._createChannel(new import_eventEmitter.EventEmitter(connection._platform));
    this._initializer = initializer;
  }
  _setEventToSubscriptionMapping(mapping) {
    this._eventToSubscriptionMapping = mapping;
  }
  _updateSubscription(event, enabled) {
    const protocolEvent = this._eventToSubscriptionMapping.get(String(event));
    if (protocolEvent)
      this._channel.updateSubscription({ event: protocolEvent, enabled }).catch(() => {
      });
  }
  on(event, listener) {
    if (!this.listenerCount(event))
      this._updateSubscription(event, true);
    super.on(event, listener);
    return this;
  }
  addListener(event, listener) {
    if (!this.listenerCount(event))
      this._updateSubscription(event, true);
    super.addListener(event, listener);
    return this;
  }
  prependListener(event, listener) {
    if (!this.listenerCount(event))
      this._updateSubscription(event, true);
    super.prependListener(event, listener);
    return this;
  }
  off(event, listener) {
    super.off(event, listener);
    if (!this.listenerCount(event))
      this._updateSubscription(event, false);
    return this;
  }
  removeListener(event, listener) {
    super.removeListener(event, listener);
    if (!this.listenerCount(event))
      this._updateSubscription(event, false);
    return this;
  }
  _adopt(child) {
    child._parent._objects.delete(child._guid);
    this._objects.set(child._guid, child);
    child._parent = this;
  }
  _dispose(reason) {
    if (this._parent)
      this._parent._objects.delete(this._guid);
    this._connection._objects.delete(this._guid);
    this._wasCollected = reason === "gc";
    for (const object of [...this._objects.values()])
      object._dispose(reason);
    this._objects.clear();
  }
  _debugScopeState() {
    return {
      _guid: this._guid,
      objects: Array.from(this._objects.values()).map((o) => o._debugScopeState())
    };
  }
  _validatorToWireContext() {
    return {
      tChannelImpl: tChannelImplToWire,
      binary: this._connection.rawBuffers() ? "buffer" : "toBase64",
      isUnderTest: () => this._platform.isUnderTest()
    };
  }
  _createChannel(base) {
    const channel = new Proxy(base, {
      get: (obj, prop) => {
        if (typeof prop === "string") {
          const validator = (0, import_validator.maybeFindValidator)(this._type, prop, "Params");
          const { internal } = import_protocolMetainfo.methodMetainfo.get(this._type + "." + prop) || {};
          if (validator) {
            return async (params) => {
              return await this._wrapApiCall(async (apiZone) => {
                const validatedParams = validator(params, "", this._validatorToWireContext());
                if (!apiZone.internal && !apiZone.reported) {
                  apiZone.reported = true;
                  this._instrumentation.onApiCallBegin(apiZone, { type: this._type, method: prop, params });
                  logApiCall(this._platform, this._logger, `=> ${apiZone.apiName} started`);
                  return await this._connection.sendMessageToServer(this, prop, validatedParams, apiZone);
                }
                return await this._connection.sendMessageToServer(this, prop, validatedParams, { internal: true });
              }, { internal });
            };
          }
        }
        return obj[prop];
      }
    });
    channel._object = this;
    return channel;
  }
  async _wrapApiCall(func, options) {
    const logger = this._logger;
    const existingApiZone = this._platform.zones.current().data();
    if (existingApiZone)
      return await func(existingApiZone);
    const stackTrace = (0, import_clientStackTrace.captureLibraryStackTrace)(this._platform);
    const apiZone = { title: options?.title, apiName: stackTrace.apiName, frames: stackTrace.frames, internal: options?.internal ?? false, reported: false, userData: void 0, stepId: void 0 };
    try {
      const result = await this._platform.zones.current().push(apiZone).run(async () => await func(apiZone));
      if (!options?.internal) {
        logApiCall(this._platform, logger, `<= ${apiZone.apiName} succeeded`);
        this._instrumentation.onApiCallEnd(apiZone);
      }
      return result;
    } catch (e) {
      const innerError = (this._platform.showInternalStackFrames() || this._platform.isUnderTest()) && e.stack ? "\n<inner error>\n" + e.stack : "";
      if (apiZone.apiName && !apiZone.apiName.includes("<anonymous>"))
        e.message = apiZone.apiName + ": " + e.message;
      const stackFrames = "\n" + (0, import_stackTrace.stringifyStackFrames)(stackTrace.frames).join("\n") + innerError;
      if (stackFrames.trim())
        e.stack = e.message + stackFrames;
      else
        e.stack = "";
      if (!options?.internal) {
        apiZone.error = e;
        logApiCall(this._platform, logger, `<= ${apiZone.apiName} failed`);
        this._instrumentation.onApiCallEnd(apiZone);
      }
      throw e;
    }
  }
  toJSON() {
    return {
      _type: this._type,
      _guid: this._guid
    };
  }
}
function logApiCall(platform, logger, message) {
  if (logger && logger.isEnabled("api", "info"))
    logger.log("api", "info", message, [], { color: "cyan" });
  platform.log("api", message);
}
function tChannelImplToWire(names, arg, path, context) {
  if (arg._object instanceof ChannelOwner && (names === "*" || names.includes(arg._object._type)))
    return { guid: arg._object._guid };
  throw new import_validator.ValidationError(`${path}: expected channel ${names.toString()}`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChannelOwner
});
