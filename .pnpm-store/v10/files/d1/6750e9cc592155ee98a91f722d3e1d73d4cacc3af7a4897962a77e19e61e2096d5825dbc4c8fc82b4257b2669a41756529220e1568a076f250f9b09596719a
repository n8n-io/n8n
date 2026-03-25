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
var imageChannel_exports = {};
__export(imageChannel_exports, {
  ImageChannel: () => ImageChannel
});
module.exports = __toCommonJS(imageChannel_exports);
var import_colorUtils = require("./colorUtils");
class ImageChannel {
  static intoRGB(width, height, data, options = {}) {
    const {
      paddingSize = 0,
      paddingColorOdd = [255, 0, 255],
      paddingColorEven = [0, 255, 0]
    } = options;
    const newWidth = width + 2 * paddingSize;
    const newHeight = height + 2 * paddingSize;
    const r = new Uint8Array(newWidth * newHeight);
    const g = new Uint8Array(newWidth * newHeight);
    const b = new Uint8Array(newWidth * newHeight);
    for (let y = 0; y < newHeight; ++y) {
      for (let x = 0; x < newWidth; ++x) {
        const index = y * newWidth + x;
        if (y >= paddingSize && y < newHeight - paddingSize && x >= paddingSize && x < newWidth - paddingSize) {
          const offset = ((y - paddingSize) * width + (x - paddingSize)) * 4;
          const alpha = data[offset + 3] === 255 ? 1 : data[offset + 3] / 255;
          r[index] = (0, import_colorUtils.blendWithWhite)(data[offset], alpha);
          g[index] = (0, import_colorUtils.blendWithWhite)(data[offset + 1], alpha);
          b[index] = (0, import_colorUtils.blendWithWhite)(data[offset + 2], alpha);
        } else {
          const color = (y + x) % 2 === 0 ? paddingColorEven : paddingColorOdd;
          r[index] = color[0];
          g[index] = color[1];
          b[index] = color[2];
        }
      }
    }
    return [
      new ImageChannel(newWidth, newHeight, r),
      new ImageChannel(newWidth, newHeight, g),
      new ImageChannel(newWidth, newHeight, b)
    ];
  }
  constructor(width, height, data) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
  get(x, y) {
    return this.data[y * this.width + x];
  }
  boundXY(x, y) {
    return [
      Math.min(Math.max(x, 0), this.width - 1),
      Math.min(Math.max(y, 0), this.height - 1)
    ];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ImageChannel
});
