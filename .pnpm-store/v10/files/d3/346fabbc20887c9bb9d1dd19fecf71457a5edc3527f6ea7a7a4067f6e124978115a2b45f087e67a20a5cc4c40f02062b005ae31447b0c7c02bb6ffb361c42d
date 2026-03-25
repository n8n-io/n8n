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
var webSocket_exports = {};
__export(webSocket_exports, {
  connectOverWebSocket: () => connectOverWebSocket
});
module.exports = __toCommonJS(webSocket_exports);
var import_connection = require("./connection");
async function connectOverWebSocket(parentConnection, params) {
  const localUtils = parentConnection.localUtils();
  const transport = localUtils ? new JsonPipeTransport(localUtils) : new WebSocketTransport();
  const connectHeaders = await transport.connect(params);
  const connection = new import_connection.Connection(parentConnection._platform, localUtils, parentConnection._instrumentation, connectHeaders);
  connection.markAsRemote();
  connection.on("close", () => transport.close());
  let closeError;
  const onTransportClosed = (reason) => {
    connection.close(reason || closeError);
  };
  transport.onClose((reason) => onTransportClosed(reason));
  connection.onmessage = (message) => transport.send(message).catch(() => onTransportClosed());
  transport.onMessage((message) => {
    try {
      connection.dispatch(message);
    } catch (e) {
      closeError = String(e);
      transport.close().catch(() => {
      });
    }
  });
  return connection;
}
class JsonPipeTransport {
  constructor(owner) {
    this._owner = owner;
  }
  async connect(params) {
    const { pipe, headers: connectHeaders } = await this._owner._channel.connect(params);
    this._pipe = pipe;
    return connectHeaders;
  }
  async send(message) {
    await this._pipe.send({ message });
  }
  onMessage(callback) {
    this._pipe.on("message", ({ message }) => callback(message));
  }
  onClose(callback) {
    this._pipe.on("closed", ({ reason }) => callback(reason));
  }
  async close() {
    await this._pipe.close().catch(() => {
    });
  }
}
class WebSocketTransport {
  async connect(params) {
    this._ws = new window.WebSocket(params.wsEndpoint);
    return [];
  }
  async send(message) {
    this._ws.send(JSON.stringify(message));
  }
  onMessage(callback) {
    this._ws.addEventListener("message", (event) => callback(JSON.parse(event.data)));
  }
  onClose(callback) {
    this._ws.addEventListener("close", () => callback());
  }
  async close() {
    this._ws.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  connectOverWebSocket
});
