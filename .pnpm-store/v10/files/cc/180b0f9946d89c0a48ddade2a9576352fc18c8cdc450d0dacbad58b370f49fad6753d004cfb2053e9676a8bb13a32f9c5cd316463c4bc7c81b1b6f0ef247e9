"use strict";

exports.__esModule = true;
exports["default"] = modularScale;
exports.ratioNames = void 0;

var _getValueAndUnit = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("./getValueAndUnit"));

var _errors = /*#__PURE__*/_interopRequireDefault( /*#__PURE__*/require("../internalHelpers/_errors"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var ratioNames = {
  minorSecond: 1.067,
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
  augFourth: 1.414,
  perfectFifth: 1.5,
  minorSixth: 1.6,
  goldenSection: 1.618,
  majorSixth: 1.667,
  minorSeventh: 1.778,
  majorSeventh: 1.875,
  octave: 2,
  majorTenth: 2.5,
  majorEleventh: 2.667,
  majorTwelfth: 3,
  doubleOctave: 4
};
exports.ratioNames = ratioNames;

function getRatio(ratioName) {
  return ratioNames[ratioName];
}
/**
 * Establish consistent measurements and spacial relationships throughout your projects by incrementing an em or rem value up or down a defined scale. We provide a list of commonly used scales as pre-defined variables.
 * @example
 * // Styles as object usage
 * const styles = {
 *    // Increment two steps up the default scale
 *   'fontSize': modularScale(2)
 * }
 *
 * // styled-components usage
 * const div = styled.div`
 *    // Increment two steps up the default scale
 *   fontSize: ${modularScale(2)}
 * `
 *
 * // CSS in JS Output
 *
 * element {
 *   'fontSize': '1.77689em'
 * }
 */


function modularScale(steps, base, ratio) {
  if (base === void 0) {
    base = '1em';
  }

  if (ratio === void 0) {
    ratio = 1.333;
  }

  if (typeof steps !== 'number') {
    throw new _errors["default"](42);
  }

  if (typeof ratio === 'string' && !ratioNames[ratio]) {
    throw new _errors["default"](43);
  }

  var _ref = typeof base === 'string' ? (0, _getValueAndUnit["default"])(base) : [base, ''],
      realBase = _ref[0],
      unit = _ref[1];

  var realRatio = typeof ratio === 'string' ? getRatio(ratio) : ratio;

  if (typeof realBase === 'string') {
    throw new _errors["default"](44, base);
  }

  return "" + realBase * Math.pow(realRatio, steps) + (unit || '');
}