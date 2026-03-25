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
var compare_exports = {};
__export(compare_exports, {
  compare: () => compare
});
module.exports = __toCommonJS(compare_exports);
var import_colorUtils = require("./colorUtils");
var import_imageChannel = require("./imageChannel");
var import_stats = require("./stats");
const SSIM_WINDOW_RADIUS = 15;
const VARIANCE_WINDOW_RADIUS = 1;
function drawPixel(width, data, x, y, r, g, b) {
  const idx = (y * width + x) * 4;
  data[idx + 0] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = 255;
}
function compare(actual, expected, diff, width, height, options = {}) {
  const {
    maxColorDeltaE94 = 1
  } = options;
  const paddingSize = Math.max(VARIANCE_WINDOW_RADIUS, SSIM_WINDOW_RADIUS);
  const paddingColorEven = [255, 0, 255];
  const paddingColorOdd = [0, 255, 0];
  const [r1, g1, b1] = import_imageChannel.ImageChannel.intoRGB(width, height, expected, {
    paddingSize,
    paddingColorEven,
    paddingColorOdd
  });
  const [r2, g2, b2] = import_imageChannel.ImageChannel.intoRGB(width, height, actual, {
    paddingSize,
    paddingColorEven,
    paddingColorOdd
  });
  const noop = (x, y) => {
  };
  const drawRedPixel = diff ? (x, y) => drawPixel(width, diff, x - paddingSize, y - paddingSize, 255, 0, 0) : noop;
  const drawYellowPixel = diff ? (x, y) => drawPixel(width, diff, x - paddingSize, y - paddingSize, 255, 255, 0) : noop;
  const drawGrayPixel = diff ? (x, y) => {
    const gray = (0, import_colorUtils.rgb2gray)(r1.get(x, y), g1.get(x, y), b1.get(x, y));
    const value = (0, import_colorUtils.blendWithWhite)(gray, 0.1);
    drawPixel(width, diff, x - paddingSize, y - paddingSize, value, value, value);
  } : noop;
  let fastR, fastG, fastB;
  let diffCount = 0;
  for (let y = paddingSize; y < r1.height - paddingSize; ++y) {
    for (let x = paddingSize; x < r1.width - paddingSize; ++x) {
      if (r1.get(x, y) === r2.get(x, y) && g1.get(x, y) === g2.get(x, y) && b1.get(x, y) === b2.get(x, y)) {
        drawGrayPixel(x, y);
        continue;
      }
      const delta = (0, import_colorUtils.colorDeltaE94)(
        [r1.get(x, y), g1.get(x, y), b1.get(x, y)],
        [r2.get(x, y), g2.get(x, y), b2.get(x, y)]
      );
      if (delta <= maxColorDeltaE94) {
        drawGrayPixel(x, y);
        continue;
      }
      if (!fastR || !fastG || !fastB) {
        fastR = new import_stats.FastStats(r1, r2);
        fastG = new import_stats.FastStats(g1, g2);
        fastB = new import_stats.FastStats(b1, b2);
      }
      const [varX1, varY1] = r1.boundXY(x - VARIANCE_WINDOW_RADIUS, y - VARIANCE_WINDOW_RADIUS);
      const [varX2, varY2] = r1.boundXY(x + VARIANCE_WINDOW_RADIUS, y + VARIANCE_WINDOW_RADIUS);
      const var1 = fastR.varianceC1(varX1, varY1, varX2, varY2) + fastG.varianceC1(varX1, varY1, varX2, varY2) + fastB.varianceC1(varX1, varY1, varX2, varY2);
      const var2 = fastR.varianceC2(varX1, varY1, varX2, varY2) + fastG.varianceC2(varX1, varY1, varX2, varY2) + fastB.varianceC2(varX1, varY1, varX2, varY2);
      if (var1 === 0 || var2 === 0) {
        drawRedPixel(x, y);
        ++diffCount;
        continue;
      }
      const [ssimX1, ssimY1] = r1.boundXY(x - SSIM_WINDOW_RADIUS, y - SSIM_WINDOW_RADIUS);
      const [ssimX2, ssimY2] = r1.boundXY(x + SSIM_WINDOW_RADIUS, y + SSIM_WINDOW_RADIUS);
      const ssimRGB = ((0, import_stats.ssim)(fastR, ssimX1, ssimY1, ssimX2, ssimY2) + (0, import_stats.ssim)(fastG, ssimX1, ssimY1, ssimX2, ssimY2) + (0, import_stats.ssim)(fastB, ssimX1, ssimY1, ssimX2, ssimY2)) / 3;
      const isAntialiased = ssimRGB >= 0.99;
      if (isAntialiased) {
        drawYellowPixel(x, y);
      } else {
        drawRedPixel(x, y);
        ++diffCount;
      }
    }
  }
  return diffCount;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  compare
});
