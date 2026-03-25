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
var stats_exports = {};
__export(stats_exports, {
  FastStats: () => FastStats,
  ssim: () => ssim
});
module.exports = __toCommonJS(stats_exports);
const DYNAMIC_RANGE = 2 ** 8 - 1;
function ssim(stats, x1, y1, x2, y2) {
  const mean1 = stats.meanC1(x1, y1, x2, y2);
  const mean2 = stats.meanC2(x1, y1, x2, y2);
  const var1 = stats.varianceC1(x1, y1, x2, y2);
  const var2 = stats.varianceC2(x1, y1, x2, y2);
  const cov = stats.covariance(x1, y1, x2, y2);
  const c1 = (0.01 * DYNAMIC_RANGE) ** 2;
  const c2 = (0.03 * DYNAMIC_RANGE) ** 2;
  return (2 * mean1 * mean2 + c1) * (2 * cov + c2) / (mean1 ** 2 + mean2 ** 2 + c1) / (var1 + var2 + c2);
}
class FastStats {
  constructor(c1, c2) {
    this.c1 = c1;
    this.c2 = c2;
    const { width, height } = c1;
    this._partialSumC1 = new Array(width * height);
    this._partialSumC2 = new Array(width * height);
    this._partialSumSq1 = new Array(width * height);
    this._partialSumSq2 = new Array(width * height);
    this._partialSumMult = new Array(width * height);
    const recalc = (mx, idx, initial, x, y) => {
      mx[idx] = initial;
      if (y > 0)
        mx[idx] += mx[(y - 1) * width + x];
      if (x > 0)
        mx[idx] += mx[y * width + x - 1];
      if (x > 0 && y > 0)
        mx[idx] -= mx[(y - 1) * width + x - 1];
    };
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const idx = y * width + x;
        recalc(this._partialSumC1, idx, this.c1.data[idx], x, y);
        recalc(this._partialSumC2, idx, this.c2.data[idx], x, y);
        recalc(this._partialSumSq1, idx, this.c1.data[idx] * this.c1.data[idx], x, y);
        recalc(this._partialSumSq2, idx, this.c2.data[idx] * this.c2.data[idx], x, y);
        recalc(this._partialSumMult, idx, this.c1.data[idx] * this.c2.data[idx], x, y);
      }
    }
  }
  _sum(partialSum, x1, y1, x2, y2) {
    const width = this.c1.width;
    let result = partialSum[y2 * width + x2];
    if (y1 > 0)
      result -= partialSum[(y1 - 1) * width + x2];
    if (x1 > 0)
      result -= partialSum[y2 * width + x1 - 1];
    if (x1 > 0 && y1 > 0)
      result += partialSum[(y1 - 1) * width + x1 - 1];
    return result;
  }
  meanC1(x1, y1, x2, y2) {
    const N = (y2 - y1 + 1) * (x2 - x1 + 1);
    return this._sum(this._partialSumC1, x1, y1, x2, y2) / N;
  }
  meanC2(x1, y1, x2, y2) {
    const N = (y2 - y1 + 1) * (x2 - x1 + 1);
    return this._sum(this._partialSumC2, x1, y1, x2, y2) / N;
  }
  varianceC1(x1, y1, x2, y2) {
    const N = (y2 - y1 + 1) * (x2 - x1 + 1);
    return (this._sum(this._partialSumSq1, x1, y1, x2, y2) - this._sum(this._partialSumC1, x1, y1, x2, y2) ** 2 / N) / N;
  }
  varianceC2(x1, y1, x2, y2) {
    const N = (y2 - y1 + 1) * (x2 - x1 + 1);
    return (this._sum(this._partialSumSq2, x1, y1, x2, y2) - this._sum(this._partialSumC2, x1, y1, x2, y2) ** 2 / N) / N;
  }
  covariance(x1, y1, x2, y2) {
    const N = (y2 - y1 + 1) * (x2 - x1 + 1);
    return (this._sum(this._partialSumMult, x1, y1, x2, y2) - this._sum(this._partialSumC1, x1, y1, x2, y2) * this._sum(this._partialSumC2, x1, y1, x2, y2) / N) / N;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FastStats,
  ssim
});
