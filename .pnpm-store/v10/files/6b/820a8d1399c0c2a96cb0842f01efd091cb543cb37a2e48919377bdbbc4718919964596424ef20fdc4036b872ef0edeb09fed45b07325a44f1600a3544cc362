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
var colors_exports = {};
__export(colors_exports, {
  noColors: () => noColors,
  webColors: () => webColors
});
module.exports = __toCommonJS(colors_exports);
const webColors = {
  enabled: true,
  reset: (text) => applyStyle(0, 0, text),
  bold: (text) => applyStyle(1, 22, text),
  dim: (text) => applyStyle(2, 22, text),
  italic: (text) => applyStyle(3, 23, text),
  underline: (text) => applyStyle(4, 24, text),
  inverse: (text) => applyStyle(7, 27, text),
  hidden: (text) => applyStyle(8, 28, text),
  strikethrough: (text) => applyStyle(9, 29, text),
  black: (text) => applyStyle(30, 39, text),
  red: (text) => applyStyle(31, 39, text),
  green: (text) => applyStyle(32, 39, text),
  yellow: (text) => applyStyle(33, 39, text),
  blue: (text) => applyStyle(34, 39, text),
  magenta: (text) => applyStyle(35, 39, text),
  cyan: (text) => applyStyle(36, 39, text),
  white: (text) => applyStyle(37, 39, text),
  gray: (text) => applyStyle(90, 39, text),
  grey: (text) => applyStyle(90, 39, text)
};
const noColors = {
  enabled: false,
  reset: (t) => t,
  bold: (t) => t,
  dim: (t) => t,
  italic: (t) => t,
  underline: (t) => t,
  inverse: (t) => t,
  hidden: (t) => t,
  strikethrough: (t) => t,
  black: (t) => t,
  red: (t) => t,
  green: (t) => t,
  yellow: (t) => t,
  blue: (t) => t,
  magenta: (t) => t,
  cyan: (t) => t,
  white: (t) => t,
  gray: (t) => t,
  grey: (t) => t
};
const applyStyle = (open, close, text) => `\x1B[${open}m${text}\x1B[${close}m`;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  noColors,
  webColors
});
