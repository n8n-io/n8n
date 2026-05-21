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

const PREDEFINED_METRIC_KEYS: ReadonlySet<string> = new Set([
	'promptTokens',
	'completionTokens',
	'totalTokens',
	'executionTime',
]);

// Excludes predefined keys (token counts, execution time) emitted by every run.
export function getUserDefinedMetricNames(
	metrics: Record<string, number> | null | undefined,
): string[] {
	if (!metrics) return [];
	return Object.keys(metrics).filter((key) => !PREDEFINED_METRIC_KEYS.has(key));
}

export function normalizeMetricValue(value: number | undefined): number | undefined {
	if (value === undefined || Number.isNaN(value)) return undefined;
	return value;
}

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

export function formatTokens(tokens: number | undefined): string {
	if (tokens === undefined || Number.isNaN(tokens)) return '–';
	return `${Math.round(tokens).toLocaleString()}t`;
}

// AI-based handlers (correctness, helpfulness) return 1-5; others return 0-1.
export type MetricScale = 'oneToFive' | 'normalized';

export function getMetricScale(category: MetricCategory | undefined): MetricScale {
	return category === 'aiBased' ? 'oneToFive' : 'normalized';
}

// aiBased: 1-5 → value/5*100 (so 5 → 100%). Otherwise: |v|≤1 is a 0-1 score
// scaled to percent; out-of-range values are assumed to be percentages already.
export function formatMetricPercent(
	value: number | undefined,
	options: { category?: MetricCategory } = {},
): string {
	const num = normalizeMetricValue(value);
	if (num === undefined) return '–';
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

// `x/5` form for AI-based per-case rows (only — 0-1 metrics duplicate the %).
export function formatMetricRawScore(
	value: number | undefined,
	options: { category?: MetricCategory } = {},
): string {
	if (getMetricScale(options.category) !== 'oneToFive') return '';
	const num = normalizeMetricValue(value);
	if (num === undefined) return '';
	return `${formatScoreNumerator(num)}/5`;
}

// Run-level totals: "13/15" (AI-based: sum / 5×count) or "1.11/6" (0-1: sum / count).
export function formatMetricRawScoreSum(
	values: Array<number | undefined>,
	options: { category?: MetricCategory } = {},
): string {
	const usable = values.map(normalizeMetricValue).filter((v): v is number => v !== undefined);
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

// Signed delta in percentage points (e.g. "+4%" / "-28%"). 1-5: +1 → +20%; 0-1: +0.04 → +4%.
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
