"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _curry = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_curry"));

var _parseToHsl = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./parseToHsl"));

var _toColorString = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./toColorString"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/**
 * Sets the saturation of a color to the provided value. The saturation range can be
 * from 0 and 1.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: setSaturation(0.2, '#CCCD64'),
 *   background: setSaturation('0.75', 'rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${setSaturation(0.2, '#CCCD64')};
 *   background: ${setSaturation('0.75', 'rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#adad84";
 *   background: "rgba(228,229,76,0.7)";
 * }
 */
function setSaturation(saturation, color) {
  if (color === 'transparent') return color;
  return (0, _toColorString["default"])(_extends({}, (0, _parseToHsl["default"])(color), {
    saturation: parseFloat(saturation)
  }));
} // prettier-ignore


var curriedSetSaturation = /*#__PURE__*/(0, _curry["default"]
/* ::<number | string, string, string> */
)(setSaturation);
var _default = curriedSetSaturation;
exports["default"] = _default;
module.exports = exports.default;