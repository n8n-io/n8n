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
var consoleMessage_exports = {};
__export(consoleMessage_exports, {
  ConsoleMessage: () => ConsoleMessage
});
module.exports = __toCommonJS(consoleMessage_exports);
var import_jsHandle = require("./jsHandle");
class ConsoleMessage {
  constructor(platform, event, page, worker) {
    this._page = page;
    this._worker = worker;
    this._event = event;
    if (platform.inspectCustom)
      this[platform.inspectCustom] = () => this._inspect();
  }
  worker() {
    return this._worker;
  }
  page() {
    return this._page;
  }
  type() {
    return this._event.type;
  }
  text() {
    return this._event.text;
  }
  args() {
    return this._event.args.map(import_jsHandle.JSHandle.from);
  }
  location() {
    return this._event.location;
  }
  _inspect() {
    return this.text();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConsoleMessage
});
