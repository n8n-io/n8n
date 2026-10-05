/** Rows of the arm comparison, with the same metrics as compare.py and firstbuild.py. */
import { meanPerBuild, ratio, type FirstBuildSummary } from '../metrics';
import type { BuildTotals, MetricKey } from '../schema';
import {
	formatCost,
	formatNumber,
	formatPercent,
	formatRate,
	formatSeconds,
	formatSigned,
	formatTokens,
} from './format';

export interface MetricRow {
	id: string;
	group: string;
	label: string;
	/** Comparable value per arm: a ratio for rates, else the number. */
	values: Array<number | null>;
	texts: string[];
	/** Null when neither direction is better. */
	higherIsBetter: boolean | null;
	isRate: boolean;
	format: (value: number) => string;
}

/** The per-build medians compare.py prints, in its order. */
export const PER_BUILD_METRICS: Array<{
	key: MetricKey;
	label: string;
	format: (value: number) => string;
}> = [
	{ key: 'wallSeconds', label: 'time (wall)', format: formatSeconds },
	{ key: 'turns', label: 'model steps', format: (value) => formatNumber(value, 1) },
	{ key: 'toolCalls', label: 'tool calls', format: (value) => formatNumber(value, 1) },
	{ key: 'toolFailed', label: 'tool calls failed', format: (value) => formatNumber(value, 1) },
	{ key: 'buildCalls', label: 'build calls', format: (value) => formatNumber(value, 1) },
	{ key: 'buildFailed', label: 'build failures', format: (value) => formatNumber(value, 1) },
	{ key: 'tscErrors', label: 'tsc errors', format: (value) => formatNumber(value, 1) },
	{ key: 'inputTokens', label: 'input tokens', format: formatTokens },
	{ key: 'cacheWriteTokens', label: 'cache write tokens', format: formatTokens },
	{ key: 'outputTokens', label: 'output tokens', format: formatTokens },
	{ key: 'cost', label: 'cost', format: formatCost },
];

const DASH = '–';

function rateRow(
	id: string,
	group: string,
	label: string,
	counts: Array<[number, number] | null>,
): MetricRow {
	return {
		id,
		group,
		label,
		values: counts.map((pair) => (pair ? ratio(pair[0], pair[1]) : null)),
		texts: counts.map((pair) => (pair ? formatRate(pair[0], pair[1]) : DASH)),
		higherIsBetter: true,
		isRate: true,
		format: formatPercent,
	};
}

function numberRow(
	id: string,
	group: string,
	label: string,
	values: Array<number | null>,
	format: (value: number) => string,
	higherIsBetter: boolean | null = false,
): MetricRow {
	return {
		id,
		group,
		label,
		values,
		texts: values.map((value) => (value === null ? DASH : format(value))),
		higherIsBetter,
		isRate: false,
		format,
	};
}

export function comparisonRows(
	totals: Array<BuildTotals | null>,
	firstBuilds: FirstBuildSummary[],
): MetricRow[] {
	const counts = (pick: (entry: BuildTotals) => [number, number]) =>
		totals.map((entry) => (entry ? pick(entry) : null));
	const correctness = 'Correctness (summary.json, as compare.py)';
	const median = 'Median per build';
	const mean = 'Mean per build';
	const first = 'First build (as firstbuild.py)';
	const twoDigits = (value: number) => formatNumber(value, 2);
	return [
		rateRow(
			'built',
			correctness,
			'builds built',
			counts((entry) => [entry.built, entry.builds]),
		),
		rateRow(
			'scenarios',
			correctness,
			'scenarios passed',
			counts((entry) => [entry.scenPass, entry.scenN]),
		),
		rateRow(
			'expectations',
			correctness,
			'expectations passed',
			counts((entry) => [entry.expPass, entry.expN]),
		),
		numberRow(
			'excluded',
			correctness,
			'excluded (scenarios + expectations)',
			totals.map((entry) => (entry ? entry.scenExcluded + entry.expExcluded : null)),
			(value) => formatNumber(value),
			null,
		),
		...PER_BUILD_METRICS.map((metric) =>
			numberRow(
				`median.${metric.key}`,
				median,
				metric.label,
				totals.map((entry) => entry?.median[metric.key] ?? null),
				metric.format,
			),
		),
		...PER_BUILD_METRICS.map((metric) =>
			numberRow(
				`mean.${metric.key}`,
				mean,
				metric.label,
				totals.map((entry) => (entry ? meanPerBuild(entry, metric.key) : null)),
				metric.format,
			),
		),
		numberRow(
			'sum.cost',
			'Total',
			'cost',
			totals.map((entry) => entry?.sum.cost ?? null),
			formatCost,
		),
		numberRow(
			'sum.wallSeconds',
			'Total',
			'time (wall)',
			totals.map((entry) => entry?.sum.wallSeconds ?? null),
			formatSeconds,
		),
		rateRow(
			'fb.firstOk',
			first,
			'first call saves',
			firstBuilds.map((fb) => [fb.firstOk, fb.builds]),
		),
		rateRow(
			'fb.oneShot',
			first,
			'one-shot (never rebuilt)',
			firstBuilds.map((fb) => [fb.oneShot, fb.builds]),
		),
		numberRow(
			'fb.calls',
			first,
			'calls to first save',
			firstBuilds.map((fb) => fb.callsToFirstSave),
			twoDigits,
		),
		numberRow(
			'fb.rebuilds',
			first,
			'rebuilds after first save',
			firstBuilds.map((fb) => fb.rebuilds),
			twoDigits,
		),
		numberRow(
			'fb.verifies',
			first,
			'verify calls',
			firstBuilds.map((fb) => fb.verifies),
			twoDigits,
			null,
		),
		rateRow(
			'fb.oneShotScen',
			first,
			'scenario pass, one-shot builds',
			firstBuilds.map((fb) => [fb.oneShotScenPass, fb.oneShotScenN]),
		),
		rateRow(
			'fb.firstTryCorrect',
			first,
			'first-try correct (one-shot, all scenarios pass)',
			firstBuilds.map((fb) => [fb.firstTryCorrect, fb.withScenarios]),
		),
		rateRow(
			'fb.scen',
			first,
			'scenario pass, all builds',
			firstBuilds.map((fb) => [fb.scenPass, fb.scenN]),
		),
	];
}

/** The change of an arm against the baseline arm, as text. Rates change in percentage points. */
export function deltaText(row: MetricRow, base: number | null, value: number | null): string {
	if (base === null || value === null) return DASH;
	const delta = value - base;
	if (row.isRate) return formatSigned(delta * 100, (points) => `${formatNumber(points, 0)} pp`);
	const percent =
		base !== 0 ? ` (${formatSigned((delta / base) * 100, (p) => `${formatNumber(p, 0)}%`)})` : '';
	return `${formatSigned(delta, row.format)}${percent}`;
}
