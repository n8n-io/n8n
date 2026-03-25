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
var pipeTransport_exports = {};
__export(pipeTransport_exports, {
  PipeTransport: () => PipeTransport
});
module.exports = __toCommonJS(pipeTransport_exports);
var import_task = require("./task");
class PipeTransport {
  constructor(pipeWrite, pipeRead, closeable, endian = "le") {
    this._data = Buffer.from([]);
    this._waitForNextTask = (0, import_task.makeWaitForNextTask)();
    this._closed = false;
    this._bytesLeft = 0;
    this._pipeWrite = pipeWrite;
    this._endian = endian;
    this._closeableStream = closeable;
    pipeRead.on("data", (buffer) => this._dispatch(buffer));
    pipeRead.on("close", () => {
      this._closed = true;
      if (this.onclose)
        this.onclose();
    });
    this.onmessage = void 0;
    this.onclose = void 0;
  }
  send(message) {
    if (this._closed)
      throw new Error("Pipe has been closed");
    const data = Buffer.from(message, "utf-8");
    const dataLength = Buffer.alloc(4);
    if (this._endian === "be")
      dataLength.writeUInt32BE(data.length, 0);
    else
      dataLength.writeUInt32LE(data.length, 0);
    this._pipeWrite.write(dataLength);
    this._pipeWrite.write(data);
  }
  close() {
    this._closeableStream.close();
  }
  _dispatch(buffer) {
    this._data = Buffer.concat([this._data, buffer]);
    while (true) {
      if (!this._bytesLeft && this._data.length < 4) {
        break;
      }
      if (!this._bytesLeft) {
        this._bytesLeft = this._endian === "be" ? this._data.readUInt32BE(0) : this._data.readUInt32LE(0);
        this._data = this._data.slice(4);
      }
      if (!this._bytesLeft || this._data.length < this._bytesLeft) {
        break;
      }
      const message = this._data.slice(0, this._bytesLeft);
      this._data = this._data.slice(this._bytesLeft);
      this._bytesLeft = 0;
      this._waitForNextTask(() => {
        if (this.onmessage)
          this.onmessage(message.toString("utf-8"));
      });
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PipeTransport
});
