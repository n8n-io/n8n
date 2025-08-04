'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EvaluationMetrics = void 0;
const errors_ee_1 = require('@/evaluation.ee/test-runner/errors.ee');
class EvaluationMetrics {
	constructor() {
		this.rawMetricsByName = new Map();
	}
	addResults(result) {
		const addResultsInfo = {
			addedMetrics: {},
			incorrectTypeMetrics: new Set(),
		};
		for (const [metricName, metricValue] of Object.entries(result)) {
			if (typeof metricValue === 'number') {
				addResultsInfo.addedMetrics[metricName] = metricValue;
				if (!this.rawMetricsByName.has(metricName)) {
					this.rawMetricsByName.set(metricName, []);
				}
				this.rawMetricsByName.get(metricName).push(metricValue);
			} else {
				addResultsInfo.incorrectTypeMetrics.add(metricName);
				throw new errors_ee_1.TestCaseExecutionError('INVALID_METRICS', {
					metricName,
					metricValue,
				});
			}
		}
		return addResultsInfo;
	}
	getAggregatedMetrics() {
		const aggregatedMetrics = {};
		for (const [metricName, metricValues] of this.rawMetricsByName.entries()) {
			if (metricValues.length > 0) {
				const metricSum = metricValues.reduce((acc, val) => acc + val, 0);
				aggregatedMetrics[metricName] = metricSum / metricValues.length;
			}
		}
		return aggregatedMetrics;
	}
}
exports.EvaluationMetrics = EvaluationMetrics;
//# sourceMappingURL=evaluation-metrics.ee.js.map
