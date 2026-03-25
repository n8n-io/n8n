"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _curry = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_curry"));

var _mix = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./mix"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Tints a color by mixing it with white. `tint` can produce
 * hue shifts, where as `lighten` manipulates the luminance channel and therefore
 * doesn't produce hue shifts.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: tint(0.25, '#00f')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${tint(0.25, '#00f')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#bfbfff";
 * }
 */
function tint(percentage, color) {
  if (color === 'transparent') return color;
  return (0, _mix["default"])(parseFloat(percentage), 'rgb(255, 255, 255)', color);
} // prettier-ignore


var curriedTint = /*#__PURE__*/(0, _curry["default"]
/* ::<number | string, string, string> */
)(tint);
var _default = curriedTint;
exports["default"] = _default;
module.exports = exports.default;