import type { LLMResult } from '@langchain/core/outputs';

import { AgentTokenTracker } from '../AgentTokenTracker';

describe('AgentTokenTracker', () => {
	let tracker: AgentTokenTracker;

	beforeEach(() => {
		tracker = new AgentTokenTracker();
	});

	describe('handleLLMEnd', () => {
		it('should capture token usage from LLM output', async () => {
			const mockOutput: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						promptTokens: 10,
						completionTokens: 20,
						totalTokens: 30,
					},
				},
			};

			await tracker.handleLLMEnd(mockOutput);

			const tokens = tracker.getAccumulatedTokens();
			expect(tokens).toEqual({
				promptTokens: 10,
				completionTokens: 20,
				totalTokens: 30,
				isEstimate: false,
			});
		});

		it('should calculate totalTokens if not provided', async () => {
			const mockOutput: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						promptTokens: 15,
						completionTokens: 25,
					},
				},
			};

			await tracker.handleLLMEnd(mockOutput);

			const tokens = tracker.getAccumulatedTokens();
			expect(tokens.totalTokens).toBe(40);
		});

		it('should accumulate tokens across multiple LLM calls', async () => {
			const mockOutput1: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						promptTokens: 10,
						completionTokens: 20,
						totalTokens: 30,
					},
				},
			};

			const mockOutput2: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						promptTokens: 5,
						completionTokens: 15,
						totalTokens: 20,
					},
				},
			};

			await tracker.handleLLMEnd(mockOutput1);
			await tracker.handleLLMEnd(mockOutput2);

			const tokens = tracker.getAccumulatedTokens();
			expect(tokens).toEqual({
				promptTokens: 15,
				completionTokens: 35,
				totalTokens: 50,
				isEstimate: false,
			});
		});

		it('should ignore LLM calls without token usage', async () => {
			const mockOutputWithoutTokens: LLMResult = {
				generations: [],
				llmOutput: {},
			};

			await tracker.handleLLMEnd(mockOutputWithoutTokens);

			const tokens = tracker.getAccumulatedTokens();
			expect(tokens).toEqual({
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate: false,
			});
		});

		it('should ignore incomplete token usage data', async () => {
			const mockOutputIncomplete: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						promptTokens: 10,
						// Missing completionTokens
					},
				},
			};

			await tracker.handleLLMEnd(mockOutputIncomplete);

			const tokens = tracker.getAccumulatedTokens();
			expect(tokens).toEqual({
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate: false,
			});
		});
	});

	describe('getAccumulatedTokens', () => {
		it('should return zero tokens when no LLM calls have been made', () => {
			const tokens = tracker.getAccumulatedTokens();
			expect(tokens).toEqual({
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate: false,
			});
		});
	});

	describe('reset', () => {
		it('should clear all accumulated tokens', async () => {
			const mockOutput: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						promptTokens: 10,
						completionTokens: 20,
						totalTokens: 30,
					},
				},
			};

			await tracker.handleLLMEnd(mockOutput);
			tracker.reset();

			const tokens = tracker.getAccumulatedTokens();
			expect(tokens).toEqual({
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate: false,
			});
		});
	});
});
