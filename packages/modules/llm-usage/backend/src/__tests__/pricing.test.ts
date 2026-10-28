import { priceUsage } from '../pricing';

describe('priceUsage', () => {
	const tokens = { inputTokens: 1000, outputTokens: 100 };

	it('prices input and output tokens', () => {
		expect(priceUsage(tokens, { input: 0.001, output: 0.002 })).toEqual({
			estimatedCostUsd: 1.2,
			priced: true,
		});
	});

	it('prices cache reads and writes at their own rates', () => {
		const result = priceUsage(
			{ ...tokens, cacheReadTokens: 600, cacheWriteTokens: 100 },
			{ input: 0.001, output: 0.002, cacheRead: 0.0001, cacheWrite: 0.00125 },
		);

		// 300 uncached x 0.001 + 600 x 0.0001 + 100 x 0.00125 + 100 x 0.002
		expect(result.estimatedCostUsd).toBeCloseTo(0.685);
	});

	it('uses the input rate when a cache rate is missing', () => {
		const result = priceUsage(
			{ ...tokens, cacheReadTokens: 600, cacheWriteTokens: 100 },
			{ input: 0.001, output: 0.002 },
		);

		expect(result.estimatedCostUsd).toBeCloseTo(1.2);
	});

	it('is unpriced without an input or output price', () => {
		expect(priceUsage(tokens, { output: 0.002 })).toEqual({
			estimatedCostUsd: null,
			priced: false,
		});
		expect(priceUsage(tokens, undefined)).toEqual({ estimatedCostUsd: null, priced: false });
	});
});
