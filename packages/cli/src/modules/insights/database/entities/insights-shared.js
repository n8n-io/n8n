'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NumberToType =
	exports.TypeToNumber =
	exports.NumberToPeriodUnit =
	exports.PeriodUnitToNumber =
		void 0;
exports.isValidPeriodNumber = isValidPeriodNumber;
exports.isValidTypeNumber = isValidTypeNumber;
function isValid(value, constant) {
	return Object.keys(constant).includes(value.toString());
}
exports.PeriodUnitToNumber = {
	hour: 0,
	day: 1,
	week: 2,
};
exports.NumberToPeriodUnit = Object.entries(exports.PeriodUnitToNumber).reduce(
	(acc, [key, value]) => {
		acc[value] = key;
		return acc;
	},
	{},
);
function isValidPeriodNumber(value) {
	return isValid(value, exports.NumberToPeriodUnit);
}
exports.TypeToNumber = {
	time_saved_min: 0,
	runtime_ms: 1,
	success: 2,
	failure: 3,
};
exports.NumberToType = Object.entries(exports.TypeToNumber).reduce((acc, [key, value]) => {
	acc[value] = key;
	return acc;
}, {});
function isValidTypeNumber(value) {
	return isValid(value, exports.NumberToType);
}
//# sourceMappingURL=insights-shared.js.map
