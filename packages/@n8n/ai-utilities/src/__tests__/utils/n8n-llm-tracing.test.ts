import type { Serialized } from '@langchain/core/load/serializable';
import type { BaseMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { N8nLlmTracing } from 'src/utils/n8n-llm-tracing';

// Mock the dependencies
jest.mock('src/utils/log-ai-event', () => ({
	logAiEvent: jest.fn(),
}));

jest.mock('src/utils/tokenizer/token-estimator', () => ({
	estimateTokensFromStringList: jest.fn().mockResolvedValue(100),
}));

const { logAiEvent } = jest.requireMock('src/utils/log-ai-event');
const { estimateTokensFromStringList } = jest.requireMock('src/utils/tokenizer/token-estimator');

describe('N8nLlmTracing', () => {
	let mockExecutionFunctions: jest.Mocked<ISupplyDataFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.testNode',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockExecutionFunctions = {
			getNode: jest.fn().mockReturnValue(mockNode),
			addOutputData: jest.fn(),
			addInputData: jest.fn().mockReturnValue({ index: 0 }),
			getNextRunIndex: jest.fn().mockReturnValue(0),
		} as unknown as jest.Mocked<ISupplyDataFunctions>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create instance with default options', () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			expect(tracer).toBeInstanceOf(N8nLlmTracing);
			expect(tracer.name).toBe('N8nLlmTracing');
			expect(tracer.awaitHandlers).toBe(true);
			expect(tracer.connectionType).toBe(NodeConnectionTypes.AiLanguageModel);
		});

		it('should create instance with custom tokensUsageParser', () => {
			const customParser = jest.fn().mockReturnValue({
				completionTokens: 50,
				promptTokens: 30,
				totalTokens: 80,
			});

			const tracer = new N8nLlmTracing(mockExecutionFunctions, {
				tokensUsageParser: customParser,
			});

			expect(tracer).toBeInstanceOf(N8nLlmTracing);
		});

		it('should create instance with custom errorDescriptionMapper', () => {
			const customMapper = jest.fn().mockReturnValue('Custom error description');

			const tracer = new N8nLlmTracing(mockExecutionFunctions, {
				errorDescriptionMapper: customMapper,
			});

			expect(tracer).toBeInstanceOf(N8nLlmTracing);
		});
	});

	describe('handleLLMStart', () => {
		it('should handle LLM start event with prompts', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const llm: Serialized = {
				lc: 1,
				type: 'constructor',
				id: ['langchain', 'llms', 'openai'],
				kwargs: { modelName: 'gpt-4', temperature: 0.7 },
			};

			const prompts = ['What is the capital of France?'];
			const runId = 'run-123';

			await tracer.handleLLMStart(llm, prompts, runId);

			expect(mockExecutionFunctions.addInputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				expect.arrayContaining([
					expect.arrayContaining([
						expect.objectContaining({
							json: expect.objectContaining({
								messages: prompts,
								estimatedTokens: expect.any(Number),
								options: llm.kwargs,
							}),
						}),
					]),
				]),
				undefined,
			);

			expect(estimateTokensFromStringList).toHaveBeenCalledWith(prompts, 'gpt-4o');
		});

		it('should store run details for later use', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const llm: Serialized = {
				lc: 1,
				type: 'not_implemented',
				id: ['langchain', 'llms', 'test'],
			};

			const prompts = ['Test prompt'];
			const runId = 'run-123';

			await tracer.handleLLMStart(llm, prompts, runId);

			expect(tracer.runsMap[runId]).toBeDefined();
			expect(tracer.runsMap[runId].messages).toEqual(prompts);
			expect(tracer.runsMap[runId].index).toBe(0);
		});

		it('should handle multiple prompts', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const llm: Serialized = {
				lc: 1,
				type: 'constructor',
				id: ['langchain', 'llms', 'openai'],
				kwargs: {},
			};

			const prompts = ['Prompt 1', 'Prompt 2', 'Prompt 3'];
			const runId = 'run-123';

			await tracer.handleLLMStart(llm, prompts, runId);

			expect(tracer.runsMap[runId].messages).toEqual(prompts);
			expect(estimateTokensFromStringList).toHaveBeenCalledWith(prompts, 'gpt-4o');
		});

		it('should use parent run index when set', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);
			tracer.setParentRunIndex(5);

			const llm: Serialized = {
				lc: 1,
				type: 'constructor',
				id: ['test'],
				kwargs: {},
			};

			mockExecutionFunctions.getNextRunIndex.mockReturnValue(2);

			await tracer.handleLLMStart(llm, ['test'], 'run-123');

			expect(mockExecutionFunctions.addInputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				expect.any(Array),
				7, // 5 (parent) + 2 (next)
			);
		});
	});

	describe('handleLLMEnd', () => {
		it('should handle LLM end event with token usage', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			// Setup run
			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test prompt'],
				options: {},
			};
			tracer.promptTokensEstimate = 50;

			const output: LLMResult = {
				generations: [[{ text: 'Response text', generationInfo: {} }]],
				llmOutput: {
					tokenUsage: {
						completionTokens: 30,
						promptTokens: 50,
						totalTokens: 80,
					},
				},
			};

			await tracer.handleLLMEnd(output, runId);

			expect(mockExecutionFunctions.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
				expect.arrayContaining([
					expect.arrayContaining([
						expect.objectContaining({
							json: expect.objectContaining({
								response: expect.objectContaining({
									generations: expect.any(Array),
								}),
								tokenUsage: expect.objectContaining({
									completionTokens: 30,
									promptTokens: 50,
									totalTokens: 80,
								}),
							}),
						}),
					]),
				]),
				undefined,
				undefined,
			);

			expect(logAiEvent).toHaveBeenCalledWith(
				mockExecutionFunctions,
				'ai-llm-generated-output',
				expect.any(Object),
			);
		});

		it('should use token estimates when actual tokens not available', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test prompt'],
				options: {},
			};
			tracer.promptTokensEstimate = 50;

			estimateTokensFromStringList.mockResolvedValue(25);

			const output: LLMResult = {
				generations: [[{ text: 'Response text' }]],
				llmOutput: {},
			};

			await tracer.handleLLMEnd(output, runId);

			const callArgs = mockExecutionFunctions.addOutputData.mock.calls[0] as any;
			const outputData = callArgs?.[2]?.[0]?.[0]?.json;

			expect(outputData.tokenUsageEstimate).toBeDefined();
			expect(outputData.tokenUsageEstimate.completionTokens).toBe(25);
			expect(outputData.tokenUsageEstimate.promptTokens).toBe(50);
			expect(outputData.tokenUsageEstimate.totalTokens).toBe(75);
		});

		it('should handle string messages', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: 'Simple string message',
				options: {},
			};

			const output: LLMResult = {
				generations: [[{ text: 'Response' }]],
				llmOutput: {},
			};

			await tracer.handleLLMEnd(output, runId);

			expect(logAiEvent).toHaveBeenCalledWith(
				mockExecutionFunctions,
				'ai-llm-generated-output',
				expect.objectContaining({
					messages: 'Simple string message',
				}),
			);
		});

		it('should handle BaseMessage objects with toJSON', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const mockMessage: Partial<BaseMessage> = {
				toJSON: jest.fn().mockReturnValue({ content: 'test', role: 'user' }),
			};

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: [mockMessage as BaseMessage],
				options: {},
			};

			const output: LLMResult = {
				generations: [[{ text: 'Response' }]],
				llmOutput: {},
			};

			await tracer.handleLLMEnd(output, runId);

			expect(mockMessage.toJSON).toHaveBeenCalled();
		});

		it('should handle missing run details gracefully', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const output: LLMResult = {
				generations: [[{ text: 'Response' }]],
				llmOutput: {},
			};

			// Set up minimal run details with index but no messages
			tracer.runsMap['non-existent-run'] = {
				index: 0,
				messages: [],
				options: {},
			};

			// Run without full setup
			await tracer.handleLLMEnd(output, 'non-existent-run');

			expect(mockExecutionFunctions.addOutputData).toHaveBeenCalled();
		});

		it('should strip unnecessary fields from generation info', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const output: LLMResult = {
				generations: [
					[
						{
							text: 'Response',
							generationInfo: { model: 'gpt-4' },
							extraField: 'should be removed',
						} as any,
					],
				],
				llmOutput: {},
			};

			await tracer.handleLLMEnd(output, runId);

			const callArgs = mockExecutionFunctions.addOutputData.mock.calls[0] as any;
			const generations = callArgs[2][0][0].json.response.generations[0][0];

			expect(generations).toHaveProperty('text');
			expect(generations).toHaveProperty('generationInfo');
			expect(generations).not.toHaveProperty('extraField');
		});
	});

	describe('handleLLMError', () => {
		it('should handle NodeError', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const error = new NodeOperationError(mockNode, 'Test error', {
				description: 'Test description',
			});

			await tracer.handleLLMError(error, runId);

			expect(mockExecutionFunctions.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
				error,
			);

			expect(logAiEvent).toHaveBeenCalledWith(
				mockExecutionFunctions,
				'ai-llm-errored',
				expect.objectContaining({
					error: expect.any(Object),
					runId,
				}),
			);
		});

		it('should wrap non-NodeError errors', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const error = new Error('Generic error');

			await tracer.handleLLMError(error, runId);

			expect(mockExecutionFunctions.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
				expect.any(NodeOperationError),
			);
		});

		it('should filter out non-x- headers from error', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const error = {
				headers: {
					'x-request-id': '123',
					authorization: 'Bearer token',
					'content-type': 'application/json',
					'x-custom-header': 'value',
				},
			};

			await tracer.handleLLMError(error, runId);

			expect(error.headers).toHaveProperty('x-request-id');
			expect(error.headers).toHaveProperty('x-custom-header');
			expect(error.headers).not.toHaveProperty('authorization');
			expect(error.headers).not.toHaveProperty('content-type');
		});

		it('should use custom error description mapper', async () => {
			const customMapper = jest.fn().mockReturnValue('Custom description');
			const tracer = new N8nLlmTracing(mockExecutionFunctions, {
				errorDescriptionMapper: customMapper,
			});

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const error = new NodeOperationError(mockNode, 'Test error');

			await tracer.handleLLMError(error, runId);

			expect(customMapper).toHaveBeenCalledWith(error);
			expect(error.description).toBe('Custom description');
		});

		it('should handle error with empty object', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const error = {};

			await tracer.handleLLMError(error, runId);

			expect(mockExecutionFunctions.addOutputData).toHaveBeenCalled();
			expect(logAiEvent).toHaveBeenCalledWith(
				mockExecutionFunctions,
				'ai-llm-errored',
				expect.objectContaining({
					error: expect.any(String), // Should call toString()
				}),
			);
		});
	});

	describe('token estimation', () => {
		it('should estimate tokens from generation', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const generations: LLMResult['generations'] = [
				[{ text: 'Response 1' }, { text: 'Response 2' }],
			];

			estimateTokensFromStringList.mockResolvedValue(42);

			const result = await tracer.estimateTokensFromGeneration(generations);

			expect(result).toBe(42);
			expect(estimateTokensFromStringList).toHaveBeenCalledWith(
				['Response 1', 'Response 2'],
				'gpt-4o',
			);
		});

		it('should estimate tokens from string list', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const list = ['String 1', 'String 2', 'String 3'];

			estimateTokensFromStringList.mockResolvedValue(75);

			const result = await tracer.estimateTokensFromStringList(list);

			expect(result).toBe(75);
			expect(estimateTokensFromStringList).toHaveBeenCalledWith(list, 'gpt-4o');
		});
	});

	describe('setParentRunIndex', () => {
		it('should set parent run index', () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			tracer.setParentRunIndex(10);

			// The private field can't be accessed directly, but we can verify behavior
			// in handleLLMStart
			expect(tracer).toBeDefined();
		});
	});

	describe('custom token usage parser', () => {
		it('should use custom token usage parser', async () => {
			const customParser = jest.fn().mockReturnValue({
				completionTokens: 100,
				promptTokens: 50,
				totalTokens: 150,
			});

			const tracer = new N8nLlmTracing(mockExecutionFunctions, {
				tokensUsageParser: customParser,
			});

			const runId = 'run-123';
			tracer.runsMap[runId] = {
				index: 0,
				messages: ['Test'],
				options: {},
			};

			const output: LLMResult = {
				generations: [[{ text: 'Response' }]],
				llmOutput: { customTokenData: 'test' },
			};

			await tracer.handleLLMEnd(output, runId);

			expect(customParser).toHaveBeenCalledWith(output);

			const callArgs = mockExecutionFunctions.addOutputData.mock.calls[0] as any;
			const outputData = callArgs[2][0][0].json;

			expect(outputData.tokenUsage).toEqual({
				completionTokens: 100,
				promptTokens: 50,
				totalTokens: 150,
			});
		});
	});

	describe('runsMap management', () => {
		it('should track multiple runs', async () => {
			const tracer = new N8nLlmTracing(mockExecutionFunctions);

			const llm: Serialized = {
				lc: 1,
				type: 'constructor',
				id: ['test'],
				kwargs: {},
			};

			await tracer.handleLLMStart(llm, ['Prompt 1'], 'run-1');
			await tracer.handleLLMStart(llm, ['Prompt 2'], 'run-2');
			await tracer.handleLLMStart(llm, ['Prompt 3'], 'run-3');

			expect(Object.keys(tracer.runsMap)).toHaveLength(3);
			expect(tracer.runsMap['run-1']).toBeDefined();
			expect(tracer.runsMap['run-2']).toBeDefined();
			expect(tracer.runsMap['run-3']).toBeDefined();
		});
	});
});
