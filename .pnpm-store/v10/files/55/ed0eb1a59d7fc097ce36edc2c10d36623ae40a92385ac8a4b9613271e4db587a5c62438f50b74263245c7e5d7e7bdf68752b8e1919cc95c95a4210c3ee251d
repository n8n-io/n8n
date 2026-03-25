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
var socketConnection_exports = {};
__export(socketConnection_exports, {
  SocketConnection: () => SocketConnection,
  compareSemver: () => compareSemver
});
module.exports = __toCommonJS(socketConnection_exports);
class SocketConnection {
  constructor(socket, version) {
    this._pendingBuffers = [];
    this._socket = socket;
    this._version = version;
    socket.on("data", (buffer) => this._onData(buffer));
    socket.on("close", () => {
      this.onclose?.();
    });
    socket.on("error", (e) => console.error(`error: ${e.message}`));
  }
  async send(message) {
    await new Promise((resolve, reject) => {
      this._socket.write(`${JSON.stringify({ ...message, version: this._version })}
`, (error) => {
        if (error)
          reject(error);
        else
          resolve(void 0);
      });
    });
  }
  close() {
    this._socket.destroy();
  }
  _onData(buffer) {
    let end = buffer.indexOf("\n");
    if (end === -1) {
      this._pendingBuffers.push(buffer);
      return;
    }
    this._pendingBuffers.push(buffer.slice(0, end));
    const message = Buffer.concat(this._pendingBuffers).toString();
    this._dispatchMessage(message);
    let start = end + 1;
    end = buffer.indexOf("\n", start);
    while (end !== -1) {
      const message2 = buffer.toString(void 0, start, end);
      this._dispatchMessage(message2);
      start = end + 1;
      end = buffer.indexOf("\n", start);
    }
    this._pendingBuffers = [buffer.slice(start)];
  }
  _dispatchMessage(message) {
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.version !== this._version) {
        if (this.onversionerror?.(parsedMessage.id, { expected: this._version, received: parsedMessage.version }))
          return;
      }
      this.onmessage?.(parsedMessage);
    } catch (e) {
      console.error("failed to dispatch message", e);
    }
  }
}
function compareSemver(a, b) {
  a = a.replace(/-[\w]+$/, "");
  b = b.replace(/-[\w]+$/, "");
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i])
      return 1;
    if (aParts[i] < bParts[i])
      return -1;
  }
  return 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SocketConnection,
  compareSemver
});
