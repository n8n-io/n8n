import { EvaluationMetrics } from '../evaluation-metrics.ee';

describe('EvaluationMetrics', () => {
	test('should roll up metrics correctly', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: 0.5, metric2: 0.2 });

		const rolledUpMetrics = metrics.getAggregatedMetrics();

		expect(rolledUpMetrics).toEqual({ metric1: 0.75, metric2: 0.1 });
	});

	test('should roll up only numbers', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: '0.5', metric2: 0.2 });

		const rolledUpMetrics = metrics.getAggregatedMetrics();

		expect(rolledUpMetrics).toEqual({ metric1: 1, metric2: 0.1 });
	});

	test('should handle missing values', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1 });
		metrics.addResults({ metric2: 0.2 });

		const rolledUpMetrics = metrics.getAggregatedMetrics();

		expect(rolledUpMetrics).toEqual({ metric1: 1, metric2: 0.2 });
	});

	test('should handle empty metrics', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		const rolledUpMetrics = metrics.getAggregatedMetrics();

		expect(rolledUpMetrics).toEqual({});
	});

	test('should handle empty testMetrics', () => {
		const metrics = new EvaluationMetrics(new Set());

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: 0.5, metric2: 0.2 });

		const rolledUpMetrics = metrics.getAggregatedMetrics();

		expect(rolledUpMetrics).toEqual({});
	});

	test('should ignore non-relevant values', () => {
		const testMetricNames = new Set(['metric1']);
		const metrics = new EvaluationMetrics(testMetricNames);

		metrics.addResults({ metric1: 1, notRelevant: 0 });
		metrics.addResults({ metric1: 0.5, notRelevant2: { foo: 'bar' } });

		const rolledUpMetrics = metrics.getAggregatedMetrics();

		expect(rolledUpMetrics).toEqual({ metric1: 0.75 });
	});
});
