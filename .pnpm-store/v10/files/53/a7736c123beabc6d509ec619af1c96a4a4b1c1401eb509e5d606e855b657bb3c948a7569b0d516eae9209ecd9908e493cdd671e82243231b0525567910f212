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
var input_exports = {};
__export(input_exports, {
  Keyboard: () => Keyboard,
  Mouse: () => Mouse,
  Touchscreen: () => Touchscreen,
  keypadLocation: () => keypadLocation,
  resolveSmartModifier: () => resolveSmartModifier,
  resolveSmartModifierString: () => resolveSmartModifierString
});
module.exports = __toCommonJS(input_exports);
var import_utils = require("../utils");
var keyboardLayout = __toESM(require("./usKeyboardLayout"));
var import_dom = require("./dom");
const keypadLocation = keyboardLayout.keypadLocation;
const kModifiers = ["Alt", "Control", "Meta", "Shift"];
class Keyboard {
  constructor(raw, page) {
    this._pressedModifiers = /* @__PURE__ */ new Set();
    this._pressedKeys = /* @__PURE__ */ new Set();
    this._raw = raw;
    this._page = page;
  }
  async down(progress, key) {
    const description = this._keyDescriptionForString(key);
    const autoRepeat = this._pressedKeys.has(description.code);
    this._pressedKeys.add(description.code);
    if (kModifiers.includes(description.key))
      this._pressedModifiers.add(description.key);
    await this._raw.keydown(progress, this._pressedModifiers, key, description, autoRepeat);
  }
  _keyDescriptionForString(str) {
    const keyString = resolveSmartModifierString(str);
    let description = usKeyboardLayout.get(keyString);
    if (!description)
      throw new import_dom.NonRecoverableDOMError(`Unknown key: "${keyString}"`);
    const shift = this._pressedModifiers.has("Shift");
    description = shift && description.shifted ? description.shifted : description;
    if (this._pressedModifiers.size > 1 || !this._pressedModifiers.has("Shift") && this._pressedModifiers.size === 1)
      return { ...description, text: "" };
    return description;
  }
  async up(progress, key) {
    const description = this._keyDescriptionForString(key);
    if (kModifiers.includes(description.key))
      this._pressedModifiers.delete(description.key);
    this._pressedKeys.delete(description.code);
    await this._raw.keyup(progress, this._pressedModifiers, key, description);
  }
  async insertText(progress, text) {
    await this._raw.sendText(progress, text);
  }
  async type(progress, text, options) {
    const delay = options && options.delay || void 0;
    for (const char of text) {
      if (usKeyboardLayout.has(char)) {
        await this.press(progress, char, { delay });
      } else {
        if (delay)
          await progress.wait(delay);
        await this.insertText(progress, char);
      }
    }
  }
  async press(progress, key, options = {}) {
    function split(keyString) {
      const keys = [];
      let building = "";
      for (const char of keyString) {
        if (char === "+" && building) {
          keys.push(building);
          building = "";
        } else {
          building += char;
        }
      }
      keys.push(building);
      return keys;
    }
    const tokens = split(key);
    key = tokens[tokens.length - 1];
    for (let i = 0; i < tokens.length - 1; ++i)
      await this.down(progress, tokens[i]);
    await this.down(progress, key);
    if (options.delay)
      await progress.wait(options.delay);
    await this.up(progress, key);
    for (let i = tokens.length - 2; i >= 0; --i)
      await this.up(progress, tokens[i]);
  }
  async ensureModifiers(progress, mm) {
    const modifiers = mm.map(resolveSmartModifier);
    for (const modifier of modifiers) {
      if (!kModifiers.includes(modifier))
        throw new Error("Unknown modifier " + modifier);
    }
    const restore = Array.from(this._pressedModifiers);
    for (const key of kModifiers) {
      const needDown = modifiers.includes(key);
      const isDown = this._pressedModifiers.has(key);
      if (needDown && !isDown)
        await this.down(progress, key);
      else if (!needDown && isDown)
        await this.up(progress, key);
    }
    return restore;
  }
  _modifiers() {
    return this._pressedModifiers;
  }
}
function resolveSmartModifierString(key) {
  if (key === "ControlOrMeta")
    return process.platform === "darwin" ? "Meta" : "Control";
  return key;
}
function resolveSmartModifier(m) {
  return resolveSmartModifierString(m);
}
class Mouse {
  constructor(raw, page) {
    this._x = 0;
    this._y = 0;
    this._lastButton = "none";
    this._buttons = /* @__PURE__ */ new Set();
    this._raw = raw;
    this._page = page;
    this._keyboard = this._page.keyboard;
  }
  currentPoint() {
    return { x: this._x, y: this._y };
  }
  async move(progress, x, y, options = {}) {
    const { steps = 1 } = options;
    const fromX = this._x;
    const fromY = this._y;
    this._x = x;
    this._y = y;
    for (let i = 1; i <= steps; i++) {
      const middleX = fromX + (x - fromX) * (i / steps);
      const middleY = fromY + (y - fromY) * (i / steps);
      await this._raw.move(progress, middleX, middleY, this._lastButton, this._buttons, this._keyboard._modifiers(), !!options.forClick);
    }
  }
  async down(progress, options = {}) {
    const { button = "left", clickCount = 1 } = options;
    this._lastButton = button;
    this._buttons.add(button);
    await this._raw.down(progress, this._x, this._y, this._lastButton, this._buttons, this._keyboard._modifiers(), clickCount);
  }
  async up(progress, options = {}) {
    const { button = "left", clickCount = 1 } = options;
    this._lastButton = "none";
    this._buttons.delete(button);
    await this._raw.up(progress, this._x, this._y, button, this._buttons, this._keyboard._modifiers(), clickCount);
  }
  async click(progress, x, y, options = {}) {
    const { delay = null, clickCount = 1, steps } = options;
    if (delay) {
      await this.move(progress, x, y, { forClick: true, steps });
      for (let cc = 1; cc <= clickCount; ++cc) {
        await this.down(progress, { ...options, clickCount: cc });
        await progress.wait(delay);
        await this.up(progress, { ...options, clickCount: cc });
        if (cc < clickCount)
          await progress.wait(delay);
      }
    } else {
      const promises = [];
      const movePromise = this.move(progress, x, y, { forClick: true, steps });
      if (steps !== void 0 && steps > 1)
        await movePromise;
      else
        promises.push(movePromise);
      for (let cc = 1; cc <= clickCount; ++cc) {
        promises.push(this.down(progress, { ...options, clickCount: cc }));
        promises.push(this.up(progress, { ...options, clickCount: cc }));
      }
      await Promise.all(promises);
    }
  }
  async wheel(progress, deltaX, deltaY) {
    await this._raw.wheel(progress, this._x, this._y, this._buttons, this._keyboard._modifiers(), deltaX, deltaY);
  }
}
const aliases = /* @__PURE__ */ new Map([
  ["ShiftLeft", ["Shift"]],
  ["ControlLeft", ["Control"]],
  ["AltLeft", ["Alt"]],
  ["MetaLeft", ["Meta"]],
  ["Enter", ["\n", "\r"]]
]);
const usKeyboardLayout = buildLayoutClosure(keyboardLayout.USKeyboardLayout);
function buildLayoutClosure(layout) {
  const result = /* @__PURE__ */ new Map();
  for (const code in layout) {
    const definition = layout[code];
    const description = {
      key: definition.key || "",
      keyCode: definition.keyCode || 0,
      keyCodeWithoutLocation: definition.keyCodeWithoutLocation || definition.keyCode || 0,
      code,
      text: definition.text || "",
      location: definition.location || 0
    };
    if (definition.key.length === 1)
      description.text = description.key;
    let shiftedDescription;
    if (definition.shiftKey) {
      (0, import_utils.assert)(definition.shiftKey.length === 1);
      shiftedDescription = { ...description };
      shiftedDescription.key = definition.shiftKey;
      shiftedDescription.text = definition.shiftKey;
      if (definition.shiftKeyCode)
        shiftedDescription.keyCode = definition.shiftKeyCode;
    }
    result.set(code, { ...description, shifted: shiftedDescription });
    if (aliases.has(code)) {
      for (const alias of aliases.get(code))
        result.set(alias, description);
    }
    if (definition.location)
      continue;
    if (description.key.length === 1)
      result.set(description.key, description);
    if (shiftedDescription)
      result.set(shiftedDescription.key, { ...shiftedDescription, shifted: void 0 });
  }
  return result;
}
class Touchscreen {
  constructor(raw, page) {
    this._raw = raw;
    this._page = page;
  }
  async tap(progress, x, y) {
    if (!this._page.browserContext._options.hasTouch)
      throw new Error("hasTouch must be enabled on the browser context before using the touchscreen.");
    await this._raw.tap(progress, x, y, this._page.keyboard._modifiers());
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Keyboard,
  Mouse,
  Touchscreen,
  keypadLocation,
  resolveSmartModifier,
  resolveSmartModifierString
});
