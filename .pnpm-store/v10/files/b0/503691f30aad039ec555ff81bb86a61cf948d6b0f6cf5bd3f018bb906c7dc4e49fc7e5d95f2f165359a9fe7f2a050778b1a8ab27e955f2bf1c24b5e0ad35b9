"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = widthParser;
const unitRegex = /[\d.,]*(\D*)$/;
function widthParser(width, options = {}) {
  const {
    parseFloatToInt = true
  } = options;
  const widthUnit = unitRegex.exec(width.toString())[1];
  const unitParsers = {
    default: parseInt,
    px: parseInt,
    '%': parseFloatToInt ? parseInt : parseFloat
  };
  const parser = unitParsers[widthUnit] || unitParsers.default;
  return {
    parsedWidth: parser(width),
    unit: widthUnit || 'px'
  };
}
module.exports = exports.default;