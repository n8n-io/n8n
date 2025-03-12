import difference from 'lodash/difference';
import type { IDataObject } from 'n8n-workflow';

import { TestCaseExecutionError } from '@/evaluation.ee/test-runner/errors.ee';

export interface EvaluationMetricsAddResultsInfo {
	addedMetrics: Record<string, number>;
	missingMetrics: Set<string>;
	unknownMetrics: Set<string>;
	incorrectTypeMetrics: Set<string>;
}

export class EvaluationMetrics {
	private readonly rawMetricsByName = new Map<string, number[]>();

	constructor(private readonly metricNames: Set<string>) {
		for (const metricName of metricNames) {
			this.rawMetricsByName.set(metricName, []);
		}
	}

	addResults(result: IDataObject): EvaluationMetricsAddResultsInfo {
		const addResultsInfo: EvaluationMetricsAddResultsInfo = {
			addedMetrics: {},
			missingMetrics: new Set<string>(),
			unknownMetrics: new Set<string>(),
			incorrectTypeMetrics: new Set<string>(),
		};

		for (const [metricName, metricValue] of Object.entries(result)) {
			if (this.metricNames.has(metricName)) {
				if (typeof metricValue === 'number') {
					addResultsInfo.addedMetrics[metricName] = metricValue;
					this.rawMetricsByName.get(metricName)!.push(metricValue);
				} else {
					throw new TestCaseExecutionError('INVALID_METRICS', {
						metricName,
						metricValue,
					});
				}
			} else {
				addResultsInfo.unknownMetrics.add(metricName);
			}
		}

		// Check that result contains all expected metrics
		if (
			difference(Array.from(this.metricNames), Object.keys(addResultsInfo.addedMetrics)).length > 0
		) {
			throw new TestCaseExecutionError('METRICS_MISSING', {
				expectedMetrics: Array.from(this.metricNames).sort(),
				receivedMetrics: Object.keys(addResultsInfo.addedMetrics).sort(),
			});
		}

		return addResultsInfo;
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
