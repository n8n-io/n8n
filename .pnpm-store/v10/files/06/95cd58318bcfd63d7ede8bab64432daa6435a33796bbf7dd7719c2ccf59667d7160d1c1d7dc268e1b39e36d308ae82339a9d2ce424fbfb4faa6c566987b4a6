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
 * Increases the opacity of a color. Its range for the amount is between 0 to 1.
 *
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: opacify(0.1, 'rgba(255, 255, 255, 0.9)');
 *   background: opacify(0.2, 'hsla(0, 0%, 100%, 0.5)'),
 *   background: opacify('0.5', 'rgba(255, 0, 0, 0.2)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${opacify(0.1, 'rgba(255, 255, 255, 0.9)')};
 *   background: ${opacify(0.2, 'hsla(0, 0%, 100%, 0.5)')},
 *   background: ${opacify('0.5', 'rgba(255, 0, 0, 0.2)')},
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#fff";
 *   background: "rgba(255,255,255,0.7)";
 *   background: "rgba(255,0,0,0.7)";
 * }
 */
function opacify(amount, color) {
  if (color === 'transparent') return color;
  var parsedColor = (0, _parseToRgb["default"])(color);
  var alpha = typeof parsedColor.alpha === 'number' ? parsedColor.alpha : 1;
  var colorWithAlpha = _extends({}, parsedColor, {
    alpha: (0, _guard["default"])(0, 1, (alpha * 100 + parseFloat(amount) * 100) / 100)
  });
  return (0, _rgba["default"])(colorWithAlpha);
}

// prettier-ignore
var curriedOpacify = (0, _curry["default"] /* ::<number | string, string, string> */)(opacify);
var _default = exports["default"] = curriedOpacify;
module.exports = exports.default;