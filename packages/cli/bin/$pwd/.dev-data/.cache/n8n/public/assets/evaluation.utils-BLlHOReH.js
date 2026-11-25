import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { Ar as require_startCase } from "./vendor-Hx42-oQF.js";
import { Jw as RESERVED_METRIC_KEYS, Xw as normalizeMetricScore, qw as ONE_TO_FIVE_METRIC_KEYS } from "./app-D5flEmb-.js";
//#region src/features/ai/evaluation.ee/evaluation.utils.ts
var import_startCase = /* @__PURE__ */ __toESM(require_startCase(), 1);
/**
* Extract a human-readable answer string from an end-node output value.
* Priority: `output` > `text` > `response` > single-key object value > JSON.stringify.
* Keep in sync with the `endAnswer` expression in buildEvaluationConfigDto.ts.
*/
function extractAnswerText(json) {
	if (json === null || json === void 0) return "";
	if (typeof json !== "object") return String(json);
	const preferred = Reflect.get(json, "output") ?? Reflect.get(json, "text") ?? Reflect.get(json, "response");
	if (preferred !== void 0 && preferred !== null) return typeof preferred === "object" ? JSON.stringify(preferred) : String(preferred);
	const keys = Object.keys(json);
	if (keys.length === 1) {
		const only = Reflect.get(json, keys[0]);
		return typeof only === "object" && only !== null ? JSON.stringify(only) : String(only);
	}
	return JSON.stringify(json);
}
/**
* The node-under-test's answer for a case: the end node's output during the test
* run, via `extractAnswerText`. Falls back to persisted `outputs` when the
* execution isn't loaded (or the run had no setOutputs node).
*/
function extractCaseAnswer(execution, endNodeName, fallbackOutputs) {
	if (execution && endNodeName) {
		const firstItem = execution.data?.resultData?.runData?.[endNodeName]?.[0]?.data?.main?.[0]?.[0]?.json;
		if (firstItem !== void 0) return extractAnswerText(firstItem);
	}
	return extractAnswerText(fallbackOutputs);
}
var PREDEFINED_METRIC_KEYS = new Set(RESERVED_METRIC_KEYS);
function getUserDefinedMetricNames(metrics) {
	if (!metrics) return [];
	return Object.keys(metrics).filter((key) => !PREDEFINED_METRIC_KEYS.has(key));
}
function getOperationalMetricEntries(metrics) {
	if (!metrics) return [];
	return [...PREDEFINED_METRIC_KEYS].filter((key) => key in metrics).map((key) => ({
		key,
		value: metrics[key]
	}));
}
function normalizeMetricValue(value) {
	if (value === void 0 || Number.isNaN(value)) return void 0;
	return value;
}
function indexOfMax(values) {
	let best = null;
	let bestValue = -Infinity;
	values.forEach((value, index) => {
		if (value !== null && value > bestValue) {
			bestValue = value;
			best = index;
		}
	});
	return best;
}
function deriveRunsStatus(runs) {
	if (runs.some((run) => run.status === "new" || run.status === "running")) return "running";
	if (runs.length > 0 && runs.every((run) => run.status === "error" || run.status === "cancelled")) return "error";
	return "done";
}
function countSettledRuns(runs) {
	return runs.filter((run) => run.status !== "new" && run.status !== "running").length;
}
function buildScoreShapedMetricGroups(runs, defaultScales) {
	const scaleFor = (run, key) => run.metricScales?.[key] ?? defaultScales?.[key];
	const orderedKeys = [];
	const seen = /* @__PURE__ */ new Set();
	for (const run of runs) for (const key of Object.keys(run.metrics ?? {})) {
		if (seen.has(key)) continue;
		seen.add(key);
		orderedKeys.push(key);
	}
	return orderedKeys.filter((key) => runs.some((run) => run.metrics?.[key] !== void 0) && runs.every((run) => {
		const value = run.metrics?.[key];
		return value === void 0 || normalizeMetricScore(key, value, scaleFor(run, key)) !== null;
	})).map((key) => ({
		key,
		values: runs.map((run) => {
			const value = run.metrics?.[key];
			return typeof value === "number" ? normalizeMetricScore(key, value, scaleFor(run, key)) : null;
		})
	}));
}
function computeDelta(current, previous) {
	const currentNum = normalizeMetricValue(current);
	const previousNum = normalizeMetricValue(previous);
	if (currentNum === void 0 || previousNum === void 0) return void 0;
	return currentNum - previousNum;
}
function getDeltaTone(delta) {
	if (delta === void 0) return "default";
	if (delta > 0) return "positive";
	if (delta < 0) return "negative";
	return "default";
}
function formatTokens(tokens, options = {}) {
	if (tokens === void 0 || Number.isNaN(tokens)) return "–";
	const formatted = Math.round(tokens).toLocaleString();
	return options.withUnit === false ? formatted : `${formatted}t`;
}
function stringifyValue(value) {
	if (value === null || value === void 0) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}
function getMetricScale(category) {
	return category === "aiBased" ? "oneToFive" : "normalized";
}
function resolveDisplayScale(options) {
	if (options.scale) return options.scale === "oneToFive" ? "oneToFive" : "normalized";
	return getMetricScale(options.category);
}
function isUnscaledCustomMetric(options = {}) {
	if (options.scale) return false;
	return (options.category ?? getMetricCategory(options.key)) === "custom";
}
function formatMetricNumber(value) {
	return value.toLocaleString(void 0, { maximumFractionDigits: 6 });
}
function casePassed(value) {
	return normalizeMetricValue(value) === 1;
}
function formatMetricPercent(value, options = {}) {
	const num = normalizeMetricValue(value);
	if (num === void 0) return "–";
	if (options.scale) {
		const score = normalizeMetricScore(options.key ?? "", num, options.scale);
		return score === null ? "–" : `${Math.round(score * 100)}%`;
	}
	const scaled = getMetricScale(options.category) === "oneToFive" ? num / 5 * 100 : Math.abs(num) <= 1 ? num * 100 : num;
	return `${Math.round(scaled)}%`;
}
/** Format a metric for display, preserving score formatting where the scale is known. */
function formatMetricValue(value, options = {}) {
	const num = normalizeMetricValue(value);
	if (num === void 0) return "–";
	if (isUnscaledCustomMetric(options)) return formatMetricNumber(num);
	return formatMetricPercent(num, options);
}
function formatMetricLabel(name) {
	return (0, import_startCase.default)(name);
}
function getMetricCategory(metric) {
	if (metric !== void 0 && ONE_TO_FIVE_METRIC_KEYS.includes(metric)) return "aiBased";
	switch (metric) {
		case "stringSimilarity": return "stringSimilarity";
		case "categorization": return "categorization";
		case "toolsUsed": return "toolsUsed";
		default: return "custom";
	}
}
var METRIC_DESCRIPTION_KEYS = {
	correctness: "evaluation.metric.description.correctness",
	helpfulness: "evaluation.metric.description.helpfulness",
	stringSimilarity: "evaluation.metric.description.stringSimilarity",
	categorization: "evaluation.metric.description.categorization",
	toolsUsed: "evaluation.metric.description.toolsUsed"
};
function getMetricDescriptionKey(metric) {
	if (metric === void 0) return null;
	return METRIC_DESCRIPTION_KEYS[metric] ?? null;
}
function formatScoreNumerator(value) {
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}
function formatMetricRawScore(value, options = {}) {
	if (resolveDisplayScale(options) !== "oneToFive") return "";
	const num = normalizeMetricValue(value);
	if (num === void 0) return "";
	return `${formatScoreNumerator(num)}/5`;
}
function formatMetricRawScoreSum(values, options = {}) {
	const usable = values.map(normalizeMetricValue).filter((v) => v !== void 0);
	if (usable.length === 0) return "";
	const isOneToFive = resolveDisplayScale(options) === "oneToFive";
	const perCaseMax = isOneToFive ? 5 : 1;
	const numeratorSum = usable.reduce((sum, value) => sum + value, 0);
	const denominator = perCaseMax * usable.length;
	return `${isOneToFive ? formatScoreNumerator(numeratorSum) : numeratorSum.toFixed(2)}/${denominator}`;
}
function formatDeltaPercent(delta, options = {}) {
	if (delta === void 0 || Number.isNaN(delta)) return "";
	const scaled = resolveDisplayScale(options) === "oneToFive" ? delta / 5 * 100 : Math.abs(delta) <= 1 ? delta * 100 : delta;
	const rounded = Math.round(scaled);
	return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
function formatMetricDelta(delta, options = {}) {
	if (delta === void 0 || Number.isNaN(delta)) return "";
	if (isUnscaledCustomMetric(options)) return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${formatMetricNumber(Math.abs(delta))}`;
	return formatDeltaPercent(delta, options);
}
function formatDuration(ms) {
	if (ms === void 0 || Number.isNaN(ms) || ms < 0) return "–";
	if (ms < 1e3) return `${Math.round(ms)}ms`;
	const totalSeconds = ms / 1e3;
	if (totalSeconds < 60) {
		const rounded = Math.round(totalSeconds * 10) / 10;
		if (rounded < 60) return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
	}
	const totalRoundedSeconds = Math.round(totalSeconds);
	const minutes = Math.floor(totalRoundedSeconds / 60);
	const seconds = totalRoundedSeconds - minutes * 60;
	return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}
function formatShortDateTime(value, options = {}) {
	const d = new Date(value);
	const date = d.toLocaleDateString(void 0, {
		month: "short",
		day: "numeric"
	});
	const time = d.toLocaleTimeString(void 0, {
		hour: "2-digit",
		minute: "2-digit",
		...options.withSeconds ? { second: "2-digit" } : {},
		hour12: false
	});
	return options.withSeconds ? `${date}, ${time}` : `${date} ${time}`;
}
function computeDurationMs(startIso, endIso) {
	if (!startIso || !endIso) return void 0;
	const start = new Date(startIso).getTime();
	const end = new Date(endIso).getTime();
	if (Number.isNaN(start) || Number.isNaN(end) || end < start) return void 0;
	return end - start;
}
//#endregion
export { getUserDefinedMetricNames as C, stringifyValue as D, normalizeMetricValue as E, getOperationalMetricEntries as S, isUnscaledCustomMetric as T, formatShortDateTime as _, countSettledRuns as a, getMetricCategory as b, extractCaseAnswer as c, formatMetricDelta as d, formatMetricLabel as f, formatMetricValue as g, formatMetricRawScoreSum as h, computeDurationMs as i, formatDeltaPercent as l, formatMetricRawScore as m, casePassed as n, deriveRunsStatus as o, formatMetricPercent as p, computeDelta as r, extractAnswerText as s, buildScoreShapedMetricGroups as t, formatDuration as u, formatTokens as v, indexOfMax as w, getMetricDescriptionKey as x, getDeltaTone as y };
