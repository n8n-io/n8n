import startCase from 'lodash/startCase';
import type { JsonValue } from 'n8n-workflow';
import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import type { TestTableColumn } from './components/shared/TestTableBase.vue';

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

/**
 * Categories surfaced as a badge on each metric. Mirrors the values of the
 * Evaluation node's `metric` parameter (see `Description.node.ts`).
 */
export type MetricCategory =
	| 'aiBased'
	| 'stringSimilarity'
	| 'categorization'
	| 'toolsUsed'
	| 'custom';

/**
 * Metadata pulled from the workflow's `setMetrics` Evaluation nodes — keyed
 * by the metric name as it appears in the run output.
 */
export type MetricSource = {
	category: MetricCategory;
	nodeName: string;
};

export const SHORT_TABLE_CELL_MIN_WIDTH = 125;
const LONG_TABLE_CELL_MIN_WIDTH = 250;

const PREDEFINED_METRIC_KEYS: ReadonlySet<string> = new Set([
	'promptTokens',
	'completionTokens',
	'totalTokens',
	'executionTime',
]);

/**
 * Returns the user-defined metric names from a metrics record, excluding
 * the predefined ones (token counts, execution time) emitted by every run.
 */
export function getUserDefinedMetricNames(
	metrics: Record<string, number | boolean> | null | undefined,
): string[] {
	if (!metrics) return [];
	return Object.keys(metrics).filter((key) => !PREDEFINED_METRIC_KEYS.has(key));
}

/**
 * Coerces a metric value (which can be `number | boolean`) into a comparable
 * number. Booleans map to 1/0 to keep delta math consistent.
 */
export function normalizeMetricValue(value: number | boolean | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'boolean') return value ? 1 : 0;
	return value;
}

/**
 * Signed delta between current and previous metric values, or undefined when
 * either side is missing (e.g. first run or metric only appeared this run).
 */
export function computeDelta(
	current: number | boolean | undefined,
	previous: number | boolean | undefined,
): number | undefined {
	const currentNum = normalizeMetricValue(current);
	const previousNum = normalizeMetricValue(previous);
	if (currentNum === undefined || previousNum === undefined) return undefined;
	return currentNum - previousNum;
}

/**
 * Maps a delta value to a tone for FE coloring:
 *   - positive (improved vs previous run) → green
 *   - negative (declined vs previous run) → red
 *   - default (no comparison available) → neutral
 */
export function getDeltaTone(delta: number | undefined): DeltaTone {
	if (delta === undefined) return 'default';
	if (delta > 0) return 'positive';
	if (delta < 0) return 'negative';
	return 'default';
}

/**
 * Formats a token count as e.g. "3,912t" — used in the per-case header.
 */
export function formatTokens(tokens: number | undefined): string {
	if (tokens === undefined || Number.isNaN(tokens)) return '–';
	return `${Math.round(tokens).toLocaleString()}t`;
}

/**
 * Built-in AI-based metric handlers (correctness, helpfulness) return integer
 * scores 1–5 — see `nodes-base/nodes/Evaluation/utils/metricHandlers.ts`.
 * The other built-in handlers (stringSimilarity, categorization, toolsUsed)
 * return 0–1.
 */
export type MetricScale = 'oneToFive' | 'normalized';

export function getMetricScale(category: MetricCategory | undefined): MetricScale {
	return category === 'aiBased' ? 'oneToFive' : 'normalized';
}

/**
 * Formats a numeric metric value as a percentage string e.g. "94%".
 *
 * The conversion depends on the metric's category:
 * - `aiBased` (correctness/helpfulness): integer 1–5 → `value / 5 * 100`,
 *   so a perfect 5 renders as "100%" and 1 as "20%".
 * - Anything else (heuristic built-ins, custom metrics, or no category):
 *   heuristic — values within [-1, 1] are 0–1 normalized scores scaled to
 *   percent; values outside that range are assumed to already be percentages.
 */
export function formatMetricPercent(
	value: number | boolean | undefined,
	options: { category?: MetricCategory } = {},
): string {
	const num = normalizeMetricValue(value);
	if (num === undefined || Number.isNaN(num)) return '–';
	const scaled =
		getMetricScale(options.category) === 'oneToFive'
			? (num / 5) * 100
			: Math.abs(num) <= 1
				? num * 100
				: num;
	return `${Math.round(scaled)}%`;
}

/**
 * Formats a metric key for display (snake_case / camelCase → Title Case).
 * `count_accuracy` → "Count Accuracy", `helpfulness` → "Helpfulness".
 */
export function formatMetricLabel(name: string): string {
	return startCase(name);
}

/**
 * Maps the raw `metric` parameter value of an Evaluation node to its display
 * category. `correctness` and `helpfulness` collapse into "AI-based" since
 * they're both LLM-as-judge metrics.
 */
export function getMetricCategory(metric: string | undefined): MetricCategory {
	switch (metric) {
		case 'correctness':
		case 'helpfulness':
			return 'aiBased';
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

function formatScoreNumerator(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

/**
 * Returns the raw score in `x/y` form for a single per-case row. Only AI-based
 * metrics surface this — normalized 0–1 metrics are hidden because the
 * percentage already conveys the same information.
 */
export function formatMetricRawScore(
	value: number | boolean | undefined,
	options: { category?: MetricCategory } = {},
): string {
	if (getMetricScale(options.category) !== 'oneToFive') return '';
	const num = normalizeMetricValue(value);
	if (num === undefined || Number.isNaN(num)) return '';
	return `${formatScoreNumerator(num)}/5`;
}

/**
 * Returns the run-level totals as a collapsed sum, e.g.
 *   - `13/15`  for AI-based 1–5 metrics (sum of scores / 5 × case count)
 *   - `1.11/6` for normalized 0–1 metrics (sum of scores / case count)
 * Surfaces under each strip card so the user can see the totals that
 * summed into the aggregated percentage.
 */
export function formatMetricRawScoreSum(
	values: Array<number | boolean | undefined>,
	options: { category?: MetricCategory } = {},
): string {
	const usable = values
		.map(normalizeMetricValue)
		.filter((v): v is number => v !== undefined && !Number.isNaN(v));
	if (usable.length === 0) return '';
	const isOneToFive = getMetricScale(options.category) === 'oneToFive';
	const perCaseMax = isOneToFive ? 5 : 1;
	const numeratorSum = usable.reduce((sum, value) => sum + value, 0);
	const denominator = perCaseMax * usable.length;
	const numeratorDisplay = isOneToFive
		? formatScoreNumerator(numeratorSum)
		: numeratorSum.toFixed(2);
	return `${numeratorDisplay}/${denominator}`;
}

/**
 * Formats a delta in percentage points with a leading sign, e.g. "+4%" / "-28%".
 * Mirrors `formatMetricPercent` — for 1–5-scale metrics a delta of +1 (e.g.
 * 4 → 5) becomes +20%; for normalized 0–1 metrics +0.04 becomes +4%.
 */
export function formatDeltaPercent(
	delta: number | undefined,
	options: { category?: MetricCategory } = {},
): string {
	if (delta === undefined || Number.isNaN(delta)) return '';
	const scaled =
		getMetricScale(options.category) === 'oneToFive'
			? (delta / 5) * 100
			: Math.abs(delta) <= 1
				? delta * 100
				: delta;
	const rounded = Math.round(scaled);
	const sign = rounded > 0 ? '+' : '';
	return `${sign}${rounded}%`;
}

/**
 * Formats a duration in milliseconds as a compact human label:
 *   - `< 1s`         → "Xms" (e.g. "243ms")
 *   - `1s` – `< 60s` → "Xs" or "X.Xs" (trailing `.0` dropped, e.g. "8s", "1.2s")
 *   - `>= 60s`       → "Xm Ys", `Ys` omitted when zero (e.g. "1m 30s", "2m")
 */
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

/**
 * Duration in ms between two ISO date strings, or undefined when either end
 * is missing.
 */
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
	// Default sort order
	// -> inputs, outputs, metrics, tokens, executionTime
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

	// Add any missing columns from defaultOrder that aren't in the cached order
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
			// Check if any content exceeds 10 characters
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
