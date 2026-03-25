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
var jsonPipeDispatcher_exports = {};
__export(jsonPipeDispatcher_exports, {
  JsonPipeDispatcher: () => JsonPipeDispatcher
});
module.exports = __toCommonJS(jsonPipeDispatcher_exports);
var import_dispatcher = require("./dispatcher");
var import_instrumentation = require("../instrumentation");
class JsonPipeDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope) {
    super(scope, new import_instrumentation.SdkObject(scope._object, "jsonPipe"), "JsonPipe", {});
    this._type_JsonPipe = true;
  }
  async send(params, progress) {
    this.emit("message", params.message);
  }
  async close(params, progress) {
    this.emit("close");
    if (!this._disposed) {
      this._dispatchEvent("closed", {});
      this._dispose();
    }
  }
  dispatch(message) {
    if (!this._disposed)
      this._dispatchEvent("message", { message });
  }
  wasClosed(reason) {
    if (!this._disposed) {
      this._dispatchEvent("closed", { reason });
      this._dispose();
    }
  }
  dispose() {
    this._dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JsonPipeDispatcher
});
