import { EvaluationMetrics } from '../evaluation-metrics.ee';

describe('EvaluationMetrics', () => {
	test('should aggregate metrics correctly', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: 0.5, metric2: 0.2 });

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({ metric1: 0.75, metric2: 0.1 });
	});

	test('should aggregate only numbers', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: '0.5', metric2: 0.2 });
		metrics.addResults({ metric1: 'not a number', metric2: [1, 2, 3] });

		const aggregatedUpMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedUpMetrics).toEqual({ metric1: 1, metric2: 0.1 });
	});

	test('should handle missing values', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1 });
		metrics.addResults({ metric2: 0.2 });

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({ metric1: 1, metric2: 0.2 });
	});

	test('should handle empty metrics', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({});
	});

	test('should handle empty testMetrics', () => {
		const metrics = new EvaluationMetrics(new Set());

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: 0.5, metric2: 0.2 });

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({});
	});

	test('should ignore non-relevant values', () => {
		const testMetricNames = new Set(['metric1']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1, notRelevant: 0 });
		metrics.addResults({ metric1: 0.5, notRelevant2: { foo: 'bar' } });

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({ metric1: 0.75 });
	});
});
