"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _hslToRgb = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./_hslToRgb"));

var _reduceHexValue = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./_reduceHexValue"));

var _numberToHex = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./_numberToHex"));

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

var _default = hslToHex;
exports["default"] = _default;
module.exports = exports.default;