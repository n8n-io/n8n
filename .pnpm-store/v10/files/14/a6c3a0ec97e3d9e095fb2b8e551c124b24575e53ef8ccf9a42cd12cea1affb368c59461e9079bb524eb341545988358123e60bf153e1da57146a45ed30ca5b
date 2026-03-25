"use strict";

exports.__esModule = true;
exports["default"] = hsl;

var _hslToHex = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_hslToHex"));

var _errors = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_errors"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Returns a string value for the color. The returned result is the smallest possible hex notation.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: hsl(359, 0.75, 0.4),
 *   background: hsl({ hue: 360, saturation: 0.75, lightness: 0.4 }),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${hsl(359, 0.75, 0.4)};
 *   background: ${hsl({ hue: 360, saturation: 0.75, lightness: 0.4 })};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#b3191c";
 *   background: "#b3191c";
 * }
 */
function hsl(value, saturation, lightness) {
  if (typeof value === 'number' && typeof saturation === 'number' && typeof lightness === 'number') {
    return (0, _hslToHex["default"])(value, saturation, lightness);
  } else if (typeof value === 'object' && saturation === undefined && lightness === undefined) {
    return (0, _hslToHex["default"])(value.hue, value.saturation, value.lightness);
  }

  throw new _errors["default"](1);
}

module.exports = exports.default;