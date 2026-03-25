"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _curry = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_curry"));

var _guard = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_guard"));

var _parseToHsl = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./parseToHsl"));

var _toColorString = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./toColorString"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/**
 * Decreases the intensity of a color. Its range is between 0 to 1. The first
 * argument of the desaturate function is the amount by how much the color
 * intensity should be decreased.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: desaturate(0.2, '#CCCD64'),
 *   background: desaturate('0.2', 'rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${desaturate(0.2, '#CCCD64')};
 *   background: ${desaturate('0.2', 'rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#b8b979";
 *   background: "rgba(184,185,121,0.7)";
 * }
 */
function desaturate(amount, color) {
  if (color === 'transparent') return color;
  var hslColor = (0, _parseToHsl["default"])(color);
  return (0, _toColorString["default"])(_extends({}, hslColor, {
    saturation: (0, _guard["default"])(0, 1, hslColor.saturation - parseFloat(amount))
  }));
} // prettier-ignore


var curriedDesaturate = /*#__PURE__*/(0, _curry["default"]
/* ::<number | string, string, string> */
)(desaturate);
var _default = curriedDesaturate;
exports["default"] = _default;
module.exports = exports.default;