import { PRECISION } from "./constants.js";

//#region src/Splitter/utils/compare.ts
function fuzzyCompareNumbers(actual, expected, fractionDigits = PRECISION) {
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
export { fuzzyCompareNumbers, fuzzyNumbersEqual };
//# sourceMappingURL=compare.js.map