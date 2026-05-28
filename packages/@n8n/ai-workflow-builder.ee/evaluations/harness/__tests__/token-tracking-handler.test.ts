import type { LLMResult } from '@langchain/core/outputs';

import { TokenUsageTrackingHandler } from '../token-tracking-handler';

describe('TokenUsageTrackingHandler', () => {
	let handler: TokenUsageTrackingHandler;

	beforeEach(() => {
		handler = new TokenUsageTrackingHandler();
	});

	describe('handleLLMEnd', () => {
		it.each([
			{
				format: 'Anthropic (input_tokens/output_tokens)',
				usage: { input_tokens: 100, output_tokens: 50 },
				expected: { inputTokens: 100, outputTokens: 50 },
			},
			{
				format: 'OpenAI (prompt_tokens/completion_tokens)',
				usage: { prompt_tokens: 150, completion_tokens: 75 },
				expected: { inputTokens: 150, outputTokens: 75 },
			},
		])(
			'should accumulate tokens from llmOutput.usage in $format format',
			async ({ usage, expected }) => {
				const result: LLMResult = {
					generations: [[]],
					llmOutput: { usage },
				};

				await handler.handleLLMEnd(result);

				expect(handler.getUsage()).toEqual(expected);
			},
		);

		it('should accumulate tokens from multiple LLM calls', async () => {
			const result1: LLMResult = {
				generations: [[]],
				llmOutput: {
					usage: { input_tokens: 100, output_tokens: 50 },
				},
			};

			const result2: LLMResult = {
				generations: [[]],
				llmOutput: {
					usage: { input_tokens: 200, output_tokens: 100 },
				},
			};

			await handler.handleLLMEnd(result1);
			await handler.handleLLMEnd(result2);

			expect(handler.getUsage()).toEqual({
				inputTokens: 300,
				outputTokens: 150,
			});
		});

		it.each([
			{
				format: 'Anthropic (input_tokens/output_tokens)',
				usage: { input_tokens: 75, output_tokens: 25 },
				expected: { inputTokens: 75, outputTokens: 25 },
			},
			{
				format: 'OpenAI (prompt_tokens/completion_tokens)',
				usage: { prompt_tokens: 80, completion_tokens: 40 },
				expected: { inputTokens: 80, outputTokens: 40 },
			},
		])(
			'should extract tokens from generationInfo in $format format when llmOutput is empty',
			async ({ usage, expected }) => {
				const result: LLMResult = {
					generations: [
						[
							{
								text: 'response',
								generationInfo: { usage },
							},
						],
					],
				};

				await handler.handleLLMEnd(result);

				expect(handler.getUsage()).toEqual(expected);
			},
		);

		it('should handle missing usage data gracefully', async () => {
			const result: LLMResult = {
				generations: [[{ text: 'response' }]],
			};

			await handler.handleLLMEnd(result);

			expect(handler.getUsage()).toEqual({
				inputTokens: 0,
				outputTokens: 0,
			});
		});
	});

	describe('reset', () => {
		it('should reset accumulated usage to zero', async () => {
			const result: LLMResult = {
				generations: [[]],
				llmOutput: {
					usage: {
						input_tokens: 100,
						output_tokens: 50,
					},
				},
			};

			await handler.handleLLMEnd(result);
			expect(handler.getUsage().inputTokens).toBe(100);

			handler.reset();

			expect(handler.getUsage()).toEqual({
				inputTokens: 0,
				outputTokens: 0,
			});
		});
	});

	describe('getUsage', () => {
		it('should return zero for new handler', () => {
			expect(handler.getUsage()).toEqual({
				inputTokens: 0,
				outputTokens: 0,
			});
		});
	});
});
