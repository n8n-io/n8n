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
var comparators_exports = {};
__export(comparators_exports, {
  compareBuffersOrStrings: () => compareBuffersOrStrings,
  getComparator: () => getComparator
});
module.exports = __toCommonJS(comparators_exports);
var import_compare = require("./image_tools/compare");
var import_pixelmatch = __toESM(require("../../third_party/pixelmatch"));
var import_utilsBundle = require("../../utilsBundle");
var import_utilsBundle2 = require("../../utilsBundle");
var import_utilsBundle3 = require("../../utilsBundle");
var import_imageUtils = require("./imageUtils");
function getComparator(mimeType) {
  if (mimeType === "image/png")
    return compareImages.bind(null, "image/png");
  if (mimeType === "image/jpeg")
    return compareImages.bind(null, "image/jpeg");
  if (mimeType === "text/plain")
    return compareText;
  return compareBuffersOrStrings;
}
const JPEG_JS_MAX_BUFFER_SIZE_IN_MB = 5 * 1024;
function compareBuffersOrStrings(actualBuffer, expectedBuffer) {
  if (typeof actualBuffer === "string")
    return compareText(actualBuffer, expectedBuffer);
  if (!actualBuffer || !(actualBuffer instanceof Buffer))
    return { errorMessage: "Actual result should be a Buffer or a string." };
  if (Buffer.compare(actualBuffer, expectedBuffer))
    return { errorMessage: "Buffers differ" };
  return null;
}
function compareImages(mimeType, actualBuffer, expectedBuffer, options = {}) {
  if (!actualBuffer || !(actualBuffer instanceof Buffer))
    return { errorMessage: "Actual result should be a Buffer." };
  validateBuffer(expectedBuffer, mimeType);
  let actual = mimeType === "image/png" ? import_utilsBundle3.PNG.sync.read(actualBuffer) : import_utilsBundle.jpegjs.decode(actualBuffer, { maxMemoryUsageInMB: JPEG_JS_MAX_BUFFER_SIZE_IN_MB });
  let expected = mimeType === "image/png" ? import_utilsBundle3.PNG.sync.read(expectedBuffer) : import_utilsBundle.jpegjs.decode(expectedBuffer, { maxMemoryUsageInMB: JPEG_JS_MAX_BUFFER_SIZE_IN_MB });
  const size = { width: Math.max(expected.width, actual.width), height: Math.max(expected.height, actual.height) };
  let sizesMismatchError = "";
  if (expected.width !== actual.width || expected.height !== actual.height) {
    sizesMismatchError = `Expected an image ${expected.width}px by ${expected.height}px, received ${actual.width}px by ${actual.height}px. `;
    actual = (0, import_imageUtils.padImageToSize)(actual, size);
    expected = (0, import_imageUtils.padImageToSize)(expected, size);
  }
  const diff2 = new import_utilsBundle3.PNG({ width: size.width, height: size.height });
  let count;
  if (options.comparator === "ssim-cie94") {
    count = (0, import_compare.compare)(expected.data, actual.data, diff2.data, size.width, size.height, {
      // All ΔE* formulae are originally designed to have the difference of 1.0 stand for a "just noticeable difference" (JND).
      // See https://en.wikipedia.org/wiki/Color_difference#CIELAB_%CE%94E*
      maxColorDeltaE94: 1
    });
  } else if ((options.comparator ?? "pixelmatch") === "pixelmatch") {
    count = (0, import_pixelmatch.default)(expected.data, actual.data, diff2.data, size.width, size.height, {
      threshold: options.threshold ?? 0.2
    });
  } else {
    throw new Error(`Configuration specifies unknown comparator "${options.comparator}"`);
  }
  const maxDiffPixels1 = options.maxDiffPixels;
  const maxDiffPixels2 = options.maxDiffPixelRatio !== void 0 ? expected.width * expected.height * options.maxDiffPixelRatio : void 0;
  let maxDiffPixels;
  if (maxDiffPixels1 !== void 0 && maxDiffPixels2 !== void 0)
    maxDiffPixels = Math.min(maxDiffPixels1, maxDiffPixels2);
  else
    maxDiffPixels = maxDiffPixels1 ?? maxDiffPixels2 ?? 0;
  const ratio = Math.ceil(count / (expected.width * expected.height) * 100) / 100;
  const pixelsMismatchError = count > maxDiffPixels ? `${count} pixels (ratio ${ratio.toFixed(2)} of all image pixels) are different.` : "";
  if (pixelsMismatchError || sizesMismatchError)
    return { errorMessage: sizesMismatchError + pixelsMismatchError, diff: import_utilsBundle3.PNG.sync.write(diff2) };
  return null;
}
function validateBuffer(buffer, mimeType) {
  if (mimeType === "image/png") {
    const pngMagicNumber = [137, 80, 78, 71, 13, 10, 26, 10];
    if (buffer.length < pngMagicNumber.length || !pngMagicNumber.every((byte, index) => buffer[index] === byte))
      throw new Error("Could not decode expected image as PNG.");
  } else if (mimeType === "image/jpeg") {
    const jpegMagicNumber = [255, 216];
    if (buffer.length < jpegMagicNumber.length || !jpegMagicNumber.every((byte, index) => buffer[index] === byte))
      throw new Error("Could not decode expected image as JPEG.");
  }
}
function compareText(actual, expectedBuffer) {
  if (typeof actual !== "string")
    return { errorMessage: "Actual result should be a string" };
  let expected = expectedBuffer.toString("utf-8");
  if (expected === actual)
    return null;
  if (!actual.endsWith("\n"))
    actual += "\n";
  if (!expected.endsWith("\n"))
    expected += "\n";
  const lines = import_utilsBundle2.diff.createPatch("file", expected, actual, void 0, void 0, { context: 5 }).split("\n");
  const coloredLines = lines.slice(4).map((line) => {
    if (line.startsWith("-"))
      return import_utilsBundle2.colors.green(line);
    if (line.startsWith("+"))
      return import_utilsBundle2.colors.red(line);
    if (line.startsWith("@@"))
      return import_utilsBundle2.colors.dim(line);
    return line;
  });
  const errorMessage = coloredLines.join("\n");
  return { errorMessage };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  compareBuffersOrStrings,
  getComparator
});
