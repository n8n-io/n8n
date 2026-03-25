const require_utils_constants = require('./constants.cjs');

//#region src/Splitter/utils/compare.ts
function fuzzyCompareNumbers(actual, expected, fractionDigits = require_utils_constants.PRECISION) {
	actual = Number.parseFloat(actual.toFixed(fractionDigits));
	expected = Number.parseFloat(expected.toFixed(fractionDigits));
	const delta = actual - expected;
	if (delta === 0) return 0;
	else return delta > 0 ? 1 : -1;
}
function fuzzyNumbersEqual(actual, expected, fractionDigits) {
	return fuzzyCompareNumbers(actual, expected, fractionDigits) === 0;
}

//#endregion
Object.defineProperty(exports, 'fuzzyCompareNumbers', {
  enumerable: true,
  get: function () {
    return fuzzyCompareNumbers;
  }
});
Object.defineProperty(exports, 'fuzzyNumbersEqual', {
  enumerable: true,
  get: function () {
    return fuzzyNumbersEqual;
  }
});
//# sourceMappingURL=compare.cjs.map