// ---------------------------------------------------------------------------
// Compare two arms of latency runs (for example, baseline and prewarm)
// ---------------------------------------------------------------------------

import { LATENCY_METRIC_NAMES, type LatencyMetricName, type LatencyRunRecord } from './metrics';

export interface MetricSummary {
	n: number;
	median: number | null;
	p90: number | null;
	mean: number | null;
}

export interface MetricComparison {
	metric: LatencyMetricName;
	a: MetricSummary;
	b: MetricSummary;
	/** Median of arm b minus median of arm a. Negative means b is faster. */
	medianDeltaMs: number | null;
}

export function summarize(values: number[]): MetricSummary {
	if (values.length === 0) return { n: 0, median: null, p90: null, mean: null };
	const sorted = [...values].sort((x, y) => x - y);
	const mid = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	// Nearest-rank percentile: small samples report a value that was observed.
	const p90 = sorted[Math.ceil(0.9 * sorted.length) - 1];
	const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
	return { n: sorted.length, median, p90, mean };
}

export function compareArms(a: LatencyRunRecord[], b: LatencyRunRecord[]): MetricComparison[] {
	return LATENCY_METRIC_NAMES.map((metric) => {
		const summaryA = summarize(metricValues(a, metric));
		const summaryB = summarize(metricValues(b, metric));
		const medianDeltaMs =
			summaryA.median === null || summaryB.median === null
				? null
				: summaryB.median - summaryA.median;
		return { metric, a: summaryA, b: summaryB, medianDeltaMs };
	});
}

export function formatComparison(a: LatencyRunRecord[], b: LatencyRunRecord[]): string {
	const labelA = a[0]?.label ?? 'a';
	const labelB = b[0]?.label ?? 'b';
	const lines = [
		`${labelA} (${a.length} runs) vs ${labelB} (${b.length} runs)`,
		'',
		...compareArms(a, b).map(formatRow),
		'',
		`Missing in ${labelA}: ${formatMissing(a)}`,
		`Missing in ${labelB}: ${formatMissing(b)}`,
	];
	return lines.join('\n');
}

function metricValues(runs: LatencyRunRecord[], metric: LatencyMetricName): number[] {
	return runs.flatMap((run) => {
		const value = run.metrics[metric];
		return value === null ? [] : [value];
	});
}

function formatRow({ metric, a, b, medianDeltaMs }: MetricComparison): string {
	const delta =
		medianDeltaMs === null ? 'n/a' : `${medianDeltaMs > 0 ? '+' : ''}${seconds(medianDeltaMs)}`;
	return `${metric.padEnd(22)} ${formatSummary(a)}  →  ${formatSummary(b)}  median Δ ${delta}`;
}

function formatSummary({ n, median, p90, mean }: MetricSummary): string {
	return `n=${n} median ${seconds(median)} p90 ${seconds(p90)} mean ${seconds(mean)}`;
}

function seconds(ms: number | null): string {
	return ms === null ? '-' : `${(ms / 1000).toFixed(1)}s`;
}

function formatMissing(runs: LatencyRunRecord[]): string {
	const counts = new Map<string, number>();
	for (const reason of runs.flatMap((run) => run.metrics.missing)) {
		counts.set(reason, (counts.get(reason) ?? 0) + 1);
	}
	if (counts.size === 0) return 'none';
	return [...counts].map(([reason, count]) => `${reason}: ${count}`).join(', ');
}
