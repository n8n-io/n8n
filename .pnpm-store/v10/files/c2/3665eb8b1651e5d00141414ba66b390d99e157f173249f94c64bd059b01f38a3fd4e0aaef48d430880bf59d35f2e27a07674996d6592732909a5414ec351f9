"use strict";

exports.__esModule = true;
exports["default"] = void 0;
var _curry = _interopRequireDefault(require("../internalHelpers/_curry"));
var _guard = _interopRequireDefault(require("../internalHelpers/_guard"));
var _rgba = _interopRequireDefault(require("./rgba"));
var _parseToRgb = _interopRequireDefault(require("./parseToRgb"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
/**
 * Decreases the opacity of a color. Its range for the amount is between 0 to 1.
 *
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: transparentize(0.1, '#fff'),
 *   background: transparentize(0.2, 'hsl(0, 0%, 100%)'),
 *   background: transparentize('0.5', 'rgba(255, 0, 0, 0.8)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${transparentize(0.1, '#fff')};
 *   background: ${transparentize(0.2, 'hsl(0, 0%, 100%)')};
 *   background: ${transparentize('0.5', 'rgba(255, 0, 0, 0.8)')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "rgba(255,255,255,0.9)";
 *   background: "rgba(255,255,255,0.8)";
 *   background: "rgba(255,0,0,0.3)";
 * }
 */
function transparentize(amount, color) {
  if (color === 'transparent') return color;
  var parsedColor = (0, _parseToRgb["default"])(color);
  var alpha = typeof parsedColor.alpha === 'number' ? parsedColor.alpha : 1;
  var colorWithAlpha = _extends({}, parsedColor, {
    alpha: (0, _guard["default"])(0, 1, +(alpha * 100 - parseFloat(amount) * 100).toFixed(2) / 100)
  });
  return (0, _rgba["default"])(colorWithAlpha);
}

// prettier-ignore
var curriedTransparentize = (0, _curry["default"] /* ::<number | string, string, string> */)(transparentize);
var _default = exports["default"] = curriedTransparentize;
module.exports = exports.default;