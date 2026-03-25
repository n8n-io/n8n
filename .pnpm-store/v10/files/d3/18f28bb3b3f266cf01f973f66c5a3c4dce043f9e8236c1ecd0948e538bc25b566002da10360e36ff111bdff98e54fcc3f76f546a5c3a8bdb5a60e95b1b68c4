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
var input_exports = {};
__export(input_exports, {
  Keyboard: () => Keyboard,
  Mouse: () => Mouse,
  Touchscreen: () => Touchscreen
});
module.exports = __toCommonJS(input_exports);
class Keyboard {
  constructor(page) {
    this._page = page;
  }
  async down(key) {
    await this._page._channel.keyboardDown({ key });
  }
  async up(key) {
    await this._page._channel.keyboardUp({ key });
  }
  async insertText(text) {
    await this._page._channel.keyboardInsertText({ text });
  }
  async type(text, options = {}) {
    await this._page._channel.keyboardType({ text, ...options });
  }
  async press(key, options = {}) {
    await this._page._channel.keyboardPress({ key, ...options });
  }
}
class Mouse {
  constructor(page) {
    this._page = page;
  }
  async move(x, y, options = {}) {
    await this._page._channel.mouseMove({ x, y, ...options });
  }
  async down(options = {}) {
    await this._page._channel.mouseDown({ ...options });
  }
  async up(options = {}) {
    await this._page._channel.mouseUp(options);
  }
  async click(x, y, options = {}) {
    await this._page._channel.mouseClick({ x, y, ...options });
  }
  async dblclick(x, y, options = {}) {
    await this._page._wrapApiCall(async () => {
      await this.click(x, y, { ...options, clickCount: 2 });
    }, { title: "Double click" });
  }
  async wheel(deltaX, deltaY) {
    await this._page._channel.mouseWheel({ deltaX, deltaY });
  }
}
class Touchscreen {
  constructor(page) {
    this._page = page;
  }
  async tap(x, y) {
    await this._page._channel.touchscreenTap({ x, y });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Keyboard,
  Mouse,
  Touchscreen
});
