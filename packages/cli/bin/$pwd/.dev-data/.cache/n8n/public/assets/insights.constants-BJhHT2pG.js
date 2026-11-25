import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { zo as require_dateformat } from "./vendor-Hx42-oQF.js";
//#region ../../modules/insights/frontend/src/insights.constants.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var INSIGHT_TYPES = {
	TOTAL: "total",
	FAILED: "failed",
	FAILURE_RATE: "failureRate",
	TIME_SAVED: "timeSaved",
	AVERAGE_RUN_TIME: "averageRunTime"
};
var INSIGHTS_SUMMARY_ORDER = [
	INSIGHT_TYPES.TOTAL,
	INSIGHT_TYPES.FAILED,
	INSIGHT_TYPES.FAILURE_RATE,
	INSIGHT_TYPES.TIME_SAVED,
	INSIGHT_TYPES.AVERAGE_RUN_TIME
];
var INSIGHTS_UNIT_MAPPING = {
	total: () => "",
	failed: () => "",
	failureRate: () => "%",
	timeSaved: (value) => Math.abs(value) < 60 ? "m" : "h",
	averageRunTime: () => "s"
};
var INSIGHTS_DEVIATION_UNIT_MAPPING = {
	total: () => "%",
	failed: () => "%",
	failureRate: () => "pp",
	timeSaved: (deviation) => Math.abs(deviation) < 60 ? "m" : "h",
	averageRunTime: () => "s"
};
var INSIGHT_IMPACT_TYPES = {
	POSITIVE: "positive",
	NEGATIVE: "negative",
	NEUTRAL: "neutral"
};
var INSIGHTS_UNIT_IMPACT_MAPPING = {
	total: INSIGHT_IMPACT_TYPES.POSITIVE,
	failed: INSIGHT_IMPACT_TYPES.NEGATIVE,
	failureRate: INSIGHT_IMPACT_TYPES.NEGATIVE,
	timeSaved: INSIGHT_IMPACT_TYPES.POSITIVE,
	averageRunTime: INSIGHT_IMPACT_TYPES.NEUTRAL
};
var GRANULARITY_DATE_FORMAT_MASK = {
	hour: (date) => (0, import_dateformat.default)(date, "HH:MM"),
	day: (date) => (0, import_dateformat.default)(date, "mmm d"),
	week: (date) => {
		const startDate = new Date(date);
		const endDate = new Date(startDate);
		endDate.setDate(startDate.getDate() + 7);
		const endDateFormat = startDate.getMonth() !== endDate.getMonth() ? "mmm d" : "d";
		return [(0, import_dateformat.default)(startDate, "mmm d"), (0, import_dateformat.default)(endDate, endDateFormat)].join("-");
	}
};
//#endregion
export { INSIGHTS_UNIT_MAPPING as a, INSIGHTS_UNIT_IMPACT_MAPPING as i, INSIGHTS_DEVIATION_UNIT_MAPPING as n, INSIGHT_IMPACT_TYPES as o, INSIGHTS_SUMMARY_ORDER as r, INSIGHT_TYPES as s, GRANULARITY_DATE_FORMAT_MASK as t };
