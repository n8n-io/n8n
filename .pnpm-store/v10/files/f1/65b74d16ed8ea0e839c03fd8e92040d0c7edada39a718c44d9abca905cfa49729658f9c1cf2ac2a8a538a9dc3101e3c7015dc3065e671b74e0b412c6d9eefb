"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var wkInput_exports = {};
__export(wkInput_exports, {
  RawKeyboardImpl: () => RawKeyboardImpl,
  RawMouseImpl: () => RawMouseImpl,
  RawTouchscreenImpl: () => RawTouchscreenImpl
});
module.exports = __toCommonJS(wkInput_exports);
var import_utils = require("../../utils");
var input = __toESM(require("../input"));
var import_macEditingCommands = require("../macEditingCommands");
function toModifiersMask(modifiers) {
  let mask = 0;
  if (modifiers.has("Shift"))
    mask |= 1;
  if (modifiers.has("Control"))
    mask |= 2;
  if (modifiers.has("Alt"))
    mask |= 4;
  if (modifiers.has("Meta"))
    mask |= 8;
  return mask;
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
  constructor(session) {
    this._pageProxySession = session;
  }
  setSession(session) {
    this._session = session;
  }
  async keydown(progress, modifiers, keyName, description, autoRepeat) {
    const parts = [];
    for (const modifier of ["Shift", "Control", "Alt", "Meta"]) {
      if (modifiers.has(modifier))
        parts.push(modifier);
    }
    const { code, keyCode, key, text } = description;
    parts.push(code);
    const shortcut = parts.join("+");
    let commands = import_macEditingCommands.macEditingCommands[shortcut];
    if ((0, import_utils.isString)(commands))
      commands = [commands];
    await progress.race(this._pageProxySession.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      modifiers: toModifiersMask(modifiers),
      windowsVirtualKeyCode: keyCode,
      code,
      key,
      text,
      unmodifiedText: text,
      autoRepeat,
      macCommands: commands,
      isKeypad: description.location === input.keypadLocation
    }));
  }
  async keyup(progress, modifiers, keyName, description) {
    const { code, key } = description;
    await progress.race(this._pageProxySession.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers: toModifiersMask(modifiers),
      key,
      windowsVirtualKeyCode: description.keyCode,
      code,
      isKeypad: description.location === input.keypadLocation
    }));
  }
  async sendText(progress, text) {
    await progress.race(this._session.send("Page.insertText", { text }));
  }
}
class RawMouseImpl {
  constructor(session) {
    this._pageProxySession = session;
  }
  setSession(session) {
    this._session = session;
  }
  async move(progress, x, y, button, buttons, modifiers, forClick) {
    await progress.race(this._pageProxySession.send("Input.dispatchMouseEvent", {
      type: "move",
      button,
      buttons: toButtonsMask(buttons),
      x,
      y,
      modifiers: toModifiersMask(modifiers)
    }));
  }
  async down(progress, x, y, button, buttons, modifiers, clickCount) {
    await progress.race(this._pageProxySession.send("Input.dispatchMouseEvent", {
      type: "down",
      button,
      buttons: toButtonsMask(buttons),
      x,
      y,
      modifiers: toModifiersMask(modifiers),
      clickCount
    }));
  }
  async up(progress, x, y, button, buttons, modifiers, clickCount) {
    await progress.race(this._pageProxySession.send("Input.dispatchMouseEvent", {
      type: "up",
      button,
      buttons: toButtonsMask(buttons),
      x,
      y,
      modifiers: toModifiersMask(modifiers),
      clickCount
    }));
  }
  async wheel(progress, x, y, buttons, modifiers, deltaX, deltaY) {
    if (this._page?.browserContext._options.isMobile)
      throw new Error("Mouse wheel is not supported in mobile WebKit");
    await this._session.send("Page.updateScrollingState");
    await progress.race(this._page.mainFrame().evaluateExpression(`new Promise(requestAnimationFrame)`, { world: "utility" }));
    await progress.race(this._pageProxySession.send("Input.dispatchWheelEvent", {
      x,
      y,
      deltaX,
      deltaY,
      modifiers: toModifiersMask(modifiers)
    }));
  }
  setPage(page) {
    this._page = page;
  }
}
class RawTouchscreenImpl {
  constructor(session) {
    this._pageProxySession = session;
  }
  async tap(progress, x, y, modifiers) {
    await progress.race(this._pageProxySession.send("Input.dispatchTapEvent", {
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
