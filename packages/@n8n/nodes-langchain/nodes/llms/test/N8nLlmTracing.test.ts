/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { mock } from 'jest-mock-extended';
import type { IDataObject, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError, NodeApiError } from 'n8n-workflow';

import { N8nLlmTracing } from '../N8nLlmTracing';

describe('N8nLlmTracing', () => {
	const executionFunctions = mock<ISupplyDataFunctions>({
		addInputData: jest.fn().mockReturnValue({ index: 0 }),
		addOutputData: jest.fn(),
		getNode: jest.fn().mockReturnValue({ name: 'TestNode' }),
		getNextRunIndex: jest.fn().mockReturnValue(1),
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('tokensUsageParser', () => {
		it('should parse OpenAI format tokens correctly', () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const llmResult: LLMResult = {
				generations: [],
				llmOutput: {
					tokenUsage: {
						completionTokens: 100,
						promptTokens: 50,
					},
				},
			};

			const result = tracer.options.tokensUsageParser(llmResult);

			expect(result).toEqual({
				completionTokens: 100,
				promptTokens: 50,
				totalTokens: 150,
			});
		});

		it('should handle missing token data', () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const llmResult: LLMResult = {
				generations: [],
			};

			const result = tracer.options.tokensUsageParser(llmResult);

			expect(result).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('should handle undefined llmOutput', () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const llmResult: LLMResult = {
				generations: [],
				llmOutput: undefined,
			};

			const result = tracer.options.tokensUsageParser(llmResult);

			expect(result).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('should use custom tokensUsageParser when provided', () => {
			// Custom parser for Cohere format
			const customParser = (result: LLMResult) => {
				let totalInputTokens = 0;
				let totalOutputTokens = 0;

				result.generations?.forEach((generationArray) => {
					generationArray.forEach((gen) => {
						const inputTokens = gen.generationInfo?.meta?.tokens?.inputTokens ?? 0;
						const outputTokens = gen.generationInfo?.meta?.tokens?.outputTokens ?? 0;

						totalInputTokens += inputTokens;
						totalOutputTokens += outputTokens;
					});
				});

				return {
					completionTokens: totalOutputTokens,
					promptTokens: totalInputTokens,
					totalTokens: totalInputTokens + totalOutputTokens,
				};
			};

			const tracer = new N8nLlmTracing(executionFunctions, {
				tokensUsageParser: customParser,
			});

			const llmResult: LLMResult = {
				generations: [
					[
						{
							text: 'Response 1',
							generationInfo: {
								meta: {
									tokens: {
										inputTokens: 30,
										outputTokens: 40,
									},
								},
							},
						},
					],
					[
						{
							text: 'Response 2',
							generationInfo: {
								meta: {
									tokens: {
										inputTokens: 20,
										outputTokens: 60,
									},
								},
							},
						},
					],
				],
			};

			const result = tracer.options.tokensUsageParser(llmResult);

			expect(result).toEqual({
				completionTokens: 100, // 40 + 60
				promptTokens: 50, // 30 + 20
				totalTokens: 150,
			});
		});

		it('should handle Anthropic format with custom parser', () => {
			const anthropicParser = (result: LLMResult) => {
				const usage = (result?.llmOutput?.usage as {
					input_tokens: number;
					output_tokens: number;
				}) ?? {
					input_tokens: 0,
					output_tokens: 0,
				};
				return {
					completionTokens: usage.output_tokens,
					promptTokens: usage.input_tokens,
					totalTokens: usage.input_tokens + usage.output_tokens,
				};
			};

			const tracer = new N8nLlmTracing(executionFunctions, {
				tokensUsageParser: anthropicParser,
			});

			const llmResult: LLMResult = {
				generations: [],
				llmOutput: {
					usage: {
						input_tokens: 75,
						output_tokens: 125,
					},
				},
			};

			const result = tracer.options.tokensUsageParser(llmResult);

			expect(result).toEqual({
				completionTokens: 125,
				promptTokens: 75,
				totalTokens: 200,
			});
		});
	});

	describe('handleLLMEnd', () => {
		it('should process LLM output and use token usage when available', async () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const runId = 'test-run-id';

			// Set up run details
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test prompt'],
				options: { model: 'test-model' },
			};

			const output: LLMResult = {
				generations: [
					[
						{
							text: 'Test response',
							generationInfo: { meta: {} },
						},
					],
				],
				llmOutput: {
					tokenUsage: {
						completionTokens: 50,
						promptTokens: 25,
					},
				},
			};

			await tracer.handleLLMEnd(output, runId);

			expect(executionFunctions.addOutputData).toHaveBeenCalledWith(
				'ai_languageModel',
				0,
				[
					[
						{
							json: expect.objectContaining({
								response: { generations: output.generations },
								tokenUsage: {
									completionTokens: 50,
									promptTokens: 25,
									totalTokens: 75,
								},
							}),
						},
					],
				],
				undefined,
				undefined,
			);
		});

		it('should use token estimates when actual usage is not available', async () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const runId = 'test-run-id';

			// Set up run details and prompt estimate
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test prompt'],
				options: { model: 'test-model' },
			};
			tracer.promptTokensEstimate = 30;

			const output: LLMResult = {
				generations: [
					[
						{
							text: 'Test response',
							generationInfo: { meta: {} },
						},
					],
				],
				llmOutput: {},
			};

			jest.spyOn(tracer, 'estimateTokensFromGeneration').mockResolvedValue(45);

			await tracer.handleLLMEnd(output, runId);

			expect(executionFunctions.addOutputData).toHaveBeenCalledWith(
				'ai_languageModel',
				0,
				[
					[
						{
							json: expect.objectContaining({
								response: { generations: output.generations },
								tokenUsageEstimate: {
									completionTokens: 45,
									promptTokens: 30,
									totalTokens: 75,
								},
							}),
						},
					],
				],
				undefined,
				undefined,
			);
		});
	});

	describe('handleLLMError', () => {
		it('should handle NodeError with custom error description mapper', async () => {
			const customMapper = jest.fn().mockReturnValue('Mapped error description');
			const tracer = new N8nLlmTracing(executionFunctions, {
				errorDescriptionMapper: customMapper,
			});

			const runId = 'test-run-id';
			tracer.runsMap[runId] = { index: 0, messages: [], options: {} };

			const error = new NodeApiError(executionFunctions.getNode(), {
				message: 'Test error',
				description: 'Original description',
			});

			await tracer.handleLLMError(error, runId);

			expect(customMapper).toHaveBeenCalledWith(error);
			expect(error.description).toBe('Mapped error description');
			expect(executionFunctions.addOutputData).toHaveBeenCalledWith('ai_languageModel', 0, error);
		});

		it('should wrap non-NodeError in NodeOperationError', async () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const runId = 'test-run-id';
			tracer.runsMap[runId] = { index: 0, messages: [], options: {} };

			const error = new Error('Regular error');

			await tracer.handleLLMError(error, runId);

			expect(executionFunctions.addOutputData).toHaveBeenCalledWith(
				'ai_languageModel',
				0,
				expect.any(NodeOperationError),
			);
		});

		it('should filter out non-x- headers from error objects', async () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const runId = 'test-run-id';
			tracer.runsMap[runId] = { index: 0, messages: [], options: {} };

			const error = {
				message: 'API Error',
				headers: {
					'x-request-id': 'keep-this',
					authorization: 'remove-this',
					'x-rate-limit': 'keep-this-too',
					'content-type': 'remove-this-too',
				},
			};

			await tracer.handleLLMError(error as IDataObject, runId);

			expect(error.headers).toEqual({
				'x-request-id': 'keep-this',
				'x-rate-limit': 'keep-this-too',
			});
		});
	});

	describe('handleLLMStart', () => {
		it('should estimate tokens and create run details', async () => {
			const tracer = new N8nLlmTracing(executionFunctions);
			const runId = 'test-run-id';
			const prompts = ['Prompt 1', 'Prompt 2'];

			jest.spyOn(tracer, 'estimateTokensFromStringList').mockResolvedValue(100);

			const llm = {
				type: 'constructor',
				kwargs: { model: 'test-model' },
			};

			await tracer.handleLLMStart(llm as unknown as Serialized, prompts, runId);

			expect(tracer.estimateTokensFromStringList).toHaveBeenCalledWith(prompts);
			expect(tracer.promptTokensEstimate).toBe(100);
			expect(tracer.runsMap[runId]).toEqual({
				index: 0,
				options: { model: 'test-model' },
				messages: prompts,
			});
			expect(executionFunctions.addInputData).toHaveBeenCalledWith(
				'ai_languageModel',
				[
					[
						{
							json: {
								messages: prompts,
								estimatedTokens: 100,
								options: { model: 'test-model' },
							},
						},
					],
				],
				undefined,
			);
		});
	});
});
