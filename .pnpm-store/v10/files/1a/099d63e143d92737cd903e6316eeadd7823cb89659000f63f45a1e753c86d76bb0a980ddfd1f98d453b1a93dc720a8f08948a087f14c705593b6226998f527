"use strict";

exports.__esModule = true;
exports["default"] = meetsContrastGuidelines;
var _getContrast = _interopRequireDefault(require("./getContrast"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * Determines which contrast guidelines have been met for two colors.
 * Based on the [contrast calculations recommended by W3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html).
 *
 * @example
 * const scores = meetsContrastGuidelines('#444', '#fff');
 */
function meetsContrastGuidelines(color1, color2) {
  var contrastRatio = (0, _getContrast["default"])(color1, color2);
  return {
    AA: contrastRatio >= 4.5,
    AALarge: contrastRatio >= 3,
    AAA: contrastRatio >= 7,
    AAALarge: contrastRatio >= 4.5
  };
}
module.exports = exports.default;