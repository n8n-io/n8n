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

	describe('buildContribution + mergeContribution', () => {
		test('buildContribution does not mutate the aggregator', () => {
			const metrics = new EvaluationMetrics();
			EvaluationMetrics.buildContribution({ metric1: 1, metric2: 0.5 });
			expect(metrics.getAggregatedMetrics()).toEqual({});
		});

		test('mergeContribution applies a contribution to the aggregator', () => {
			const metrics = new EvaluationMetrics();
			const contribution = EvaluationMetrics.buildContribution({ metric1: 1, metric2: 0 });
			metrics.mergeContribution(contribution);
			expect(metrics.getAggregatedMetrics()).toEqual({ metric1: 1, metric2: 0 });
		});

		test('parallel build + sequential merge produces the same averages as addResults', () => {
			const inputs = [
				{ metric1: 1, metric2: 0 },
				{ metric1: 0.5, metric2: 0.2 },
				{ metric1: 0.75, metric2: 0.6 },
			];

			const sequential = new EvaluationMetrics();
			for (const input of inputs) sequential.addResults(input);

			const parallel = new EvaluationMetrics();
			const contributions = inputs.map((input) => EvaluationMetrics.buildContribution(input));
			// Merge order is reversed to prove averages do not depend on order.
			for (const contribution of [...contributions].reverse()) {
				parallel.mergeContribution(contribution);
			}

			expect(parallel.getAggregatedMetrics()).toEqual(sequential.getAggregatedMetrics());
		});

		test('buildContribution throws on non-numeric values', () => {
			expect(() => EvaluationMetrics.buildContribution({ metric1: 'oops' })).toThrow(
				'INVALID_METRICS',
			);
		});
	});
});
