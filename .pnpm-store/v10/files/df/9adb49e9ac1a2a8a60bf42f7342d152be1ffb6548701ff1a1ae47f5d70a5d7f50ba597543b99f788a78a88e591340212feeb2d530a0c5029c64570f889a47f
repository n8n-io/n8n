"use strict";

exports.__esModule = true;
exports["default"] = void 0;
var _parseToHsl = _interopRequireDefault(require("./parseToHsl"));
var _toColorString = _interopRequireDefault(require("./toColorString"));
var _curry = _interopRequireDefault(require("../internalHelpers/_curry"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
/**
 * Changes the hue of the color. Hue is a number between 0 to 360. The first
 * argument for adjustHue is the amount of degrees the color is rotated around
 * the color wheel, always producing a positive hue value.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: adjustHue(180, '#448'),
 *   background: adjustHue('180', 'rgba(101,100,205,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${adjustHue(180, '#448')};
 *   background: ${adjustHue('180', 'rgba(101,100,205,0.7)')};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#888844";
 *   background: "rgba(136,136,68,0.7)";
 * }
 */
function adjustHue(degree, color) {
  if (color === 'transparent') return color;
  var hslColor = (0, _parseToHsl["default"])(color);
  return (0, _toColorString["default"])(_extends({}, hslColor, {
    hue: hslColor.hue + parseFloat(degree)
  }));
}

// prettier-ignore
var curriedAdjustHue = (0, _curry["default"] /* ::<number | string, string, string> */)(adjustHue);
var _default = exports["default"] = curriedAdjustHue;
module.exports = exports.default;