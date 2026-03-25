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
var instrumentation_exports = {};
__export(instrumentation_exports, {
  SdkObject: () => SdkObject,
  createInstrumentation: () => createInstrumentation,
  createRootSdkObject: () => createRootSdkObject
});
module.exports = __toCommonJS(instrumentation_exports);
var import_events = require("events");
var import_crypto = require("./utils/crypto");
class SdkObject extends import_events.EventEmitter {
  constructor(parent, guidPrefix, guid) {
    super();
    this.guid = guid || `${guidPrefix || ""}@${(0, import_crypto.createGuid)()}`;
    this.setMaxListeners(0);
    this.attribution = { ...parent.attribution };
    this.instrumentation = parent.instrumentation;
  }
  closeReason() {
    return this.attribution.page?._closeReason || this.attribution.context?._closeReason || this.attribution.browser?._closeReason;
  }
}
function createRootSdkObject() {
  const fakeParent = { attribution: {}, instrumentation: createInstrumentation() };
  const root = new SdkObject(fakeParent);
  root.guid = "";
  return root;
}
function createInstrumentation() {
  const listeners = /* @__PURE__ */ new Map();
  return new Proxy({}, {
    get: (obj, prop) => {
      if (typeof prop !== "string")
        return obj[prop];
      if (prop === "addListener")
        return (listener, context) => listeners.set(listener, context);
      if (prop === "removeListener")
        return (listener) => listeners.delete(listener);
      if (!prop.startsWith("on"))
        return obj[prop];
      return async (sdkObject, ...params) => {
        for (const [listener, context] of listeners) {
          if (!context || sdkObject.attribution.context === context)
            await listener[prop]?.(sdkObject, ...params);
        }
      };
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SdkObject,
  createInstrumentation,
  createRootSdkObject
});
