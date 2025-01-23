import difference from 'lodash/difference';
import type { IDataObject } from 'n8n-workflow';

import { TestCaseExecutionError } from '@/evaluation.ee/test-runner/errors.ee';

export class EvaluationMetrics {
	private readonly rawMetricsByName = new Map<string, number[]>();

	constructor(private readonly metricNames: Set<string>) {
		for (const metricName of metricNames) {
			this.rawMetricsByName.set(metricName, []);
		}
	}

	addResults(result: IDataObject): Record<string, number> {
		const addedMetrics: Record<string, number> = {};

		for (const [metricName, metricValue] of Object.entries(result)) {
			if (typeof metricValue === 'number' && this.metricNames.has(metricName)) {
				addedMetrics[metricName] = metricValue;
				this.rawMetricsByName.get(metricName)!.push(metricValue);
			}
		}

		// Check that result contains all expected metrics
		if (difference(Array.from(this.metricNames), Object.keys(addedMetrics)).length > 0) {
			throw new TestCaseExecutionError('METRICS_MISSING', {
				expectedMetrics: Array.from(this.metricNames),
				receivedMetrics: Object.keys(addedMetrics),
			});
		}

		return addedMetrics;
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
