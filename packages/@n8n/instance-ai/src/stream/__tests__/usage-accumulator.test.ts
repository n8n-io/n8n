import { UsageAccumulator } from '../usage-accumulator';

describe('UsageAccumulator', () => {
	it('reports no usage and zeroes before any finish chunk', () => {
		const acc = new UsageAccumulator();

		expect(acc.hasUsage()).toBe(false);
		expect(acc.toUsage()).toEqual({
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			costUsd: 0,
		});
	});

	it('captures usage and cost from a finish chunk', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140, cost: 0.02 },
		});

		expect(acc.hasUsage()).toBe(true);
		expect(acc.toUsage()).toEqual({
			promptTokens: 100,
			completionTokens: 40,
			totalTokens: 140,
			costUsd: 0.02,
		});
	});

	it('sums usage across multiple finish chunks (e.g. resumed runs)', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140, cost: 0.02 },
		});
		acc.observe({
			type: 'finish',
			usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60, cost: 0.01 },
		});

		expect(acc.toUsage()).toEqual({
			promptTokens: 150,
			completionTokens: 50,
			totalTokens: 200,
			costUsd: 0.03,
		});
	});

	it('ignores non-finish chunks and finish chunks without usage', () => {
		const acc = new UsageAccumulator();

		acc.observe({ type: 'text-delta', textDelta: 'hi' });
		acc.observe({ type: 'finish', finishReason: 'stop' });
		acc.observe('not even an object');
		acc.observe(undefined);

		expect(acc.hasUsage()).toBe(false);
		expect(acc.toUsage().totalTokens).toBe(0);
	});

	it('treats missing usage fields as zero', () => {
		const acc = new UsageAccumulator();

		acc.observe({ type: 'finish', usage: { totalTokens: 10 } });

		expect(acc.hasUsage()).toBe(true);
		expect(acc.toUsage()).toEqual({
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 10,
			costUsd: 0,
		});
	});
});
