"use strict";

exports.__esModule = true;
exports["default"] = radialGradient;
var _constructGradientValue = _interopRequireDefault(require("../internalHelpers/_constructGradientValue"));
var _errors = _interopRequireDefault(require("../internalHelpers/_errors"));
var _templateObject;
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _taggedTemplateLiteralLoose(strings, raw) { if (!raw) { raw = strings.slice(0); } strings.raw = raw; return strings; }
/**
 * CSS for declaring a radial gradient, including a fallback background-color. The fallback is either the first color-stop or an explicitly passed fallback color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...radialGradient({
 *     colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
 *     extent: 'farthest-corner at 45px 45px',
 *     position: 'center',
 *     shape: 'ellipse',
 *   })
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${radialGradient({
 *     colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
 *     extent: 'farthest-corner at 45px 45px',
 *     position: 'center',
 *     shape: 'ellipse',
 *   })}
 *`
 *
 * // CSS as JS Output
 *
 * div: {
 *   'backgroundColor': '#00FFFF',
 *   'backgroundImage': 'radial-gradient(center ellipse farthest-corner at 45px 45px, #00FFFF 0%, rgba(0, 0, 255, 0) 50%, #0000FF 95%)',
 * }
 */
function radialGradient(_ref) {
  var colorStops = _ref.colorStops,
    _ref$extent = _ref.extent,
    extent = _ref$extent === void 0 ? '' : _ref$extent,
    fallback = _ref.fallback,
    _ref$position = _ref.position,
    position = _ref$position === void 0 ? '' : _ref$position,
    _ref$shape = _ref.shape,
    shape = _ref$shape === void 0 ? '' : _ref$shape;
  if (!colorStops || colorStops.length < 2) {
    throw new _errors["default"](57);
  }
  return {
    backgroundColor: fallback || colorStops[0].split(' ')[0],
    backgroundImage: (0, _constructGradientValue["default"])(_templateObject || (_templateObject = _taggedTemplateLiteralLoose(["radial-gradient(", "", "", "", ")"])), position, shape, extent, colorStops.join(', '))
  };
}
module.exports = exports.default;