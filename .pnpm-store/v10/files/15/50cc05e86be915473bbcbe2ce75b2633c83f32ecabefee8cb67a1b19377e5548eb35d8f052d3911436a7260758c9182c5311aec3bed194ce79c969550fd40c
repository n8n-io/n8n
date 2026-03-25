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
var colorUtils_exports = {};
__export(colorUtils_exports, {
  blendWithWhite: () => blendWithWhite,
  colorDeltaE94: () => colorDeltaE94,
  rgb2gray: () => rgb2gray,
  srgb2xyz: () => srgb2xyz,
  xyz2lab: () => xyz2lab
});
module.exports = __toCommonJS(colorUtils_exports);
function blendWithWhite(c, a) {
  return 255 + (c - 255) * a;
}
function rgb2gray(r, g, b) {
  return 77 * r + 150 * g + 29 * b + 128 >> 8;
}
function colorDeltaE94(rgb1, rgb2) {
  const [l1, a1, b1] = xyz2lab(srgb2xyz(rgb1));
  const [l2, a2, b2] = xyz2lab(srgb2xyz(rgb2));
  const deltaL = l1 - l2;
  const deltaA = a1 - a2;
  const deltaB = b1 - b2;
  const c1 = Math.sqrt(a1 ** 2 + b1 ** 2);
  const c2 = Math.sqrt(a2 ** 2 + b2 ** 2);
  const deltaC = c1 - c2;
  let deltaH = deltaA ** 2 + deltaB ** 2 - deltaC ** 2;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  const k1 = 0.045;
  const k2 = 0.015;
  const kL = 1;
  const kC = 1;
  const kH = 1;
  const sC = 1 + k1 * c1;
  const sH = 1 + k2 * c1;
  const sL = 1;
  return Math.sqrt((deltaL / sL / kL) ** 2 + (deltaC / sC / kC) ** 2 + (deltaH / sH / kH) ** 2);
}
function srgb2xyz(rgb) {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  return [
    r * 0.4124 + g * 0.3576 + b * 0.1805,
    r * 0.2126 + g * 0.7152 + b * 0.0722,
    r * 0.0193 + g * 0.1192 + b * 0.9505
  ];
}
const sigma_pow2 = 6 * 6 / 29 / 29;
const sigma_pow3 = 6 * 6 * 6 / 29 / 29 / 29;
function xyz2lab(xyz) {
  const x = xyz[0] / 0.950489;
  const y = xyz[1];
  const z = xyz[2] / 1.08884;
  const fx = x > sigma_pow3 ? x ** (1 / 3) : x / 3 / sigma_pow2 + 4 / 29;
  const fy = y > sigma_pow3 ? y ** (1 / 3) : y / 3 / sigma_pow2 + 4 / 29;
  const fz = z > sigma_pow3 ? z ** (1 / 3) : z / 3 / sigma_pow2 + 4 / 29;
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [l, a, b];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  blendWithWhite,
  colorDeltaE94,
  rgb2gray,
  srgb2xyz,
  xyz2lab
});
