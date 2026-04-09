"use strict";

exports.__esModule = true;
exports["default"] = between;
var _getValueAndUnit5 = _interopRequireDefault(require("../helpers/getValueAndUnit"));
var _errors = _interopRequireDefault(require("../internalHelpers/_errors"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
/**
 * Returns a CSS calc formula for linear interpolation of a property between two values. Accepts optional minScreen (defaults to '320px') and maxScreen (defaults to '1200px').
 *
 * @example
 * // Styles as object usage
 * const styles = {
 *   fontSize: between('20px', '100px', '400px', '1000px'),
 *   fontSize: between('20px', '100px')
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *   fontSize: ${between('20px', '100px', '400px', '1000px')};
 *   fontSize: ${between('20px', '100px')}
 * `
 *
 * // CSS as JS Output
 *
 * h1: {
 *   'fontSize': 'calc(-33.33333333333334px + 13.333333333333334vw)',
 *   'fontSize': 'calc(-9.090909090909093px + 9.090909090909092vw)'
 * }
 */
function between(fromSize, toSize, minScreen, maxScreen) {
  if (minScreen === void 0) {
    minScreen = '320px';
  }
  if (maxScreen === void 0) {
    maxScreen = '1200px';
  }
  var _getValueAndUnit = (0, _getValueAndUnit5["default"])(fromSize),
    unitlessFromSize = _getValueAndUnit[0],
    fromSizeUnit = _getValueAndUnit[1];
  var _getValueAndUnit2 = (0, _getValueAndUnit5["default"])(toSize),
    unitlessToSize = _getValueAndUnit2[0],
    toSizeUnit = _getValueAndUnit2[1];
  var _getValueAndUnit3 = (0, _getValueAndUnit5["default"])(minScreen),
    unitlessMinScreen = _getValueAndUnit3[0],
    minScreenUnit = _getValueAndUnit3[1];
  var _getValueAndUnit4 = (0, _getValueAndUnit5["default"])(maxScreen),
    unitlessMaxScreen = _getValueAndUnit4[0],
    maxScreenUnit = _getValueAndUnit4[1];
  if (typeof unitlessMinScreen !== 'number' || typeof unitlessMaxScreen !== 'number' || !minScreenUnit || !maxScreenUnit || minScreenUnit !== maxScreenUnit) {
    throw new _errors["default"](47);
  }
  if (typeof unitlessFromSize !== 'number' || typeof unitlessToSize !== 'number' || fromSizeUnit !== toSizeUnit) {
    throw new _errors["default"](48);
  }
  if (fromSizeUnit !== minScreenUnit || toSizeUnit !== maxScreenUnit) {
    throw new _errors["default"](76);
  }
  var slope = (unitlessFromSize - unitlessToSize) / (unitlessMinScreen - unitlessMaxScreen);
  var base = unitlessToSize - slope * unitlessMaxScreen;
  return "calc(" + base.toFixed(2) + (fromSizeUnit || '') + " + " + (100 * slope).toFixed(2) + "vw)";
}
module.exports = exports.default;