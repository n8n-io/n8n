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
var dialog_exports = {};
__export(dialog_exports, {
  Dialog: () => Dialog
});
module.exports = __toCommonJS(dialog_exports);
var import_channelOwner = require("./channelOwner");
var import_page = require("./page");
class Dialog extends import_channelOwner.ChannelOwner {
  static from(dialog) {
    return dialog._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._page = import_page.Page.fromNullable(initializer.page);
  }
  page() {
    return this._page;
  }
  type() {
    return this._initializer.type;
  }
  message() {
    return this._initializer.message;
  }
  defaultValue() {
    return this._initializer.defaultValue;
  }
  async accept(promptText) {
    await this._channel.accept({ promptText });
  }
  async dismiss() {
    await this._channel.dismiss();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Dialog
});
