"use strict";

exports.__esModule = true;
exports["default"] = void 0;
var _curry = _interopRequireDefault(require("../internalHelpers/_curry"));
var _mix = _interopRequireDefault(require("./mix"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * Shades a color by mixing it with black. `shade` can produce
 * hue shifts, where as `darken` manipulates the luminance channel and therefore
 * doesn't produce hue shifts.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: shade(0.25, '#00f')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${shade(0.25, '#00f')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#00003f";
 * }
 */
function shade(percentage, color) {
  if (color === 'transparent') return color;
  return (0, _mix["default"])(parseFloat(percentage), 'rgb(0, 0, 0)', color);
}

// prettier-ignore
var curriedShade = (0, _curry["default"] /* ::<number | string, string, string> */)(shade);
var _default = exports["default"] = curriedShade;
module.exports = exports.default;