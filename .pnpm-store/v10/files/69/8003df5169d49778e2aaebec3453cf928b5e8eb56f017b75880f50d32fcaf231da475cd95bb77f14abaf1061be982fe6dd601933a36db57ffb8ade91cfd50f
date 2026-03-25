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
var utilsBundle_exports = {};
__export(utilsBundle_exports, {
  chokidar: () => chokidar,
  enquirer: () => enquirer,
  getEastAsianWidth: () => getEastAsianWidth,
  json5: () => json5,
  parseMarkdown: () => parseMarkdown,
  sourceMapSupport: () => sourceMapSupport,
  stoppable: () => stoppable
});
module.exports = __toCommonJS(utilsBundle_exports);
const json5 = require("./utilsBundleImpl").json5;
const sourceMapSupport = require("./utilsBundleImpl").sourceMapSupport;
const stoppable = require("./utilsBundleImpl").stoppable;
const enquirer = require("./utilsBundleImpl").enquirer;
const chokidar = require("./utilsBundleImpl").chokidar;
const getEastAsianWidth = require("./utilsBundleImpl").getEastAsianWidth;
const { unified } = require("./utilsBundleImpl").unified;
const remarkParse = require("./utilsBundleImpl").remarkParse;
function parseMarkdown(content) {
  return unified().use(remarkParse).parse(content);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  chokidar,
  enquirer,
  getEastAsianWidth,
  json5,
  parseMarkdown,
  sourceMapSupport,
  stoppable
});
