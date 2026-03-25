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
 * Returns a string value for the darkened color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: darken(0.2, '#FFCD64'),
 *   background: darken('0.2', 'rgba(255,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${darken(0.2, '#FFCD64')};
 *   background: ${darken('0.2', 'rgba(255,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   background: "#ffbd31";
 *   background: "rgba(255,189,49,0.7)";
 * }
 */
function darken(amount, color) {
  if (color === 'transparent') return color;
  var hslColor = (0, _parseToHsl["default"])(color);
  return (0, _toColorString["default"])(_extends({}, hslColor, {
    lightness: (0, _guard["default"])(0, 1, hslColor.lightness - parseFloat(amount))
  }));
} // prettier-ignore


var curriedDarken = /*#__PURE__*/(0, _curry["default"]
/* ::<number | string, string, string> */
)(darken);
var _default = curriedDarken;
exports["default"] = _default;
module.exports = exports.default;