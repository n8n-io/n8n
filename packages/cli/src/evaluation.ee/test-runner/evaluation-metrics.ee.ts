import type { IDataObject } from 'n8n-workflow';

import { TestCaseExecutionError } from '@/evaluation.ee/test-runner/errors.ee';

export interface EvaluationMetricsAddResultsInfo {
	addedMetrics: Record<string, number>;
	incorrectTypeMetrics: Set<string>;
}

/**
 * A single test case's contribution to the aggregated metrics. Built off the
 * hot path so multiple cases can be processed in parallel; merged sequentially
 * once all parallel work resolves.
 *
 * Note: `incorrectTypeMetrics` is deliberately not on this type. The legacy
 * `addResults` shape includes it for backwards-compat reasons, but builds
 * throw on the first non-numeric value, so the set could only ever hold a
 * single name and is unreachable from the caller anyway.
 */
export interface MetricContribution {
	addedMetrics: Record<string, number>;
}

export class EvaluationMetrics {
	private readonly rawMetricsByName = new Map<string, number[]>();

	/**
	 * Pure: builds a contribution from a single test case's result without
	 * mutating any shared state. Safe to call from parallel fan-out tasks.
	 *
	 * Throws `TestCaseExecutionError('INVALID_METRICS')` on non-numeric values,
	 * matching the historical `addResults` semantics.
	 */
	static buildContribution(result: IDataObject): MetricContribution {
		const addedMetrics: Record<string, number> = {};

		for (const [metricName, metricValue] of Object.entries(result)) {
			if (typeof metricValue === 'number') {
				addedMetrics[metricName] = metricValue;
			} else {
				throw new TestCaseExecutionError('INVALID_METRICS', {
					metricName,
					metricValue,
				});
			}
		}

		return { addedMetrics };
	}

	/**
	 * Single-threaded: applies a contribution to the aggregator. Call once per
	 * contribution after all `buildContribution` calls have resolved.
	 */
	mergeContribution(contribution: MetricContribution): void {
		for (const [metricName, metricValue] of Object.entries(contribution.addedMetrics)) {
			let bucket = this.rawMetricsByName.get(metricName);
			if (!bucket) {
				bucket = [];
				this.rawMetricsByName.set(metricName, bucket);
			}
			bucket.push(metricValue);
		}
	}

	/**
	 * Backwards-compatible wrapper around the build/merge split. The runner
	 * still uses this in commit 2; the parallel fan-out (a later commit) calls
	 * `buildContribution` from inside the per-case task and `mergeContribution`
	 * once after `Promise.all`.
	 *
	 * The returned `incorrectTypeMetrics` is empty by construction (the build
	 * step throws on the first non-numeric value, so there is no caller-visible
	 * post-throw state). Kept for API compatibility with pre-split consumers.
	 */
	addResults(result: IDataObject): EvaluationMetricsAddResultsInfo {
		const contribution = EvaluationMetrics.buildContribution(result);
		this.mergeContribution(contribution);
		return {
			addedMetrics: contribution.addedMetrics,
			incorrectTypeMetrics: new Set(),
		};
	}

	getAggregatedMetrics() {
		const aggregatedMetrics: Record<string, number> = {};

		for (const [metricName, metricValues] of this.rawMetricsByName.entries()) {
			if (metricValues.length > 0) {
				const metricSum = metricValues.reduce((acc, val) => acc + val, 0);
				aggregatedMetrics[metricName] = metricSum / metricValues.length;
			}
		}

		return aggregatedMetrics;
	}
}
