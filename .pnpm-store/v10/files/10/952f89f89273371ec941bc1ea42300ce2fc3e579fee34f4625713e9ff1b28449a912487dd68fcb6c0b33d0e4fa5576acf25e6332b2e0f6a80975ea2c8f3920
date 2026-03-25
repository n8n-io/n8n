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
var ffInput_exports = {};
__export(ffInput_exports, {
  RawKeyboardImpl: () => RawKeyboardImpl,
  RawMouseImpl: () => RawMouseImpl,
  RawTouchscreenImpl: () => RawTouchscreenImpl
});
module.exports = __toCommonJS(ffInput_exports);
function toModifiersMask(modifiers) {
  let mask = 0;
  if (modifiers.has("Alt"))
    mask |= 1;
  if (modifiers.has("Control"))
    mask |= 2;
  if (modifiers.has("Shift"))
    mask |= 4;
  if (modifiers.has("Meta"))
    mask |= 8;
  return mask;
}
function toButtonNumber(button) {
  if (button === "left")
    return 0;
  if (button === "middle")
    return 1;
  if (button === "right")
    return 2;
  return 0;
}
function toButtonsMask(buttons) {
  let mask = 0;
  if (buttons.has("left"))
    mask |= 1;
  if (buttons.has("right"))
    mask |= 2;
  if (buttons.has("middle"))
    mask |= 4;
  return mask;
}
class RawKeyboardImpl {
  constructor(client) {
    this._client = client;
  }
  async keydown(progress, modifiers, keyName, description, autoRepeat) {
    let text = description.text;
    if (text === "\r")
      text = "";
    const { code, key, location } = description;
    await progress.race(this._client.send("Page.dispatchKeyEvent", {
      type: "keydown",
      keyCode: description.keyCodeWithoutLocation,
      code,
      key,
      repeat: autoRepeat,
      location,
      text
    }));
  }
  async keyup(progress, modifiers, keyName, description) {
    const { code, key, location } = description;
    await progress.race(this._client.send("Page.dispatchKeyEvent", {
      type: "keyup",
      key,
      keyCode: description.keyCodeWithoutLocation,
      code,
      location,
      repeat: false
    }));
  }
  async sendText(progress, text) {
    await progress.race(this._client.send("Page.insertText", { text }));
  }
}
class RawMouseImpl {
  constructor(client) {
    this._client = client;
  }
  async move(progress, x, y, button, buttons, modifiers, forClick) {
    await progress.race(this._client.send("Page.dispatchMouseEvent", {
      type: "mousemove",
      button: 0,
      buttons: toButtonsMask(buttons),
      x: Math.floor(x),
      y: Math.floor(y),
      modifiers: toModifiersMask(modifiers)
    }));
  }
  async down(progress, x, y, button, buttons, modifiers, clickCount) {
    await progress.race(this._client.send("Page.dispatchMouseEvent", {
      type: "mousedown",
      button: toButtonNumber(button),
      buttons: toButtonsMask(buttons),
      x: Math.floor(x),
      y: Math.floor(y),
      modifiers: toModifiersMask(modifiers),
      clickCount
    }));
  }
  async up(progress, x, y, button, buttons, modifiers, clickCount) {
    await progress.race(this._client.send("Page.dispatchMouseEvent", {
      type: "mouseup",
      button: toButtonNumber(button),
      buttons: toButtonsMask(buttons),
      x: Math.floor(x),
      y: Math.floor(y),
      modifiers: toModifiersMask(modifiers),
      clickCount
    }));
  }
  async wheel(progress, x, y, buttons, modifiers, deltaX, deltaY) {
    await this._page.mainFrame().evaluateExpression(`new Promise(requestAnimationFrame)`, { world: "utility" });
    await progress.race(this._client.send("Page.dispatchWheelEvent", {
      deltaX,
      deltaY,
      x: Math.floor(x),
      y: Math.floor(y),
      deltaZ: 0,
      modifiers: toModifiersMask(modifiers)
    }));
  }
  setPage(page) {
    this._page = page;
  }
}
class RawTouchscreenImpl {
  constructor(client) {
    this._client = client;
  }
  async tap(progress, x, y, modifiers) {
    await progress.race(this._client.send("Page.dispatchTapEvent", {
      x,
      y,
      modifiers: toModifiersMask(modifiers)
    }));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RawKeyboardImpl,
  RawMouseImpl,
  RawTouchscreenImpl
});
