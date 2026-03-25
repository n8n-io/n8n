"use strict";

exports.__esModule = true;
exports["default"] = hsla;

var _hslToHex = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_hslToHex"));

var _hslToRgb = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_hslToRgb"));

var _errors = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_errors"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Returns a string value for the color. The returned result is the smallest possible rgba or hex notation.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: hsla(359, 0.75, 0.4, 0.7),
 *   background: hsla({ hue: 360, saturation: 0.75, lightness: 0.4, alpha: 0,7 }),
 *   background: hsla(359, 0.75, 0.4, 1),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${hsla(359, 0.75, 0.4, 0.7)};
 *   background: ${hsla({ hue: 360, saturation: 0.75, lightness: 0.4, alpha: 0,7 })};
 *   background: ${hsla(359, 0.75, 0.4, 1)};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "rgba(179,25,28,0.7)";
 *   background: "rgba(179,25,28,0.7)";
 *   background: "#b3191c";
 * }
 */
function hsla(value, saturation, lightness, alpha) {
  if (typeof value === 'number' && typeof saturation === 'number' && typeof lightness === 'number' && typeof alpha === 'number') {
    return alpha >= 1 ? (0, _hslToHex["default"])(value, saturation, lightness) : "rgba(" + (0, _hslToRgb["default"])(value, saturation, lightness) + "," + alpha + ")";
  } else if (typeof value === 'object' && saturation === undefined && lightness === undefined && alpha === undefined) {
    return value.alpha >= 1 ? (0, _hslToHex["default"])(value.hue, value.saturation, value.lightness) : "rgba(" + (0, _hslToRgb["default"])(value.hue, value.saturation, value.lightness) + "," + value.alpha + ")";
  }

  throw new _errors["default"](2);
}

module.exports = exports.default;