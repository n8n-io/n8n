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
var portTransport_exports = {};
__export(portTransport_exports, {
  PortTransport: () => PortTransport
});
module.exports = __toCommonJS(portTransport_exports);
class PortTransport {
  constructor(port, handler) {
    this._lastId = 0;
    this._callbacks = /* @__PURE__ */ new Map();
    this._port = port;
    port.addEventListener("message", async (event) => {
      const message = event.data;
      const { id, ackId, method, params, result } = message;
      if (ackId) {
        const callback = this._callbacks.get(ackId);
        this._callbacks.delete(ackId);
        this._resetRef();
        callback?.(result);
        return;
      }
      const handlerResult = await handler(method, params);
      if (id)
        this._port.postMessage({ ackId: id, result: handlerResult });
    });
    this._resetRef();
  }
  post(method, params) {
    this._port.postMessage({ method, params });
  }
  async send(method, params) {
    return await new Promise((f) => {
      const id = ++this._lastId;
      this._callbacks.set(id, f);
      this._resetRef();
      this._port.postMessage({ id, method, params });
    });
  }
  _resetRef() {
    if (this._callbacks.size) {
      this._port.ref();
    } else {
      this._port.unref();
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PortTransport
});
