"use strict";

exports.__esModule = true;
exports["default"] = linearGradient;
var _constructGradientValue = _interopRequireDefault(require("../internalHelpers/_constructGradientValue"));
var _errors = _interopRequireDefault(require("../internalHelpers/_errors"));
var _templateObject;
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _taggedTemplateLiteralLoose(strings, raw) { if (!raw) { raw = strings.slice(0); } strings.raw = raw; return strings; }
/**
 * CSS for declaring a linear gradient, including a fallback background-color. The fallback is either the first color-stop or an explicitly passed fallback color.
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   ...linearGradient({
        colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
        toDirection: 'to top right',
        fallback: '#FFF',
      })
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   ${linearGradient({
        colorStops: ['#00FFFF 0%', 'rgba(0, 0, 255, 0) 50%', '#0000FF 95%'],
        toDirection: 'to top right',
        fallback: '#FFF',
      })}
 *`
 *
 * // CSS as JS Output
 *
 * div: {
 *   'backgroundColor': '#FFF',
 *   'backgroundImage': 'linear-gradient(to top right, #00FFFF 0%, rgba(0, 0, 255, 0) 50%, #0000FF 95%)',
 * }
 */
function linearGradient(_ref) {
  var colorStops = _ref.colorStops,
    fallback = _ref.fallback,
    _ref$toDirection = _ref.toDirection,
    toDirection = _ref$toDirection === void 0 ? '' : _ref$toDirection;
  if (!colorStops || colorStops.length < 2) {
    throw new _errors["default"](56);
  }
  return {
    backgroundColor: fallback || colorStops[0].replace(/,\s+/g, ',').split(' ')[0].replace(/,(?=\S)/g, ', '),
    backgroundImage: (0, _constructGradientValue["default"])(_templateObject || (_templateObject = _taggedTemplateLiteralLoose(["linear-gradient(", "", ")"])), toDirection, colorStops.join(', ').replace(/,(?=\S)/g, ', '))
  };
}
module.exports = exports.default;