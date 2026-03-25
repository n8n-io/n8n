"use strict";

exports.__esModule = true;
exports["default"] = grayscale;

var _parseToHsl = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./parseToHsl"));

var _toColorString = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./toColorString"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/**
 * Converts the color to a grayscale, by reducing its saturation to 0.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: grayscale('#CCCD64'),
 *   background: grayscale('rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${grayscale('#CCCD64')};
 *   background: ${grayscale('rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#999";
 *   background: "rgba(153,153,153,0.7)";
 * }
 */
function grayscale(color) {
  if (color === 'transparent') return color;
  return (0, _toColorString["default"])(_extends({}, (0, _parseToHsl["default"])(color), {
    saturation: 0
  }));
}

module.exports = exports.default;