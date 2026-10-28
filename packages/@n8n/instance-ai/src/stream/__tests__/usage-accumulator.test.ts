import { tokenUsageToBuilderUsageItems, UsageAccumulator } from '../usage-accumulator';

describe('UsageAccumulator', () => {
	it('reports no usage and zeroes before any finish chunk', () => {
		const acc = new UsageAccumulator();

		expect(acc.hasUsage()).toBe(false);
		expect(acc.toUsage()).toEqual({
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			costUsd: 0,
			usage: [],
		});
	});

	it('captures flat aggregates and a per-model billing item from a finish chunk', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			model: 'anthropic/claude-sonnet-4',
			usage: {
				promptTokens: 16718,
				completionTokens: 40,
				totalTokens: 16758,
				cost: 0.02,
				inputTokenDetails: { noCache: 1, cacheRead: 15252, cacheWrite: 15465 },
			},
		});

		expect(acc.hasUsage()).toBe(true);
		expect(acc.toUsage()).toEqual({
			promptTokens: 16718,
			completionTokens: 40,
			totalTokens: 16758,
			costUsd: 0.02,
			usage: [
				{
					type: 'llmTokens',
					model: 'anthropic/claude-sonnet-4',
					uncachedInput: 1,
					cacheRead: 15252,
					cacheWrite: 15465,
					output: 40,
				},
			],
		});
	});

	it('sources uncachedInput from noCache, not from promptTokens', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			model: 'anthropic/claude-sonnet-4',
			usage: {
				promptTokens: 16718, // inclusive of cache
				completionTokens: 0,
				totalTokens: 16718,
				inputTokenDetails: { noCache: 1, cacheRead: 15252, cacheWrite: 15465 },
			},
		});

		const usage = acc.toUsage().usage ?? [];
		expect(usage[0].uncachedInput).toBe(1);
	});

	it('falls back to promptTokens when inputTokenDetails are missing', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			model: 'openai/gpt-4o',
			usage: {
				promptTokens: 100,
				completionTokens: 20,
				totalTokens: 120,
			},
		});

		expect(acc.toUsage().usage).toEqual([
			{
				type: 'llmTokens',
				model: 'openai/gpt-4o',
				uncachedInput: 100,
				cacheRead: 0,
				cacheWrite: 0,
				output: 20,
			},
		]);
	});

	it('falls back to promptTokens when inputTokenDetails contain no usable counts', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			model: 'openai/gpt-4o',
			usage: {
				promptTokens: 100,
				completionTokens: 20,
				totalTokens: 120,
				inputTokenDetails: { noCache: 0, cacheRead: 0, cacheWrite: 0 },
			},
		});

		const usage = acc.toUsage().usage ?? [];
		expect(usage[0].uncachedInput).toBe(100);
	});

	it('accumulates per model, keeping separate items for different models', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			model: 'anthropic/claude-sonnet-4',
			usage: {
				promptTokens: 100,
				completionTokens: 10,
				totalTokens: 110,
				inputTokenDetails: { noCache: 100 },
			},
		});
		acc.observe({
			type: 'finish',
			model: 'anthropic/claude-3-5-haiku',
			usage: {
				promptTokens: 50,
				completionTokens: 5,
				totalTokens: 55,
				inputTokenDetails: { noCache: 50 },
			},
		});

		const usage = acc.toUsage().usage;
		expect(usage).toHaveLength(2);
		expect(usage).toContainEqual({
			type: 'llmTokens',
			model: 'anthropic/claude-sonnet-4',
			uncachedInput: 100,
			cacheRead: 0,
			cacheWrite: 0,
			output: 10,
		});
		expect(usage).toContainEqual({
			type: 'llmTokens',
			model: 'anthropic/claude-3-5-haiku',
			uncachedInput: 50,
			cacheRead: 0,
			cacheWrite: 0,
			output: 5,
		});
	});

	it('sums repeated finish chunks for the same model into one item (resumed runs)', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			model: 'anthropic/claude-sonnet-4',
			usage: {
				promptTokens: 100,
				completionTokens: 40,
				totalTokens: 140,
				cost: 0.02,
				inputTokenDetails: { noCache: 80, cacheRead: 20 },
			},
		});
		acc.observe({
			type: 'finish',
			model: 'anthropic/claude-sonnet-4',
			usage: {
				promptTokens: 50,
				completionTokens: 10,
				totalTokens: 60,
				cost: 0.01,
				inputTokenDetails: { noCache: 50 },
			},
		});

		expect(acc.toUsage()).toEqual({
			promptTokens: 150,
			completionTokens: 50,
			totalTokens: 200,
			costUsd: 0.03,
			usage: [
				{
					type: 'llmTokens',
					model: 'anthropic/claude-sonnet-4',
					uncachedInput: 130,
					cacheRead: 20,
					cacheWrite: 0,
					output: 50,
				},
			],
		});
	});

	it('uses the "unknown" model key when the finish chunk omits a model', () => {
		const acc = new UsageAccumulator();

		acc.observe({
			type: 'finish',
			usage: {
				promptTokens: 100,
				completionTokens: 10,
				totalTokens: 110,
				inputTokenDetails: { noCache: 100 },
			},
		});

		expect(acc.toUsage().usage).toEqual([
			{
				type: 'llmTokens',
				model: 'unknown',
				uncachedInput: 100,
				cacheRead: 0,
				cacheWrite: 0,
				output: 10,
			},
		]);
	});

	it('ignores non-finish chunks and finish chunks without usage', () => {
		const acc = new UsageAccumulator();

		acc.observe({ type: 'text-delta', textDelta: 'hi' });
		acc.observe({ type: 'finish', finishReason: 'stop' });
		acc.observe('not even an object');
		acc.observe(undefined);

		expect(acc.hasUsage()).toBe(false);
		expect(acc.toUsage().totalTokens).toBe(0);
		expect(acc.toUsage().usage).toEqual([]);
	});

	it('omits billing items with no billable tokens', () => {
		const acc = new UsageAccumulator();

		// usage present (so hasUsage is true) but no billable token classes
		acc.observe({ type: 'finish', model: 'anthropic/claude-sonnet-4', usage: { totalTokens: 10 } });

		expect(acc.hasUsage()).toBe(true);
		expect(acc.toUsage().usage).toEqual([]);
	});

	describe('prompt-size split', () => {
		const haiku = 'anthropic/claude-haiku-5-5';

		function bucket(
			promptTokensOver: number,
			maxPromptTokens: number,
			noCache: number,
			output: number,
		) {
			return {
				promptTokensOver,
				maxPromptTokens,
				usage: {
					promptTokens: noCache,
					completionTokens: output,
					totalTokens: noCache + output,
					inputTokenDetails: { noCache },
				},
			};
		}

		it('emits one billing item per prompt-size bucket with its largest prompt', () => {
			const acc = new UsageAccumulator();

			acc.observe({
				type: 'finish',
				model: haiku,
				usage: {
					promptTokens: 190_000,
					completionTokens: 12,
					totalTokens: 190_012,
					inputTokenDetails: { noCache: 190_000 },
					byPromptSize: [bucket(32_000, 40_000, 40_000, 5), bucket(128_000, 150_000, 150_000, 7)],
				},
			});

			expect(acc.toUsage().usage).toEqual([
				{
					type: 'llmTokens',
					model: haiku,
					uncachedInput: 40_000,
					cacheRead: 0,
					cacheWrite: 0,
					output: 5,
					maxPromptTokens: 40_000,
				},
				{
					type: 'llmTokens',
					model: haiku,
					uncachedInput: 150_000,
					cacheRead: 0,
					cacheWrite: 0,
					output: 7,
					maxPromptTokens: 150_000,
				},
			]);
		});

		it('sums a bucket across segments and keeps the largest prompt', () => {
			const acc = new UsageAccumulator();

			for (const maxPromptTokens of [50_000, 45_000]) {
				acc.observe({
					type: 'finish',
					model: haiku,
					usage: {
						promptTokens: maxPromptTokens,
						completionTokens: 1,
						totalTokens: maxPromptTokens + 1,
						byPromptSize: [bucket(32_000, maxPromptTokens, maxPromptTokens, 1)],
					},
				});
			}

			expect(acc.toUsage().usage).toEqual([
				expect.objectContaining({ uncachedInput: 95_000, output: 2, maxPromptTokens: 50_000 }),
			]);
		});

		it('keeps usage without a split in its own item without maxPromptTokens', () => {
			const acc = new UsageAccumulator();

			acc.observe({
				type: 'finish',
				model: haiku,
				usage: {
					promptTokens: 1_000,
					completionTokens: 1,
					totalTokens: 1_001,
					byPromptSize: [bucket(0, 1_000, 1_000, 1)],
				},
			});
			acc.observe({
				type: 'finish',
				model: haiku,
				usage: { promptTokens: 2_000, completionTokens: 2, totalTokens: 2_002 },
			});

			const usage = acc.toUsage().usage ?? [];
			expect(usage).toHaveLength(2);
			expect(usage[0]).toMatchObject({ uncachedInput: 1_000, maxPromptTokens: 1_000 });
			expect(usage[1]).toMatchObject({ uncachedInput: 2_000 });
			expect(usage[1]).not.toHaveProperty('maxPromptTokens');
		});

		it('reports the prompt size of a single call from tokenUsageToBuilderUsageItems', () => {
			expect(
				tokenUsageToBuilderUsageItems(haiku, {
					promptTokens: 120_000,
					completionTokens: 30,
					totalTokens: 120_030,
					inputTokenDetails: { noCache: 20_000, cacheRead: 100_000 },
				}),
			).toEqual([
				{
					type: 'llmTokens',
					model: haiku,
					uncachedInput: 20_000,
					cacheRead: 100_000,
					cacheWrite: 0,
					output: 30,
					maxPromptTokens: 120_000,
				},
			]);
		});
	});
});
