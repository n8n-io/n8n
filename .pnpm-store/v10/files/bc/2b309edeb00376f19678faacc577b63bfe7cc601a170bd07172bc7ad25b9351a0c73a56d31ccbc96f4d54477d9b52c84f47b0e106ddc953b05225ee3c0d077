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
var bidiKeyboard_exports = {};
__export(bidiKeyboard_exports, {
  getBidiKeyValue: () => getBidiKeyValue
});
module.exports = __toCommonJS(bidiKeyboard_exports);
/**
 * @license
 * Copyright 2024 Google Inc.
 * Modifications copyright (c) Microsoft Corporation.
 * SPDX-License-Identifier: Apache-2.0
 */
const getBidiKeyValue = (keyName) => {
  switch (keyName) {
    case "\r":
    case "\n":
      keyName = "Enter";
      break;
  }
  if ([...keyName].length === 1) {
    return keyName;
  }
  switch (keyName) {
    case "Cancel":
      return "\uE001";
    case "Help":
      return "\uE002";
    case "Backspace":
      return "\uE003";
    case "Tab":
      return "\uE004";
    case "Clear":
      return "\uE005";
    case "Enter":
      return "\uE007";
    case "Shift":
    case "ShiftLeft":
      return "\uE008";
    case "Control":
    case "ControlLeft":
      return "\uE009";
    case "Alt":
    case "AltLeft":
      return "\uE00A";
    case "Pause":
      return "\uE00B";
    case "Escape":
      return "\uE00C";
    case "PageUp":
      return "\uE00E";
    case "PageDown":
      return "\uE00F";
    case "End":
      return "\uE010";
    case "Home":
      return "\uE011";
    case "ArrowLeft":
      return "\uE012";
    case "ArrowUp":
      return "\uE013";
    case "ArrowRight":
      return "\uE014";
    case "ArrowDown":
      return "\uE015";
    case "Insert":
      return "\uE016";
    case "Delete":
      return "\uE017";
    case "NumpadEqual":
      return "\uE019";
    case "Numpad0":
      return "\uE01A";
    case "Numpad1":
      return "\uE01B";
    case "Numpad2":
      return "\uE01C";
    case "Numpad3":
      return "\uE01D";
    case "Numpad4":
      return "\uE01E";
    case "Numpad5":
      return "\uE01F";
    case "Numpad6":
      return "\uE020";
    case "Numpad7":
      return "\uE021";
    case "Numpad8":
      return "\uE022";
    case "Numpad9":
      return "\uE023";
    case "NumpadMultiply":
      return "\uE024";
    case "NumpadAdd":
      return "\uE025";
    case "NumpadSubtract":
      return "\uE027";
    case "NumpadDecimal":
      return "\uE028";
    case "NumpadDivide":
      return "\uE029";
    case "F1":
      return "\uE031";
    case "F2":
      return "\uE032";
    case "F3":
      return "\uE033";
    case "F4":
      return "\uE034";
    case "F5":
      return "\uE035";
    case "F6":
      return "\uE036";
    case "F7":
      return "\uE037";
    case "F8":
      return "\uE038";
    case "F9":
      return "\uE039";
    case "F10":
      return "\uE03A";
    case "F11":
      return "\uE03B";
    case "F12":
      return "\uE03C";
    case "Meta":
    case "MetaLeft":
      return "\uE03D";
    case "ShiftRight":
      return "\uE050";
    case "ControlRight":
      return "\uE051";
    case "AltRight":
      return "\uE052";
    case "MetaRight":
      return "\uE053";
    case "Space":
      return " ";
    case "Digit0":
      return "0";
    case "Digit1":
      return "1";
    case "Digit2":
      return "2";
    case "Digit3":
      return "3";
    case "Digit4":
      return "4";
    case "Digit5":
      return "5";
    case "Digit6":
      return "6";
    case "Digit7":
      return "7";
    case "Digit8":
      return "8";
    case "Digit9":
      return "9";
    case "KeyA":
      return "a";
    case "KeyB":
      return "b";
    case "KeyC":
      return "c";
    case "KeyD":
      return "d";
    case "KeyE":
      return "e";
    case "KeyF":
      return "f";
    case "KeyG":
      return "g";
    case "KeyH":
      return "h";
    case "KeyI":
      return "i";
    case "KeyJ":
      return "j";
    case "KeyK":
      return "k";
    case "KeyL":
      return "l";
    case "KeyM":
      return "m";
    case "KeyN":
      return "n";
    case "KeyO":
      return "o";
    case "KeyP":
      return "p";
    case "KeyQ":
      return "q";
    case "KeyR":
      return "r";
    case "KeyS":
      return "s";
    case "KeyT":
      return "t";
    case "KeyU":
      return "u";
    case "KeyV":
      return "v";
    case "KeyW":
      return "w";
    case "KeyX":
      return "x";
    case "KeyY":
      return "y";
    case "KeyZ":
      return "z";
    case "Semicolon":
      return ";";
    case "Equal":
      return "=";
    case "Comma":
      return ",";
    case "Minus":
      return "-";
    case "Period":
      return ".";
    case "Slash":
      return "/";
    case "Backquote":
      return "`";
    case "BracketLeft":
      return "[";
    case "Backslash":
      return "\\";
    case "BracketRight":
      return "]";
    case "Quote":
      return '"';
    default:
      throw new Error(`Unknown key: "${keyName}"`);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getBidiKeyValue
});
