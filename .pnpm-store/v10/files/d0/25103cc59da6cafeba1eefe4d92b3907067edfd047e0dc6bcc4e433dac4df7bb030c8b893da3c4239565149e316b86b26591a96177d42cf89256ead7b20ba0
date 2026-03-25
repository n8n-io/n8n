"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFloat16 = getFloat16;
exports.setFloat16 = setFloat16;
var _arrayIterator = require("./_util/arrayIterator.cjs");
var _converter = require("./_util/converter.cjs");
var _primordials = require("./_util/primordials.cjs");
function getFloat16(dataView, byteOffset, ...opts) {
  return (0, _converter.convertToNumber)((0, _primordials.DataViewPrototypeGetUint16)(dataView, byteOffset, ...(0, _arrayIterator.safeIfNeeded)(opts)));
}
function setFloat16(dataView, byteOffset, value, ...opts) {
  return (0, _primordials.DataViewPrototypeSetUint16)(dataView, byteOffset, (0, _converter.roundToFloat16Bits)(value), ...(0, _arrayIterator.safeIfNeeded)(opts));
}