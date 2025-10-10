import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import { AgentExecutor } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import type { ISupplyDataFunctions, IExecuteFunctions, INode } from 'n8n-workflow';

import * as helpers from '../../../../../utils/helpers';
import * as outputParserModule from '../../../../../utils/output_parsers/N8nOutputParser';
import * as commonModule from '../../agents/ToolsAgent/common';
import { toolsAgentExecute, flattenContentToText } from '../../agents/ToolsAgent/V2/execute';

jest.mock('../../../../../utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
	N8nStructuredOutputParser: jest.fn(),
}));

jest.mock('../../agents/ToolsAgent/common', () => ({
	...jest.requireActual('../../agents/ToolsAgent/common'),
	getOptionalMemory: jest.fn(),
}));

const mockHelpers = mock<IExecuteFunctions['helpers']>();
const mockContext = mock<IExecuteFunctions>({ helpers: mockHelpers });

beforeEach(() => {
	jest.clearAllMocks();
	jest.resetAllMocks();
});

describe('toolsAgentExecute', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
	});

	it('should process items sequentially when batchSize is not set', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		// Mock getNodeParameter to return default values
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: { text: 'success 1' } })
				.mockResolvedValueOnce({ output: { text: 'success 2' } }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockExecutor.invoke).toHaveBeenCalledTimes(2);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ output: { text: 'success 1' } });
		expect(result[0][1].json).toEqual({ output: { text: 'success 2' } });
	});

	it('should process items in parallel within batches when batchSize > 1', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
			{ json: { text: 'test input 3' } },
			{ json: { text: 'test input 4' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 100;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: { text: 'success 1' } })
				.mockResolvedValueOnce({ output: { text: 'success 2' } })
				.mockResolvedValueOnce({ output: { text: 'success 3' } })
				.mockResolvedValueOnce({ output: { text: 'success 4' } }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockExecutor.invoke).toHaveBeenCalledTimes(4); // Each item is processed individually
		expect(result[0]).toHaveLength(4);

		expect(result[0][0].json).toEqual({ output: { text: 'success 1' } });
		expect(result[0][1].json).toEqual({ output: { text: 'success 2' } });
		expect(result[0][2].json).toEqual({ output: { text: 'success 3' } });
		expect(result[0][3].json).toEqual({ output: { text: 'success 4' } });
	});

	it('should handle errors in batch processing when continueOnFail is true', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(true);

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: { text: 'success' } })
				.mockRejectedValueOnce(new Error('Test error')),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockContext);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ output: { text: 'success' } });
		expect(result[0][1].json).toEqual({ error: 'Test error' });
	});

	it('should throw error in batch processing when continueOnFail is false', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(false);

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success' }) })
				.mockRejectedValueOnce(new Error('Test error')),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await expect(toolsAgentExecute.call(mockContext)).rejects.toThrow('Test error');
	});

	it('should fetch output parser with correct item index', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
			{ json: { text: 'test input 3' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		const mockParser1 = mock<outputParserModule.N8nStructuredOutputParser>();
		const mockParser2 = mock<outputParserModule.N8nStructuredOutputParser>();
		const mockParser3 = mock<outputParserModule.N8nStructuredOutputParser>();

		const getOptionalOutputParserSpy = jest
			.spyOn(outputParserModule, 'getOptionalOutputParser')
			.mockResolvedValueOnce(mockParser1)
			.mockResolvedValueOnce(mockParser2)
			.mockResolvedValueOnce(mockParser3)
			.mockResolvedValueOnce(undefined); // For the check call

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 3' }) }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await toolsAgentExecute.call(mockContext);

		// Verify getOptionalOutputParser was called with correct indices
		expect(getOptionalOutputParserSpy).toHaveBeenCalledTimes(6);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(1, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(2, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(3, mockContext, 1);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(4, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(5, mockContext, 2);
	});

	it('should pass different output parsers to getTools for each item', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockParser1 = mock<outputParserModule.N8nStructuredOutputParser>();
		const mockParser2 = mock<outputParserModule.N8nStructuredOutputParser>();

		jest
			.spyOn(outputParserModule, 'getOptionalOutputParser')
			.mockResolvedValueOnce(mockParser1)
			.mockResolvedValueOnce(mockParser2);

		const getToolsSpy = jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await toolsAgentExecute.call(mockContext);

		// Verify getTools was called with different parsers
		expect(getToolsSpy).toHaveBeenCalledTimes(2);
		expect(getToolsSpy).toHaveBeenNthCalledWith(1, mockContext, true, false);
		expect(getToolsSpy).toHaveBeenNthCalledWith(2, mockContext, true, false);
	});

	it('should maintain correct parser-item mapping in batch processing', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
			{ json: { text: 'test input 3' } },
			{ json: { text: 'test input 4' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockParsers = [
			mock<outputParserModule.N8nStructuredOutputParser>(),
			mock<outputParserModule.N8nStructuredOutputParser>(),
			mock<outputParserModule.N8nStructuredOutputParser>(),
			mock<outputParserModule.N8nStructuredOutputParser>(),
		];

		const getOptionalOutputParserSpy = jest
			.spyOn(outputParserModule, 'getOptionalOutputParser')
			.mockImplementation(async (_ctx, index) => mockParsers[index || 0]);

		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 3' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 4' }) }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await toolsAgentExecute.call(mockContext);

		// Verify each item got its corresponding parser based on index
		// It's called once per item + once to check if output parser is connected
		expect(getOptionalOutputParserSpy).toHaveBeenCalledTimes(6);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(1, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(2, mockContext, 1);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(3, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(4, mockContext, 2);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(5, mockContext, 3);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(6, mockContext, 0);
	});

	describe('streaming', () => {
		let mockNode: INode;
		let mockModel: BaseChatModel;

		beforeEach(() => {
			jest.clearAllMocks();
			mockNode = mock<INode>();
			mockNode.typeVersion = 2.2;
			mockContext.getNode.mockReturnValue(mockNode);
			mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

			mockModel = mock<BaseChatModel>();
			mockModel.bindTools = jest.fn();
			mockModel.lc_namespace = ['chat_models'];
			mockContext.getInputConnectionData.mockImplementation(async (type, _index) => {
				if (type === 'ai_languageModel') return mockModel;
				if (type === 'ai_memory') return undefined;
				return undefined;
			});

			mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
				if (param === 'enableStreaming') return true;
				if (param === 'text') return 'test input';
				if (param === 'options.batching.batchSize') return defaultValue;
				if (param === 'options.batching.delayBetweenBatches') return defaultValue;
				if (param === 'options')
					return {
						systemMessage: 'You are a helpful assistant',
						maxIterations: 10,
						returnIntermediateSteps: false,
						passthroughBinaryImages: true,
					};
				return defaultValue;
			});
		});

		it('should handle streaming when enableStreaming is true', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);
			mockContext.isStreaming.mockReturnValue(true);

			// Mock async generator for streamEvents
			const mockStreamEvents = async function* () {
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: 'Hello ',
						},
					},
				};
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: 'world!',
						},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'Hello ');
			expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'world!');
			expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(mockExecutor.streamEvents).toHaveBeenCalledTimes(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.output).toBe('Hello world!');
		});

		it('should capture intermediate steps during streaming when returnIntermediateSteps is true', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);

			mockContext.isStreaming.mockReturnValue(true);

			mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
				if (param === 'enableStreaming') return true;
				if (param === 'text') return 'test input';
				if (param === 'options.batching.batchSize') return defaultValue;
				if (param === 'options.batching.delayBetweenBatches') return defaultValue;
				if (param === 'options')
					return {
						systemMessage: 'You are a helpful assistant',
						maxIterations: 10,
						returnIntermediateSteps: true, // Enable intermediate steps
						passthroughBinaryImages: true,
					};
				return defaultValue;
			});

			// Mock async generator for streamEvents with tool calls
			const mockStreamEvents = async function* () {
				// LLM response with tool call
				yield {
					event: 'on_chat_model_end',
					data: {
						output: {
							content: 'I need to call a tool',
							tool_calls: [
								{
									id: 'call_123',
									name: 'TestTool',
									args: { input: 'test data' },
									type: 'function',
								},
							],
						},
					},
				};
				// Tool execution result
				yield {
					event: 'on_tool_end',
					name: 'TestTool',
					data: {
						output: 'Tool execution result',
					},
				};
				// Final LLM response
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: 'Final response',
						},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.output).toBe('Final response');

			// Check intermediate steps
			expect(result[0][0].json.intermediateSteps).toBeDefined();
			expect(result[0][0].json.intermediateSteps).toHaveLength(1);

			const step = (result[0][0].json.intermediateSteps as any[])[0];
			expect(step.action).toBeDefined();
			expect(step.action.tool).toBe('TestTool');
			expect(step.action.toolInput).toEqual({ input: 'test data' });
			expect(step.action.toolCallId).toBe('call_123');
			expect(step.action.type).toBe('function');
			expect(step.action.messageLog).toBeDefined();
			expect(step.observation).toBe('Tool execution result');
		});

		it('should use regular execution on version 2.2 when enableStreaming is false', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);

			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'Regular response' }),
				streamEvents: jest.fn(),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).not.toHaveBeenCalled();
			expect(mockExecutor.invoke).toHaveBeenCalledTimes(1);
			expect(mockExecutor.streamEvents).not.toHaveBeenCalled();
			expect(result[0][0].json.output).toBe('Regular response');
		});

		it('should use regular execution on version 2.2 when streaming is not available', async () => {
			mockContext.isStreaming.mockReturnValue(false);

			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);

			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'Regular response' }),
				streamEvents: jest.fn(),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).not.toHaveBeenCalled();
			expect(mockExecutor.invoke).toHaveBeenCalledTimes(1);
			expect(mockExecutor.streamEvents).not.toHaveBeenCalled();
			expect(result[0][0].json.output).toBe('Regular response');
		});

		it('should respect context window length from memory in streaming mode', async () => {
			const mockMemory = {
				loadMemoryVariables: jest.fn().mockResolvedValue({
					chat_history: [
						{ role: 'human', content: 'Message 1' },
						{ role: 'ai', content: 'Response 1' },
					],
				}),
				chatHistory: {
					getMessages: jest.fn().mockResolvedValue([
						{ role: 'human', content: 'Message 1' },
						{ role: 'ai', content: 'Response 1' },
						{ role: 'human', content: 'Message 2' },
						{ role: 'ai', content: 'Response 2' },
					]),
				},
			};

			jest.spyOn(commonModule, 'getOptionalMemory').mockResolvedValue(mockMemory as any);

			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);
			mockContext.isStreaming.mockReturnValue(true);

			const mockStreamEvents = async function* () {
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: 'Response',
						},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			await toolsAgentExecute.call(mockContext);

			// Verify that memory.loadMemoryVariables was called instead of chatHistory.getMessages
			expect(mockMemory.loadMemoryVariables).toHaveBeenCalledWith({});
			expect(mockMemory.chatHistory.getMessages).not.toHaveBeenCalled();

			// Verify that streamEvents was called with the filtered chat history from loadMemoryVariables
			expect(mockExecutor.streamEvents).toHaveBeenCalledWith(
				expect.objectContaining({
					chat_history: [
						{ role: 'human', content: 'Message 1' },
						{ role: 'ai', content: 'Response 1' },
					],
				}),
				expect.any(Object),
			);
		});

		it('should handle mixed message content types in streaming', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);
			mockContext.isStreaming.mockReturnValue(true);

			// Mock async generator for streamEvents with mixed content types
			const mockStreamEvents = async function* () {
				// Message with array content including text and non-text types
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: [
								{ type: 'text', text: 'Hello ' },
								{ type: 'thinking', content: 'This is thinking content' },
								{ type: 'text', text: 'world!' },
								{ type: 'image', url: 'data:image/png;base64,abc123' },
							],
						},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'Hello world!');
			expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.output).toBe('Hello world!');
		});

		it('should handle string content in streaming', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);
			mockContext.isStreaming.mockReturnValue(true);

			// Mock async generator for streamEvents with string content
			const mockStreamEvents = async function* () {
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: 'Direct string content',
						},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'Direct string content');
			expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.output).toBe('Direct string content');
		});

		it('should ignore non-text message types in array content', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);
			mockContext.isStreaming.mockReturnValue(true);

			// Mock async generator with only non-text content
			const mockStreamEvents = async function* () {
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: [
								{ type: 'thinking', content: 'This is thinking content' },
								{ type: 'image', url: 'data:image/png;base64,abc123' },
								{ type: 'audio', data: 'audio-data' },
							],
						},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, '');
			expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.output).toBe('');
		});

		it('should handle empty chunk content gracefully', async () => {
			jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);
			jest.spyOn(outputParserModule, 'getOptionalOutputParser').mockResolvedValue(undefined);
			mockContext.isStreaming.mockReturnValue(true);

			// Mock async generator with empty content
			const mockStreamEvents = async function* () {
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {
							content: null,
						},
					},
				};
				yield {
					event: 'on_chat_model_stream',
					data: {
						chunk: {},
					},
				};
			};

			const mockExecutor = {
				streamEvents: jest.fn().mockReturnValue(mockStreamEvents()),
			};

			jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

			const result = await toolsAgentExecute.call(mockContext);

			expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
			expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.output).toBe('');
		});
	});

	it('should process items if SupplyDataContext is passed and isStreaming is not set', async () => {
		const mockSupplyDataContext = mock<ISupplyDataFunctions>();

		// @ts-expect-error isStreaming is not supported by SupplyDataFunctions, but mock object still resolves it
		mockSupplyDataContext.isStreaming = undefined;

		mockSupplyDataContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		const mockNode = mock<INode>();
		mockNode.typeVersion = 2.2; // version where streaming is supported
		mockSupplyDataContext.getNode.mockReturnValue(mockNode);
		mockSupplyDataContext.getInputData.mockReturnValue([{ json: { text: 'test input 1' } }]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockSupplyDataContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		// Mock getNodeParameter to return default values
		mockSupplyDataContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'enableStreaming') return true;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest.fn().mockResolvedValueOnce({ output: { text: 'success 1' } }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockSupplyDataContext);

		expect(mockExecutor.invoke).toHaveBeenCalledTimes(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toEqual({ output: { text: 'success 1' } });
	});

	describe('flattenContentToText', () => {
		it('should return empty string for undefined or null content', () => {
			expect(flattenContentToText(undefined)).toBe('');
			expect(flattenContentToText(null as any)).toBe('');
		});

		it('should remove <think> tags from string content', () => {
			expect(flattenContentToText('text <think>hidden</think> more')).toBe('text  more'); // note double space
			expect(flattenContentToText('<think>start</think>visible<think>end</think>')).toBe('visible');
		});

		it('should handle string content without think tags', () => {
			expect(flattenContentToText('plain text')).toBe('plain text');
		});

		it('should extract text from array of text blocks', () => {
			const content = [
				{ type: 'text', text: 'hello' },
				{ type: 'text', text: ' world' },
			];
			expect(flattenContentToText(content)).toBe('hello world');
		});

		it('should exclude thinking blocks from output', () => {
			const content = [
				{ type: 'text', text: 'visible' },
				{ type: 'thinking', thinking: [{ type: 'text', text: 'hidden reasoning' }] },
				{ type: 'text', text: ' text' },
			];
			expect(
				flattenContentToText([
					{ type: 'text', text: 'visible' },
					{ type: 'thinking', thinking: [{ type: 'text', text: 'hidden reasoning' }] },
					{ type: 'text', text: ' text' },
				]),
			).toBe('visible text'); // not including thinking
		});

		it('should ignore image_url blocks', () => {
			const content = [
				{ type: 'text', text: 'before' },
				{ type: 'image_url', image_url: { url: 'http://example.com/image.png' } },
				{ type: 'text', text: 'after' },
			];
			expect(flattenContentToText(content)).toBe('beforeafter');
		});

		it('should ignore reference blocks', () => {
			const content = [
				{ type: 'text', text: 'text' },
				{ type: 'reference', reference_ids: ['ref1', 'ref2'] },
			];
			expect(flattenContentToText(content)).toBe('text');
		});

		it('should ignore document_url blocks', () => {
			const content = [{ type: 'text', text: 'content' }, { type: 'document_url' }];
			expect(flattenContentToText(content)).toBe('content');
		});

		it('should handle mixed content types', () => {
			const content = [
				{ type: 'text', text: 'start' },
				{ type: 'thinking', thinking: [{ type: 'text', text: 'internal' }] },
				{ type: 'image_url', image_url: { url: 'http://test.com' } },
				{ type: 'text', text: ' middle' },
				{ type: 'reference', reference_ids: ['123'] },
				{ type: 'text', text: ' end' },
			];
			expect(flattenContentToText(content)).toBe('start middle end');
		});

		it('should handle empty array', () => {
			expect(flattenContentToText([])).toBe('');
		});

		it('should handle array with only non-text blocks', () => {
			const content = [
				{ type: 'thinking', thinking: [{ type: 'text', text: 'hidden' }] },
				{ type: 'image_url', image_url: { url: 'http://test.com' } },
			];
			expect(flattenContentToText(content)).toBe('');
		});

		it('should handle malformed blocks gracefully', () => {
			const content = [
				{ type: 'text', text: 'valid' },
				null as any,
				{ type: 'text' }, // missing text field
				{ type: 'unknown' }, // unknown type
			];
			expect(flattenContentToText(content)).toBe('valid');
		});

		it('should return empty string for unexpected plain object input', () => {
			// @ts-expect-error simulating provider object without content blocks
			expect(flattenContentToText({ foo: 'bar' })).toBe('');
		});

		it('should optionally collapse whitespace when requested (arrays)', () => {
			const content = [
				{ type: 'text', text: 'Line 1\n' },
				{ type: 'text', text: '  Line 2' },
			];
			// default: preserve
			expect(flattenContentToText(content)).toBe('Line 1\n  Line 2');
			// explicit collapse
			expect(flattenContentToText(content, { collapseWhitespace: true })).toBe('Line 1 Line 2');
		});
	});
});
