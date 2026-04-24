import type { IDataObject } from 'n8n-workflow';

import { TestCaseExecutionError } from '@/evaluation.ee/test-runner/errors.ee';

export interface EvaluationMetricsAddResultsInfo {
	addedMetrics: Record<string, number>;
	incorrectTypeMetrics: Set<string>;
}

/**
 * A single test case's contribution to the aggregated metrics. Built off the
 * hot path so multiple cases can be processed in parallel; merged sequentially
 * after all parallel work resolves.
 */
export interface MetricContribution {
	values: Map<string, number[]>;
	addedMetrics: Record<string, number>;
	incorrectTypeMetrics: Set<string>;
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
		const contribution: MetricContribution = {
			values: new Map(),
			addedMetrics: {},
			incorrectTypeMetrics: new Set(),
		};

		for (const [metricName, metricValue] of Object.entries(result)) {
			if (typeof metricValue === 'number') {
				contribution.addedMetrics[metricName] = metricValue;
				contribution.values.set(metricName, [metricValue]);
			} else {
				contribution.incorrectTypeMetrics.add(metricName);
				throw new TestCaseExecutionError('INVALID_METRICS', {
					metricName,
					metricValue,
				});
			}
		}

		return contribution;
	}

	/**
	 * Single-threaded: applies a contribution to the aggregator. Call once per
	 * contribution after all `buildContribution` calls have resolved.
	 */
	mergeContribution(contribution: MetricContribution): void {
		for (const [metricName, metricValues] of contribution.values.entries()) {
			let bucket = this.rawMetricsByName.get(metricName);
			if (!bucket) {
				bucket = [];
				this.rawMetricsByName.set(metricName, bucket);
			}
			bucket.push(...metricValues);
		}
	}

	/**
	 * Backwards-compatible wrapper. New callers should prefer the build/merge
	 * split so the build step can run inside parallel fan-out. Tracked for
	 * removal in the post-hackathon cleanup pass.
	 */
	addResults(result: IDataObject): EvaluationMetricsAddResultsInfo {
		const contribution = EvaluationMetrics.buildContribution(result);
		this.mergeContribution(contribution);
		return {
			addedMetrics: contribution.addedMetrics,
			incorrectTypeMetrics: contribution.incorrectTypeMetrics,
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
