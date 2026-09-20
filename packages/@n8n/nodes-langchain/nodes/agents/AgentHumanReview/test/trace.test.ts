import type { LLMResult } from '@langchain/core/outputs';

import { computeCost, extractTokenUsage, resolvePricing } from '../helpers/trace';

describe('trace helpers', () => {
	describe('resolvePricing', () => {
		it('should match the longest builtin prefix', () => {
			expect(resolvePricing('claude-sonnet-4-6')?.rates.input).toBe(3);
			expect(resolvePricing('gpt-4.1-mini-2025-04-14')?.rates.output).toBe(1.6);
			// `gpt-4.1` must not swallow `gpt-4.1-nano`
			expect(resolvePricing('gpt-4.1-nano')?.rates.input).toBe(0.1);
		});

		it('should prefer an override over the builtin table', () => {
			const resolved = resolvePricing('claude-sonnet-4-6', {
				'claude-sonnet-4': { input: 1, output: 2 },
			});
			expect(resolved).toEqual({ rates: { input: 1, output: 2 }, source: 'override' });
		});

		it('should return undefined for an unknown model', () => {
			expect(resolvePricing('my-local-llm')).toBeUndefined();
		});
	});

	describe('computeCost', () => {
		it('should price every token class and round to cents-of-a-cent', () => {
			const cost = computeCost(
				{ input: 1_000_000, output: 100_000, cacheRead: 500_000, cacheWrite: 0, total: 0 },
				{ input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
			);
			expect(cost).toEqual({ input: 3, output: 1.5, cache: 0.15, total: 4.65, currency: 'USD' });
		});

		it('should fall back to the input rate for cache tokens without a cache rate', () => {
			const cost = computeCost(
				{ input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0, total: 0 },
				{ input: 2, output: 8 },
			);
			expect(cost.cache).toBe(2);
		});
	});

	describe('extractTokenUsage', () => {
		it('should read LangChain usage_metadata with cache details', () => {
			const result = {
				generations: [
					[
						{
							text: '',
							message: {
								usage_metadata: {
									input_tokens: 100,
									output_tokens: 20,
									input_token_details: { cache_read: 60, cache_creation: 10 },
								},
							},
						},
					],
				],
			} as unknown as LLMResult;
			expect(extractTokenUsage(result)).toEqual({
				input: 100,
				output: 20,
				cacheRead: 60,
				cacheWrite: 10,
				total: 190,
			});
		});

		it('should read Anthropic-style llmOutput.usage', () => {
			const result = {
				generations: [[{ text: '' }]],
				llmOutput: { usage: { input_tokens: 5, output_tokens: 7 } },
			} as unknown as LLMResult;
			expect(extractTokenUsage(result)).toMatchObject({ input: 5, output: 7, total: 12 });
		});

		it('should read OpenAI-style llmOutput.tokenUsage', () => {
			const result = {
				generations: [[{ text: '' }]],
				llmOutput: { tokenUsage: { promptTokens: 9, completionTokens: 1 } },
			} as unknown as LLMResult;
			expect(extractTokenUsage(result)).toMatchObject({ input: 9, output: 1 });
		});

		it('should return zeros when nothing is reported', () => {
			expect(extractTokenUsage({ generations: [[{ text: '' }]] } as unknown as LLMResult)).toEqual({
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				total: 0,
			});
		});
	});
});
