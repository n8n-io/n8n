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
var bidiInput_exports = {};
__export(bidiInput_exports, {
  RawKeyboardImpl: () => RawKeyboardImpl,
  RawMouseImpl: () => RawMouseImpl,
  RawTouchscreenImpl: () => RawTouchscreenImpl
});
module.exports = __toCommonJS(bidiInput_exports);
var import_input = require("../input");
var import_bidiKeyboard = require("./third_party/bidiKeyboard");
var bidi = __toESM(require("./third_party/bidiProtocol"));
class RawKeyboardImpl {
  constructor(session) {
    this._session = session;
  }
  setSession(session) {
    this._session = session;
  }
  async keydown(progress, modifiers, keyName, description, autoRepeat) {
    keyName = (0, import_input.resolveSmartModifierString)(keyName);
    const actions = [];
    actions.push({ type: "keyDown", value: (0, import_bidiKeyboard.getBidiKeyValue)(keyName) });
    await this._performActions(progress, actions);
  }
  async keyup(progress, modifiers, keyName, description) {
    keyName = (0, import_input.resolveSmartModifierString)(keyName);
    const actions = [];
    actions.push({ type: "keyUp", value: (0, import_bidiKeyboard.getBidiKeyValue)(keyName) });
    await this._performActions(progress, actions);
  }
  async sendText(progress, text) {
    const actions = [];
    for (const char of text) {
      const value = (0, import_bidiKeyboard.getBidiKeyValue)(char);
      actions.push({ type: "keyDown", value });
      actions.push({ type: "keyUp", value });
    }
    await this._performActions(progress, actions);
  }
  async _performActions(progress, actions) {
    await progress.race(this._session.send("input.performActions", {
      context: this._session.sessionId,
      actions: [
        {
          type: "key",
          id: "pw_keyboard",
          actions
        }
      ]
    }));
  }
}
class RawMouseImpl {
  constructor(session) {
    this._session = session;
  }
  async move(progress, x, y, button, buttons, modifiers, forClick) {
    await this._performActions(progress, [{ type: "pointerMove", x, y }]);
  }
  async down(progress, x, y, button, buttons, modifiers, clickCount) {
    await this._performActions(progress, [{ type: "pointerDown", button: toBidiButton(button) }]);
  }
  async up(progress, x, y, button, buttons, modifiers, clickCount) {
    await this._performActions(progress, [{ type: "pointerUp", button: toBidiButton(button) }]);
  }
  async wheel(progress, x, y, buttons, modifiers, deltaX, deltaY) {
    x = Math.floor(x);
    y = Math.floor(y);
    await progress.race(this._session.send("input.performActions", {
      context: this._session.sessionId,
      actions: [
        {
          type: "wheel",
          id: "pw_mouse_wheel",
          actions: [{ type: "scroll", x, y, deltaX, deltaY }]
        }
      ]
    }));
  }
  async _performActions(progress, actions) {
    await progress.race(this._session.send("input.performActions", {
      context: this._session.sessionId,
      actions: [
        {
          type: "pointer",
          id: "pw_mouse",
          parameters: {
            pointerType: bidi.Input.PointerType.Mouse
          },
          actions
        }
      ]
    }));
  }
}
class RawTouchscreenImpl {
  constructor(session) {
    this._session = session;
  }
  async tap(progress, x, y, modifiers) {
  }
}
function toBidiButton(button) {
  switch (button) {
    case "left":
      return 0;
    case "right":
      return 2;
    case "middle":
      return 1;
  }
  throw new Error("Unknown button: " + button);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RawKeyboardImpl,
  RawMouseImpl,
  RawTouchscreenImpl
});
