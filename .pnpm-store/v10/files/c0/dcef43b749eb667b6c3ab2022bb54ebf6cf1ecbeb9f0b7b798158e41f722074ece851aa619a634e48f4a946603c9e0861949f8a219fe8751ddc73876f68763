"use strict";

exports.__esModule = true;
exports["default"] = void 0;
var _curry = _interopRequireDefault(require("../internalHelpers/_curry"));
var _parseToHsl = _interopRequireDefault(require("./parseToHsl"));
var _toColorString = _interopRequireDefault(require("./toColorString"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
/**
 * Sets the lightness of a color to the provided value. The lightness range can be
 * from 0 and 1.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   background: setLightness(0.2, '#CCCD64'),
 *   background: setLightness('0.75', 'rgba(204,205,100,0.7)'),
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   background: ${setLightness(0.2, '#CCCD64')};
 *   background: ${setLightness('0.75', 'rgba(204,205,100,0.7)')};
 * `
 *
 * // CSS in JS Output
 * element {
 *   background: "#4d4d19";
 *   background: "rgba(223,224,159,0.7)";
 * }
 */
function setLightness(lightness, color) {
  if (color === 'transparent') return color;
  return (0, _toColorString["default"])(_extends({}, (0, _parseToHsl["default"])(color), {
    lightness: parseFloat(lightness)
  }));
}

// prettier-ignore
var curriedSetLightness = (0, _curry["default"] /* ::<number | string, string, string> */)(setLightness);
var _default = exports["default"] = curriedSetLightness;
module.exports = exports.default;