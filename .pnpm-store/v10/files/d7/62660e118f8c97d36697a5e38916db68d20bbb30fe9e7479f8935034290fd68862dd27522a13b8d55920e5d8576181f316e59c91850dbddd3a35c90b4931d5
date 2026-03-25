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
var inProcessTransport_exports = {};
__export(inProcessTransport_exports, {
  InProcessTransport: () => InProcessTransport
});
module.exports = __toCommonJS(inProcessTransport_exports);
class InProcessTransport {
  constructor(server) {
    this._connected = false;
    this._server = server;
    this._serverTransport = new InProcessServerTransport(this);
  }
  async start() {
    if (this._connected)
      throw new Error("InprocessTransport already started!");
    await this._server.connect(this._serverTransport);
    this._connected = true;
  }
  async send(message, options) {
    if (!this._connected)
      throw new Error("Transport not connected");
    this._serverTransport._receiveFromClient(message);
  }
  async close() {
    if (this._connected) {
      this._connected = false;
      this.onclose?.();
      this._serverTransport.onclose?.();
    }
  }
  _receiveFromServer(message, extra) {
    this.onmessage?.(message, extra);
  }
}
class InProcessServerTransport {
  constructor(clientTransport) {
    this._clientTransport = clientTransport;
  }
  async start() {
  }
  async send(message, options) {
    this._clientTransport._receiveFromServer(message);
  }
  async close() {
    this.onclose?.();
  }
  _receiveFromClient(message) {
    this.onmessage?.(message);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InProcessTransport
});
