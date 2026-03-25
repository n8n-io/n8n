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
var bidiPdf_exports = {};
__export(bidiPdf_exports, {
  BidiPDF: () => BidiPDF
});
module.exports = __toCommonJS(bidiPdf_exports);
var import_utils = require("../../utils");
const PagePaperFormats = {
  letter: { width: 8.5, height: 11 },
  legal: { width: 8.5, height: 14 },
  tabloid: { width: 11, height: 17 },
  ledger: { width: 17, height: 11 },
  a0: { width: 33.1, height: 46.8 },
  a1: { width: 23.4, height: 33.1 },
  a2: { width: 16.54, height: 23.4 },
  a3: { width: 11.7, height: 16.54 },
  a4: { width: 8.27, height: 11.7 },
  a5: { width: 5.83, height: 8.27 },
  a6: { width: 4.13, height: 5.83 }
};
const unitToPixels = {
  "px": 1,
  "in": 96,
  "cm": 37.8,
  "mm": 3.78
};
function convertPrintParameterToInches(text) {
  if (text === void 0)
    return void 0;
  let unit = text.substring(text.length - 2).toLowerCase();
  let valueText = "";
  if (unitToPixels.hasOwnProperty(unit)) {
    valueText = text.substring(0, text.length - 2);
  } else {
    unit = "px";
    valueText = text;
  }
  const value = Number(valueText);
  (0, import_utils.assert)(!isNaN(value), "Failed to parse parameter value: " + text);
  const pixels = value * unitToPixels[unit];
  return pixels / 96;
}
class BidiPDF {
  constructor(session) {
    this._session = session;
  }
  async generate(options) {
    const {
      scale = 1,
      printBackground = false,
      landscape = false,
      pageRanges = "",
      margin = {}
    } = options;
    let paperWidth = 8.5;
    let paperHeight = 11;
    if (options.format) {
      const format = PagePaperFormats[options.format.toLowerCase()];
      (0, import_utils.assert)(format, "Unknown paper format: " + options.format);
      paperWidth = format.width;
      paperHeight = format.height;
    } else {
      paperWidth = convertPrintParameterToInches(options.width) || paperWidth;
      paperHeight = convertPrintParameterToInches(options.height) || paperHeight;
    }
    const { data } = await this._session.send("browsingContext.print", {
      context: this._session.sessionId,
      background: printBackground,
      margin: {
        bottom: convertPrintParameterToInches(margin.bottom) || 0,
        left: convertPrintParameterToInches(margin.left) || 0,
        right: convertPrintParameterToInches(margin.right) || 0,
        top: convertPrintParameterToInches(margin.top) || 0
      },
      orientation: landscape ? "landscape" : "portrait",
      page: {
        width: paperWidth,
        height: paperHeight
      },
      pageRanges: pageRanges ? pageRanges.split(",").map((r) => r.trim()) : void 0,
      scale
    });
    return Buffer.from(data, "base64");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiPDF
});
