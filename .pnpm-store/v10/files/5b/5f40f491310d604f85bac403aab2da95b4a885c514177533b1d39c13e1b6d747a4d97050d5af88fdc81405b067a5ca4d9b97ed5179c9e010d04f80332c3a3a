"use strict";

exports.__esModule = true;
exports["default"] = void 0;
var _hslToRgb = _interopRequireDefault(require("./_hslToRgb"));
var _reduceHexValue = _interopRequireDefault(require("./_reduceHexValue"));
var _numberToHex = _interopRequireDefault(require("./_numberToHex"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function colorToHex(color) {
  return (0, _numberToHex["default"])(Math.round(color * 255));
}
function convertToHex(red, green, blue) {
  return (0, _reduceHexValue["default"])("#" + colorToHex(red) + colorToHex(green) + colorToHex(blue));
}
function hslToHex(hue, saturation, lightness) {
  return (0, _hslToRgb["default"])(hue, saturation, lightness, convertToHex);
}
var _default = exports["default"] = hslToHex;
module.exports = exports.default;