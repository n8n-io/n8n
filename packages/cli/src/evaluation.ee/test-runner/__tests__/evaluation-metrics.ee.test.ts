import { EvaluationMetrics } from '../evaluation-metrics.ee';

describe('EvaluationMetrics', () => {
	test('should aggregate metrics correctly', () => {
		const metrics = new EvaluationMetrics();

		metrics.addResults({ metric1: 1, metric2: 0 });
		metrics.addResults({ metric1: 0.5, metric2: 0.2 });

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({ metric1: 0.75, metric2: 0.1 });
	});

	test('should throw when metric value is not number', () => {
		const metrics = new EvaluationMetrics();

		expect(() => metrics.addResults({ metric1: 1, metric2: 0 })).not.toThrow();
		expect(() => metrics.addResults({ metric1: '0.5', metric2: 0.2 })).toThrow('INVALID_METRICS');
		expect(() => metrics.addResults({ metric1: 'not a number', metric2: [1, 2, 3] })).toThrow(
			'INVALID_METRICS',
		);
	});

	test('should handle empty metrics', () => {
		const metrics = new EvaluationMetrics();

		const aggregatedMetrics = metrics.getAggregatedMetrics();

		expect(aggregatedMetrics).toEqual({});
	});

	test('should report info on added metrics', () => {
		const metrics = new EvaluationMetrics();
		let info;

		expect(() => (info = metrics.addResults({ metric1: 1, metric2: 0 }))).not.toThrow();

		expect(info).toBeDefined();
		expect(info).toHaveProperty('addedMetrics');
		expect(info!.addedMetrics).toEqual({ metric1: 1, metric2: 0 });
	});
});
