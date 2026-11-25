import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { Gl as $14e0f24ef4ac5c92$export$461939dd4422153, Jl as $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3, Kl as $14e0f24ef4ac5c92$export$629b0a497aa65267, Wl as $11d87f3f76e88657$export$b21e0b124e224484, ql as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { jN as useI18n } from "./app-D5flEmb-.js";
import { a as INSIGHTS_UNIT_MAPPING, n as INSIGHTS_DEVIATION_UNIT_MAPPING, r as INSIGHTS_SUMMARY_ORDER } from "./insights.constants-BJhHT2pG.js";
//#region ../../modules/insights/frontend/src/insights.utils.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var DATE_FORMAT_DAY_MONTH_YEAR = "d mmm, yyyy";
var DATE_FORMAT_DAY_MONTH = "d mmm";
var transformInsightsTimeSaved = (minutes) => Math.round(minutes / (Math.abs(minutes) < 60 ? 1 : 60));
var transformInsightsAverageRunTime = (ms) => ms / 1e3;
var transformInsightsFailureRate = (value) => value * 100;
var transformInsightsValues = {
	total: (value) => value,
	failed: (value) => value,
	timeSaved: transformInsightsTimeSaved,
	averageRunTime: transformInsightsAverageRunTime,
	failureRate: transformInsightsFailureRate
};
var getPreviousValue = (value, deviation) => value - deviation;
var getDeviation = (value, deviation) => {
	if (value === 0 && deviation === 0) return 0;
	const previousValue = getPreviousValue(value, deviation);
	if (previousValue === 0) return null;
	return deviation / previousValue * 100;
};
var transformInsightsDeviation = {
	total: getDeviation,
	failed: getDeviation,
	timeSaved: (_, deviation) => transformInsightsTimeSaved(deviation),
	averageRunTime: (_, deviation) => transformInsightsAverageRunTime(deviation),
	failureRate: (_, deviation) => transformInsightsFailureRate(deviation)
};
var transformInsightsSummary = (data) => data ? INSIGHTS_SUMMARY_ORDER.map((key) => ({
	id: key,
	value: transformInsightsValues[key](data[key].value),
	deviation: data[key].deviation === null ? null : transformInsightsDeviation[key](data[key].value, data[key].deviation),
	deviationUnit: data[key].deviation === null ? "" : INSIGHTS_DEVIATION_UNIT_MAPPING[key](data[key].deviation),
	unit: INSIGHTS_UNIT_MAPPING[key](data[key].value)
})) : [];
var timeRangeMappings = {
	day: 1,
	week: 7,
	"2weeks": 14,
	month: 30,
	quarter: 90,
	"6months": 180,
	year: 365
};
var getTimeRangeLabels = () => {
	const i18n = useI18n();
	return {
		day: i18n.baseText("insights.lastNHours", { interpolate: { count: 24 } }),
		week: i18n.baseText("insights.lastNDays", { interpolate: { count: 7 } }),
		"2weeks": i18n.baseText("insights.lastNDays", { interpolate: { count: 14 } }),
		month: i18n.baseText("insights.lastNDays", { interpolate: { count: 30 } }),
		quarter: i18n.baseText("insights.lastNDays", { interpolate: { count: 90 } }),
		"6months": i18n.baseText("insights.months", { interpolate: { count: 6 } }),
		year: i18n.baseText("insights.oneYear")
	};
};
/**
* @returns A human readable string representing the date range e.g '01 Jan - 05 Jan 2025'
*/
var formatDateRange = (range) => {
	const { start, end } = range;
	if (!start) return "";
	const startDate = start.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
	const endDate = end?.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
	if (!end || start.compare(end) === 0) return (0, import_dateformat.default)(startDate, DATE_FORMAT_DAY_MONTH_YEAR);
	if (start.year === end.year) return `${(0, import_dateformat.default)(startDate, DATE_FORMAT_DAY_MONTH)} - ${(0, import_dateformat.default)(endDate, DATE_FORMAT_DAY_MONTH_YEAR)}`;
	return `${(0, import_dateformat.default)(startDate, DATE_FORMAT_DAY_MONTH_YEAR)} - ${(0, import_dateformat.default)(endDate, DATE_FORMAT_DAY_MONTH_YEAR)}`;
};
/**
* @returns The matching preset key if the range matches a preset, null for custom ranges
*/
var getMatchingPreset = (range) => {
	const { start, end } = range;
	if (!start || !end || !$14e0f24ef4ac5c92$export$629b0a497aa65267(end, $14e0f24ef4ac5c92$export$aa8b41735afcabd2())) return null;
	const daysDiff = end.compare(start);
	for (const [key, days] of Object.entries(timeRangeMappings)) if (daysDiff === days) return key;
	return null;
};
/**
* Converts DateValue range to adjusted Date objects for API calls
* - For single-day ranges ending today: injects current time into both dates (exact 24 hours)
* - For multi-day ranges ending today: injects current time into end date only
* - For past dates: uses end-of-day for end date
*
* @param dateRange - The date range to adjust
*/
var getAdjustedDateRange = (dateRange) => {
	if (!dateRange.start || !dateRange.end) return {
		startDate: /* @__PURE__ */ new Date(),
		endDate: /* @__PURE__ */ new Date()
	};
	const timezone = $14e0f24ef4ac5c92$export$aa8b41735afcabd2();
	const todayInTimezone = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3(timezone);
	const isEndDateToday = dateRange.end?.compare(todayInTimezone) === 0;
	const daysDiff = dateRange.end && dateRange.start ? dateRange.end.compare(dateRange.start) : 0;
	if (isEndDateToday) {
		const nowInTimezone = $14e0f24ef4ac5c92$export$461939dd4422153(timezone);
		if (daysDiff === 1) return {
			startDate: $11d87f3f76e88657$export$b21e0b124e224484(dateRange.start, nowInTimezone).toDate(timezone),
			endDate: $11d87f3f76e88657$export$b21e0b124e224484(dateRange.end, nowInTimezone).toDate(timezone)
		};
		else return {
			startDate: dateRange.start?.toDate(timezone) ?? /* @__PURE__ */ new Date(),
			endDate: $11d87f3f76e88657$export$b21e0b124e224484(dateRange.end, nowInTimezone).toDate(timezone)
		};
	} else {
		const startDate = dateRange.start?.toDate(timezone) ?? /* @__PURE__ */ new Date();
		const endDate = dateRange.end?.toDate(timezone) ?? /* @__PURE__ */ new Date();
		endDate.setHours(23, 59, 59, 999);
		return {
			startDate,
			endDate
		};
	}
};
//#endregion
export { timeRangeMappings as a, transformInsightsSummary as c, getTimeRangeLabels as i, transformInsightsTimeSaved as l, getAdjustedDateRange as n, transformInsightsAverageRunTime as o, getMatchingPreset as r, transformInsightsFailureRate as s, formatDateRange as t };
