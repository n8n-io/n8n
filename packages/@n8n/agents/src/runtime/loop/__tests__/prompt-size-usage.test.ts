import type { TokenUsage } from '../../../types';
import { mergePromptSizeUsage, promptSizeOf, withPromptSizeBreakdown } from '../prompt-size-usage';
import { mergeUsage } from '../runtime-helpers';

function callUsage(promptTokens: number, completionTokens = 10): TokenUsage {
	return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}

describe('promptSizeOf', () => {
	it('counts cache reads and writes in the prompt size', () => {
		expect(
			promptSizeOf({
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				inputTokenDetails: { noCache: 5, cacheRead: 90_000, cacheWrite: 20_000 },
			}),
		).toBe(110_005);
	});

	it('uses promptTokens when it is larger than the detail total', () => {
		expect(
			promptSizeOf({
				promptTokens: 120_000,
				completionTokens: 0,
				totalTokens: 120_000,
				inputTokenDetails: { noCache: 10 },
			}),
		).toBe(120_000);
	});
});

describe('withPromptSizeBreakdown', () => {
	it.each([
		{ promptTokens: 1_000, promptTokensOver: 0 },
		{ promptTokens: 100_000, promptTokensOver: 64_000 },
		{ promptTokens: 100_001, promptTokensOver: 100_000 },
		{ promptTokens: 2_000_000, promptTokensOver: 512_000 },
	])(
		'puts a call with a $promptTokens-token prompt in the bucket over $promptTokensOver',
		({ promptTokens, promptTokensOver }) => {
			const usage = withPromptSizeBreakdown(callUsage(promptTokens));

			expect(usage?.byPromptSize).toEqual([
				{
					promptTokensOver,
					maxPromptTokens: promptTokens,
					usage: callUsage(promptTokens),
				},
			]);
		},
	);

	it('leaves cost out of the bucket usage', () => {
		const usage = withPromptSizeBreakdown({ ...callUsage(10), cost: 0.5 });

		expect(usage?.cost).toBe(0.5);
		expect(usage?.byPromptSize?.[0].usage).not.toHaveProperty('cost');
	});

	it('keeps an existing split', () => {
		const split = withPromptSizeBreakdown(callUsage(10));

		expect(withPromptSizeBreakdown(split)).toBe(split);
	});

	it('returns undefined for undefined usage', () => {
		expect(withPromptSizeBreakdown(undefined)).toBeUndefined();
	});
});

describe('mergePromptSizeUsage', () => {
	it('returns undefined when one side has no split', () => {
		const split = withPromptSizeBreakdown(callUsage(10))?.byPromptSize;

		expect(mergePromptSizeUsage(split, undefined)).toBeUndefined();
		expect(mergePromptSizeUsage(undefined, split)).toBeUndefined();
	});
});

describe('mergeUsage — prompt-size split', () => {
	it('sums calls in the same bucket and keeps the largest prompt', () => {
		const merged = mergeUsage(
			withPromptSizeBreakdown(callUsage(40_000, 10)),
			withPromptSizeBreakdown(callUsage(50_000, 20)),
		);

		expect(merged?.byPromptSize).toEqual([
			{
				promptTokensOver: 32_000,
				maxPromptTokens: 50_000,
				usage: { promptTokens: 90_000, completionTokens: 30, totalTokens: 90_030 },
			},
		]);
	});

	it('keeps calls in different buckets apart, in ascending order', () => {
		const merged = mergeUsage(
			withPromptSizeBreakdown(callUsage(150_000)),
			withPromptSizeBreakdown(callUsage(20_000)),
		);

		expect(merged?.byPromptSize?.map((b) => [b.promptTokensOver, b.maxPromptTokens])).toEqual([
			[0, 20_000],
			[128_000, 150_000],
		]);
		expect(merged?.promptTokens).toBe(170_000);
	});

	it('drops the split when one side has none', () => {
		const merged = mergeUsage(withPromptSizeBreakdown(callUsage(10)), callUsage(20));

		expect(merged?.promptTokens).toBe(30);
		expect(merged?.byPromptSize).toBeUndefined();
	});
});
