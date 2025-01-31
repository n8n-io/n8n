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

	test('should throw when metric value is not number', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		expect(() => metrics.addResults({ metric1: 1, metric2: 0 })).not.toThrow();
		expect(() => metrics.addResults({ metric1: '0.5', metric2: 0.2 })).toThrow('INVALID_METRICS');
		expect(() => metrics.addResults({ metric1: 'not a number', metric2: [1, 2, 3] })).toThrow(
			'INVALID_METRICS',
		);
	});

	test('should throw when missing values', () => {
		const testMetricNames = new Set(['metric1', 'metric2']);
		const metrics = new EvaluationMetrics(testMetricNames);

		expect(() => metrics.addResults({ metric1: 1 })).toThrow('METRICS_MISSING');
		expect(() => metrics.addResults({ metric2: 0.2 })).toThrow('METRICS_MISSING');
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

	test('should report info on added metrics', () => {
		const testMetricNames = new Set(['metric1']);
		const metrics = new EvaluationMetrics(testMetricNames);
		let info;

		expect(() => (info = metrics.addResults({ metric1: 1, metric2: 0 }))).not.toThrow();

		expect(info).toBeDefined();
		expect(info).toHaveProperty('unknownMetrics');
		expect(info!.unknownMetrics).toEqual(new Set(['metric2']));

		expect(info).toHaveProperty('addedMetrics');
		expect(info!.addedMetrics).toEqual({ metric1: 1 });
	});
});
