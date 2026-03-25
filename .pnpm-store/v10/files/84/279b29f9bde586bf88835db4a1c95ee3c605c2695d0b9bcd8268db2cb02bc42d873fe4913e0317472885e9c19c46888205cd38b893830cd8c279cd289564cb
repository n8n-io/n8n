"use strict";

exports.__esModule = true;
exports["default"] = parseToHsl;

var _parseToRgb = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./parseToRgb"));

var _rgbToHsl = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_rgbToHsl"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Returns an HslColor or HslaColor object. This utility function is only useful
 * if want to extract a color component. With the color util `toColorString` you
 * can convert a HslColor or HslaColor object back to a string.
 *
 * @example
 * // Assigns `{ hue: 0, saturation: 1, lightness: 0.5 }` to color1
 * const color1 = parseToHsl('rgb(255, 0, 0)');
 * // Assigns `{ hue: 128, saturation: 1, lightness: 0.5, alpha: 0.75 }` to color2
 * const color2 = parseToHsl('hsla(128, 100%, 50%, 0.75)');
 */
function parseToHsl(color) {
  // Note: At a later stage we can optimize this function as right now a hsl
  // color would be parsed converted to rgb values and converted back to hsl.
  return (0, _rgbToHsl["default"])((0, _parseToRgb["default"])(color));
}

module.exports = exports.default;