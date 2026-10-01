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

	describe('build/merge split', () => {
		test('buildContribution is pure and does not mutate aggregator state', () => {
			const metrics = new EvaluationMetrics();

			const contribution = EvaluationMetrics.buildContribution({ metric1: 1, metric2: 0.5 });

			expect(contribution.addedMetrics).toEqual({ metric1: 1, metric2: 0.5 });
			expect(metrics.getAggregatedMetrics()).toEqual({});
		});

		test('mergeContribution applies a built contribution to the aggregator', () => {
			const metrics = new EvaluationMetrics();

			const contribution = EvaluationMetrics.buildContribution({ metric1: 0.5, metric2: 1 });
			metrics.mergeContribution(contribution);

			expect(metrics.getAggregatedMetrics()).toEqual({ metric1: 0.5, metric2: 1 });
		});

		test('parallel build + reverse-order merge yields the same averages as sequential addResults', () => {
			// `metric2` values are deliberately chosen to produce IEEE-754
			// reduction drift between forward and reverse summation:
			//   forward:  0 + 0.2 + 0.4 + 0.6  = 1.2000000000000002 / 4 = 0.30000000000000004
			//   reverse:  0.6 + 0.4 + 0.2 + 0  = 1.2                  / 4 = 0.3
			// `toBeCloseTo(..., 10)` is the assertion that does the work here:
			// the contract is "averages stable to floating-point precision",
			// not "byte-identical". `metric1` values are exact powers of two
			// and behave the same way regardless of order — the keyset check
			// still validates the structural contract for them.
			const inputs = [
				{ metric1: 1, metric2: 0 },
				{ metric1: 0.5, metric2: 0.2 },
				{ metric1: 0.25, metric2: 0.4 },
				{ metric1: 0.125, metric2: 0.6 },
			];

			// Sequential baseline.
			const sequential = new EvaluationMetrics();
			for (const input of inputs) {
				sequential.addResults(input);
			}

			// Parallel-build (no shared state) + reverse-order merge.
			// `[...contributions].reverse()` keeps the source array intact.
			const parallel = new EvaluationMetrics();
			const contributions = inputs.map((input) => EvaluationMetrics.buildContribution(input));
			for (const contribution of [...contributions].reverse()) {
				parallel.mergeContribution(contribution);
			}

			const sequentialResult = sequential.getAggregatedMetrics();
			const parallelResult = parallel.getAggregatedMetrics();
			expect(Object.keys(parallelResult).sort()).toEqual(Object.keys(sequentialResult).sort());
			for (const key of Object.keys(sequentialResult)) {
				expect(parallelResult[key]).toBeCloseTo(sequentialResult[key], 15);
			}
		});

		test('buildContribution throws on non-numeric values', () => {
			expect(() => EvaluationMetrics.buildContribution({ metric1: 'not a number' })).toThrow(
				'INVALID_METRICS',
			);
		});
	});
});
