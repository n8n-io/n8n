import startCase from 'lodash/startCase';
import {
	normalizeMetricScore,
	ONE_TO_FIVE_METRIC_KEYS,
	RESERVED_METRIC_KEYS,
	type MetricScale,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import type { JsonValue } from 'n8n-workflow';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import type { TestTableColumn } from './components/shared/TestTableBase.vue';
import type { EvalCollectionRunStatus } from './evalCollections.types';

/**
 * Extract a human-readable answer string from an end-node output value.
 * Priority: `output` > `text` > `response` > single-key object value > JSON.stringify.
 * Keep in sync with the `endAnswer` expression in buildEvaluationConfigDto.ts.
 */
export function extractAnswerText(json: unknown): string {
	if (json === null || json === undefined) return '';
	if (typeof json !== 'object') return String(json);
	const preferred =
		Reflect.get(json, 'output') ?? Reflect.get(json, 'text') ?? Reflect.get(json, 'response');
	if (preferred !== undefined && preferred !== null) {
		return typeof preferred === 'object' ? JSON.stringify(preferred) : String(preferred);
	}
	const keys = Object.keys(json);
	if (keys.length === 1) {
		const only = Reflect.get(json, keys[0]);
		return typeof only === 'object' && only !== null ? JSON.stringify(only) : String(only);
	}
	return JSON.stringify(json);
}

/**
 * The node-under-test's answer for a case: the end node's output during the test
 * run, via `extractAnswerText`. Falls back to persisted `outputs` when the
 * execution isn't loaded (or the run had no setOutputs node).
 */
export function extractCaseAnswer(
	execution: IExecutionResponse | null | undefined,
	endNodeName: string,
	fallbackOutputs: unknown,
): string {
	if (execution && endNodeName) {
		const firstItem =
			execution.data?.resultData?.runData?.[endNodeName]?.[0]?.data?.main?.[0]?.[0]?.json;
		if (firstItem !== undefined) return extractAnswerText(firstItem);
	}
	return extractAnswerText(fallbackOutputs);
}

export type Column =
	| {
			key: string;
			label: string;
			visible: boolean;
			numeric?: boolean;
			disabled: false;
			columnType: 'inputs' | 'outputs' | 'metrics';
	  }
	| { key: string; disabled: true };

export type Header = TestTableColumn<TestCaseExecutionRecord & { index: number }>;

export type DeltaTone = 'positive' | 'negative' | 'default';

// Categories — mirror the Evaluation node's `metric` parameter values.
export type MetricCategory =
	| 'aiBased'
	| 'stringSimilarity'
	| 'categorization'
	| 'toolsUsed'
	| 'custom';

// Metadata pulled from the workflow's `setMetrics` nodes, keyed by metric name.
export type MetricSource = {
	category: MetricCategory;
	nodeName: string;
};

export const SHORT_TABLE_CELL_MIN_WIDTH = 125;
const LONG_TABLE_CELL_MIN_WIDTH = 250;

const PREDEFINED_METRIC_KEYS: ReadonlySet<string> = new Set(RESERVED_METRIC_KEYS);

// Excludes predefined keys (token counts, execution time) emitted by every run.
export function getUserDefinedMetricNames(
	metrics: Record<string, number> | null | undefined,
): string[] {
	if (!metrics) return [];
	return Object.keys(metrics).filter((key) => !PREDEFINED_METRIC_KEYS.has(key));
}

// The predefined operational metrics (token counts, execution time) present on a
// run, in a stable display order. These are shown separately from check scores.
export function getOperationalMetricEntries(
	metrics: Record<string, number> | null | undefined,
): Array<{ key: string; value: number }> {
	if (!metrics) return [];
	return [...PREDEFINED_METRIC_KEYS]
		.filter((key) => key in metrics)
		.map((key) => ({ key, value: metrics[key] }));
}

export function normalizeMetricValue(value: number | undefined): number | undefined {
	if (value === undefined || Number.isNaN(value)) return undefined;
	return value;
}

// Index of the max value, ignoring nulls; ties resolve to the first (left-most)
// entry, matching the version letter order. Null if every value is null.
export function indexOfMax(values: Array<number | null>): number | null {
	let best: number | null = null;
	let bestValue = -Infinity;
	values.forEach((value, index) => {
		if (value !== null && value > bestValue) {
			bestValue = value;
			best = index;
		}
	});
	return best;
}

// Overall status of a run set: "running" while any run is queued/executing,
// "error" when every run failed or was cancelled (so an all-failed set isn't a
// green "done"), otherwise "done". Shared so the card and compare header agree.
export function deriveRunsStatus(
	runs: Array<{ status: EvalCollectionRunStatus }>,
): 'running' | 'done' | 'error' {
	if (runs.some((run) => run.status === 'new' || run.status === 'running')) return 'running';
	if (
		runs.length > 0 &&
		runs.every((run) => run.status === 'error' || run.status === 'cancelled')
	) {
		return 'error';
	}
	return 'done';
}

// How many runs have settled. Uses the inverse of `deriveRunsStatus`'s in-flight
// predicate so the "N/M complete" count and the status can't disagree.
export function countSettledRuns(runs: Array<{ status: EvalCollectionRunStatus }>): number {
	return runs.filter((run) => run.status !== 'new' && run.status !== 'running').length;
}

// Reduce per-run aggregate metrics to score metrics, each normalized to [0, 1]
// by its scale. Values align by run index — `null` where a run lacks the metric,
// so a skipped metric never shifts later versions out of their color/letter slot.
// A metric is included only if every run that reported it yields a score;
// operational counts (tokens, latency) normalize to `null` and are dropped, since
// the bars clamp to max=1 and an absolute count would render a maxed-out bar.
export function buildScoreShapedMetricGroups(
	runs: Array<{
		metrics: Record<string, number> | null;
		metricScales?: Record<string, MetricScale>;
	}>,
	defaultScales?: Record<string, MetricScale>,
): Array<{ key: string; values: Array<number | null> }> {
	// Each run normalizes on its own snapshot scales (falling back to the
	// collection-wide default) so a metric whose scale changed between runs isn't
	// misnormalized against a single shared scale.
	const scaleFor = (run: { metricScales?: Record<string, MetricScale> }, key: string) =>
		run.metricScales?.[key] ?? defaultScales?.[key];

	const orderedKeys: string[] = [];
	const seen = new Set<string>();
	for (const run of runs) {
		for (const key of Object.keys(run.metrics ?? {})) {
			if (seen.has(key)) continue;
			seen.add(key);
			orderedKeys.push(key);
		}
	}

	const scoreKeys = orderedKeys.filter(
		(key) =>
			runs.some((run) => run.metrics?.[key] !== undefined) &&
			runs.every((run) => {
				const value = run.metrics?.[key];
				return value === undefined || normalizeMetricScore(key, value, scaleFor(run, key)) !== null;
			}),
	);

	return scoreKeys.map((key) => ({
		key,
		values: runs.map((run) => {
			const value = run.metrics?.[key];
			return typeof value === 'number'
				? normalizeMetricScore(key, value, scaleFor(run, key))
				: null;
		}),
	}));
}

// Mean of a metrics map's score values, normalized to [0, 1] by scale. Single
// definition in @n8n/api-types so the FE compare surfaces and the BE insights
// agent can't disagree on what a case/run scored.
export { averageNormalizedScore } from '@n8n/api-types';

export function computeDelta(
	current: number | undefined,
	previous: number | undefined,
): number | undefined {
	const currentNum = normalizeMetricValue(current);
	const previousNum = normalizeMetricValue(previous);
	if (currentNum === undefined || previousNum === undefined) return undefined;
	return currentNum - previousNum;
}

export function getDeltaTone(delta: number | undefined): DeltaTone {
	if (delta === undefined) return 'default';
	if (delta > 0) return 'positive';
	if (delta < 0) return 'negative';
	return 'default';
}

export function formatTokens(
	tokens: number | undefined,
	options: { withUnit?: boolean } = {},
): string {
	if (tokens === undefined || Number.isNaN(tokens)) return '–';
	const formatted = Math.round(tokens).toLocaleString();
	return options.withUnit === false ? formatted : `${formatted}t`;
}

// Coerce an arbitrary cell/output value to a string for display or persistence.
export function stringifyValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
}

// AI-based handlers (correctness, helpfulness) return 1-5; others return 0-1.
export type MetricDisplayScale = 'oneToFive' | 'normalized';

export function getMetricScale(category: MetricCategory | undefined): MetricDisplayScale {
	return category === 'aiBased' ? 'oneToFive' : 'normalized';
}

// Display scale for a metric: prefer the authoritative `MetricScale` resolved
// from the run's config (oneToFive vs. the 0–1 `normalized` bucket that covers
// unit + boolean); fall back to the coarse category heuristic when absent.
function resolveDisplayScale(options: {
	category?: MetricCategory;
	scale?: MetricScale;
}): MetricDisplayScale {
	if (options.scale) return options.scale === 'oneToFive' ? 'oneToFive' : 'normalized';
	return getMetricScale(options.category);
}

// A check as rendered on the wizard results page. `isAiJudged` checks show an
// average score; the rest are pass/fail. Icon fields mirror the check tile.
export type ResultCheck = {
	key: string;
	label: string;
	description?: string;
	isAiJudged: boolean;
	icon: IconName;
	iconBg?: string;
	iconFg?: string;
};

// A pass/fail (non-aiBased) case passes only when it scores a perfect 1.
export function casePassed(value: number | undefined): boolean {
	return normalizeMetricValue(value) === 1;
}

// With a resolved `scale` (from the run's config snapshot) the score goes
// through the shared `normalizeMetricScore`, so the runs page matches the
// compare view — a 1–5 judge metric renders 100%, not its raw 5. Without a
// scale the legacy category heuristic applies: aiBased 1–5 → value/5*100;
// otherwise |v|≤1 is a 0-1 score scaled to percent and out-of-range values are
// assumed to be percentages already.
export function formatMetricPercent(
	value: number | undefined,
	options: { key?: string; category?: MetricCategory; scale?: MetricScale } = {},
): string {
	const num = normalizeMetricValue(value);
	if (num === undefined) return '–';
	// With a resolved scale, normalize exactly (unit vs. boolean matters here) —
	// `resolveDisplayScale`'s coarse oneToFive/normalized bucket isn't enough.
	if (options.scale) {
		const score = normalizeMetricScore(options.key ?? '', num, options.scale);
		return score === null ? '–' : `${Math.round(score * 100)}%`;
	}
	const scaled =
		getMetricScale(options.category) === 'oneToFive'
			? (num / 5) * 100
			: Math.abs(num) <= 1
				? num * 100
				: num;
	return `${Math.round(scaled)}%`;
}

// snake_case / camelCase → Title Case (e.g. count_accuracy → "Count Accuracy").
export function formatMetricLabel(name: string): string {
	return startCase(name);
}

// `correctness` + `helpfulness` collapse into 'aiBased' (both LLM-as-judge).
export function getMetricCategory(metric: string | undefined): MetricCategory {
	if (metric !== undefined && (ONE_TO_FIVE_METRIC_KEYS as readonly string[]).includes(metric)) {
		return 'aiBased';
	}
	switch (metric) {
		case 'stringSimilarity':
			return 'stringSimilarity';
		case 'categorization':
			return 'categorization';
		case 'toolsUsed':
			return 'toolsUsed';
		default:
			return 'custom';
	}
}

// Short "what this measures" copy for built-in metrics, mirrored from the
// Evaluation node's options. Custom/unknown metrics have no canned description.
const METRIC_DESCRIPTION_KEYS: Partial<Record<string, BaseTextKey>> = {
	correctness: 'evaluation.metric.description.correctness',
	helpfulness: 'evaluation.metric.description.helpfulness',
	stringSimilarity: 'evaluation.metric.description.stringSimilarity',
	categorization: 'evaluation.metric.description.categorization',
	toolsUsed: 'evaluation.metric.description.toolsUsed',
};

// i18n key for a metric's description, or null for custom/unknown metrics.
export function getMetricDescriptionKey(metric: string | undefined): BaseTextKey | null {
	if (metric === undefined) return null;
	return METRIC_DESCRIPTION_KEYS[metric] ?? null;
}

function formatScoreNumerator(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

// `x/5` form for AI-based per-case rows (only — 0-1 metrics duplicate the %).
export function formatMetricRawScore(
	value: number | undefined,
	options: { category?: MetricCategory; scale?: MetricScale } = {},
): string {
	if (resolveDisplayScale(options) !== 'oneToFive') return '';
	const num = normalizeMetricValue(value);
	if (num === undefined) return '';
	return `${formatScoreNumerator(num)}/5`;
}

// Average score for the wizard results card: AI-based shows "X / 5", others show
// the 0–1 average to two decimals. Mean across the run's cases, not a percentage.
export function formatMetricAverage(
	value: number | undefined,
	options: { category?: MetricCategory } = {},
): string {
	const num = normalizeMetricValue(value);
	if (num === undefined) return '–';
	return getMetricScale(options.category) === 'oneToFive'
		? `${formatScoreNumerator(num)} / 5`
		: num.toFixed(2);
}

// Run-level totals: "13/15" (AI-based: sum / 5×count) or "1.11/6" (0-1: sum / count).
export function formatMetricRawScoreSum(
	values: Array<number | undefined>,
	options: { category?: MetricCategory; scale?: MetricScale } = {},
): string {
	const usable = values.map(normalizeMetricValue).filter((v): v is number => v !== undefined);
	if (usable.length === 0) return '';
	const isOneToFive = resolveDisplayScale(options) === 'oneToFive';
	const perCaseMax = isOneToFive ? 5 : 1;
	const numeratorSum = usable.reduce((sum, value) => sum + value, 0);
	const denominator = perCaseMax * usable.length;
	const numeratorDisplay = isOneToFive
		? formatScoreNumerator(numeratorSum)
		: numeratorSum.toFixed(2);
	return `${numeratorDisplay}/${denominator}`;
}

// Signed delta in percentage points (e.g. "+4%" / "-28%"). 1-5: +1 → +20%; 0-1: +0.04 → +4%.
export function formatDeltaPercent(
	delta: number | undefined,
	options: { category?: MetricCategory; scale?: MetricScale } = {},
): string {
	if (delta === undefined || Number.isNaN(delta)) return '';
	const scaled =
		resolveDisplayScale(options) === 'oneToFive'
			? (delta / 5) * 100
			: Math.abs(delta) <= 1
				? delta * 100
				: delta;
	const rounded = Math.round(scaled);
	const sign = rounded > 0 ? '+' : '';
	return `${sign}${rounded}%`;
}

// Compact duration: <1s → "243ms", <60s → "8s"/"1.2s", ≥60s → "1m 30s"/"2m".
export function formatDuration(ms: number | undefined): string {
	if (ms === undefined || Number.isNaN(ms) || ms < 0) return '–';
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const totalSeconds = ms / 1000;
	if (totalSeconds < 60) {
		const rounded = Math.round(totalSeconds * 10) / 10;
		// Edge case: 59.95s–59.999s rounds to 60 — promote to minutes branch.
		if (rounded < 60) {
			return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
		}
	}
	const totalRoundedSeconds = Math.round(totalSeconds);
	const minutes = Math.floor(totalRoundedSeconds / 60);
	const seconds = totalRoundedSeconds - minutes * 60;
	return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

// Short local date + 24h time, e.g. "May 4 18:04". `withSeconds` adds seconds and
// a comma ("May 4, 18:04:05") for surfaces that disambiguate runs to the second.
export function formatShortDateTime(
	value: string | number | Date,
	options: { withSeconds?: boolean } = {},
): string {
	const d = new Date(value);
	const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	const time = d.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		...(options.withSeconds ? { second: '2-digit' } : {}),
		hour12: false,
	});
	return options.withSeconds ? `${date}, ${time}` : `${date} ${time}`;
}

// Duration in ms between two ISO timestamps, or undefined if either is missing.
export function computeDurationMs(
	startIso: string | undefined,
	endIso: string | null | undefined,
): number | undefined {
	if (!startIso || !endIso) return undefined;
	const start = new Date(startIso).getTime();
	const end = new Date(endIso).getTime();
	if (Number.isNaN(start) || Number.isNaN(end) || end < start) return undefined;
	return end - start;
}

export function getDefaultOrderedColumns(
	run?: TestRunRecord,
	filteredTestCases?: TestCaseExecutionRecord[],
) {
	// Default sort order: inputs, outputs, metrics, tokens, executionTime.
	const metricColumns = Object.keys(run?.metrics ?? {}).filter(
		(key) => !PREDEFINED_METRIC_KEYS.has(key),
	);
	const specialColumns = Array.from(PREDEFINED_METRIC_KEYS).filter((key) =>
		run?.metrics ? key in run.metrics : false,
	);
	const inputColumns = getTestCasesColumns(filteredTestCases ?? [], 'inputs');
	const outputColumns = getTestCasesColumns(filteredTestCases ?? [], 'outputs');

	const defaultOrder: Column[] = [
		...mapToColumns(inputColumns, 'inputs'),
		...mapToColumns(outputColumns, 'outputs'),
		...mapToColumns(metricColumns, 'metrics', true),
		...mapToColumns(specialColumns, 'metrics', true),
	];

	return defaultOrder;
}

export function applyCachedVisibility(
	columns: Column[],
	visibility?: Record<string, boolean>,
): Column[] {
	if (!visibility) {
		return columns;
	}

	return columns.map((column) =>
		column.disabled
			? column
			: {
					...column,
					visible: visibility.hasOwnProperty(column.key) ? visibility[column.key] : column.visible,
				},
	);
}

export function applyCachedSortOrder(defaultOrder: Column[], cachedOrder?: string[]): Column[] {
	if (!cachedOrder?.length) {
		return defaultOrder;
	}

	const result = cachedOrder.map((columnKey): Column => {
		const matchingColumn = defaultOrder.find((col) => columnKey === col.key);
		if (!matchingColumn) {
			return {
				key: columnKey,
				disabled: true,
			};
		}
		return matchingColumn;
	});

	const missingColumns = defaultOrder.filter((defaultCol) => !cachedOrder.includes(defaultCol.key));
	result.push(...missingColumns);

	return result;
}

export function getTestCasesColumns(
	cases: TestCaseExecutionRecord[],
	columnType: 'inputs' | 'outputs',
): string[] {
	const inputColumnNames = cases.reduce(
		(set, testCase) => {
			Object.keys(testCase[columnType] ?? {}).forEach((key) => set.add(key));
			return set;
		},
		new Set([] as string[]),
	);

	return Array.from(inputColumnNames.keys());
}

function mapToColumns(
	columnNames: string[],
	columnType: 'inputs' | 'outputs' | 'metrics',
	numeric?: boolean,
): Column[] {
	return columnNames.map((column) => ({
		key: `${columnType}.${column}`,
		label: column,
		visible: true,
		disabled: false,
		columnType,
		numeric,
	}));
}

function formatValue(
	key: string,
	value?: JsonValue,
	{ numeric }: { numeric?: boolean } = { numeric: false },
) {
	let stringValue: string;

	if (numeric && typeof value === 'number' && !PREDEFINED_METRIC_KEYS.has(key)) {
		stringValue = value.toFixed(2) ?? '-';
	} else if (typeof value === 'object' && value !== null) {
		stringValue = JSON.stringify(value, null, 2);
	} else {
		stringValue = `${value}`;
	}

	return stringValue;
}

export function getTestTableHeaders(
	columnNames: Column[],
	testCases: TestCaseExecutionRecord[],
): Header[] {
	return columnNames
		.filter((column): column is Column & { disabled: false } => !column.disabled && column.visible)
		.map((column) => {
			const hasLongContent = Boolean(
				testCases.find((row) => {
					const value = row[column.columnType]?.[column.label];
					const formattedValue = formatValue(column.label, value, { numeric: column.numeric });

					return formattedValue?.length > 10;
				}),
			);

			return {
				prop: column.key,
				label: column.disabled ? column.key : column.label,
				sortable: true,
				filter: true,
				showHeaderTooltip: true,
				minWidth: hasLongContent ? LONG_TABLE_CELL_MIN_WIDTH : SHORT_TABLE_CELL_MIN_WIDTH,
				formatter: (row: TestCaseExecutionRecord) => {
					const value = row[column.columnType]?.[column.label];
					const formattedValue = formatValue(column.label, value, { numeric: column.numeric });

					return formattedValue;
				},
			};
		});
}
