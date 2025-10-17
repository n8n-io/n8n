import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { mock } from 'jest-mock-extended';
import { createToolCallingAgent } from 'langchain/agents';
import type { BaseChatMemory } from 'langchain/memory';
import type { Tool } from 'langchain/tools';
import { NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	IExecuteFunctions,
	INode,
	EngineRequest,
	EngineResponse,
	INodeExecutionData,
} from 'n8n-workflow';

import * as helpers from '../../../../../utils/helpers';
import * as commonHelpers from '../../agents/ToolsAgent/common';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V3/execute';
import type { RequestResponseMetadata } from '../../agents/ToolsAgent/V3/execute';

jest.mock('../../../../../utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
	N8nStructuredOutputParser: jest.fn(),
}));

jest.mock('langchain/agents', () => ({
	AgentExecutor: {
		fromAgentAndTools: jest.fn(),
	},
	createToolCallingAgent: jest.fn(),
}));

jest.mock('@langchain/core/runnables', () => ({
	RunnableSequence: {
		from: jest.fn(),
	},
}));

const mockHelpers = mock<IExecuteFunctions['helpers']>();
const mockContext = mock<IExecuteFunctions>({ helpers: mockHelpers });

beforeEach(() => {
	jest.clearAllMocks();
	jest.resetAllMocks();
});

describe('toolsAgentExecute V3', () => {
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
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValueOnce({ returnValues: { output: 'success 1' } })
			.mockResolvedValueOnce({ returnValues: { output: 'success 2' } });

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockRunnableSequence.invoke).toHaveBeenCalledTimes(2);
		expect((result as INodeExecutionData[][])[0]).toHaveLength(2);
		expect((result as INodeExecutionData[][])[0][0].json).toEqual({ output: 'success 1' });
		expect((result as INodeExecutionData[][])[0][1].json).toEqual({ output: 'success 2' });
	});

	it('should handle fallback model when needsFallback is true', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		const mockFallbackModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockFallbackAgent = mock<any>();
		mockAgent.withFallbacks = jest.fn().mockReturnValue(mockAgent);

		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValue({ returnValues: { output: 'success with fallback' } });

		(createToolCallingAgent as jest.Mock)
			.mockReturnValueOnce(mockAgent)
			.mockReturnValueOnce(mockFallbackAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest
			.spyOn(commonHelpers, 'getChatModel')
			.mockResolvedValueOnce(mockModel)
			.mockResolvedValueOnce(mockFallbackModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return true;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await toolsAgentExecute.call(mockContext);

		expect(createToolCallingAgent).toHaveBeenCalledTimes(2);
		expect(mockAgent.withFallbacks).toHaveBeenCalledWith([mockFallbackAgent]);
		expect((result as INodeExecutionData[][])[0][0].json).toEqual({
			output: 'success with fallback',
		});
	});

	it('should throw error when fallback is needed but no fallback model is provided', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		jest
			.spyOn(commonHelpers, 'getChatModel')
			.mockResolvedValueOnce(mockModel)
			.mockResolvedValueOnce(undefined);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return true;
			return defaultValue;
		});

		await expect(toolsAgentExecute.call(mockContext)).rejects.toThrow(NodeOperationError);
	});

	it('should handle regular execution path without tool calls', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValue({ returnValues: { output: 'regular response' } });

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockRunnableSequence.invoke).toHaveBeenCalledTimes(1);
		expect((result as INodeExecutionData[][])[0]).toHaveLength(1);
		expect((result as INodeExecutionData[][])[0][0].json).toEqual({ output: 'regular response' });
	});

	it('should handle streaming with tool calls detected', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);
		mockContext.getParentNodes.mockReturnValue([
			{ name: 'TestTool', type: 'Tool', typeVersion: 3, disabled: false },
		]);
		mockContext.isStreaming = jest.fn().mockReturnValue(true) as any;

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;

		// Mock streaming events with tool calls
		const mockStreamEvents = async function* () {
			yield {
				event: 'on_chat_model_stream',
				data: {
					chunk: {
						content: 'I need to call a tool',
					} as AIMessageChunk,
				},
			};
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
								type: 'tool_call',
							},
						],
					},
				},
			};
		};

		mockRunnableSequence.streamEvents = jest.fn().mockReturnValue(mockStreamEvents());

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return true;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
					enableStreaming: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockContext.sendChunk = jest.fn() as any;

		const result = (await toolsAgentExecute.call(
			mockContext,
		)) as EngineRequest<RequestResponseMetadata>;

		expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
		expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'I need to call a tool');
		expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);

		expect(result.actions).toBeDefined();
		expect(result.actions).toHaveLength(1);
		expect(result.actions[0].nodeName).toBe('TestTool');
		expect(result.actions[0].input).toEqual({ input: 'test data' });
	});

	it('should handle streaming without tool calls', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);
		mockContext.isStreaming = jest.fn().mockReturnValue(true) as any;

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;

		// Mock streaming events without tool calls
		const mockStreamEvents = async function* () {
			yield {
				event: 'on_chat_model_stream',
				data: {
					chunk: {
						content: 'Hello ',
					} as AIMessageChunk,
				},
			};
			yield {
				event: 'on_chat_model_stream',
				data: {
					chunk: {
						content: 'world!',
					} as AIMessageChunk,
				},
			};
		};

		mockRunnableSequence.streamEvents = jest.fn().mockReturnValue(mockStreamEvents());

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return true;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
					enableStreaming: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockContext.sendChunk = jest.fn() as any;

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockContext.sendChunk).toHaveBeenCalledWith('begin', 0);
		expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'Hello ');
		expect(mockContext.sendChunk).toHaveBeenCalledWith('item', 0, 'world!');
		expect(mockContext.sendChunk).toHaveBeenCalledWith('end', 0);

		expect((result as INodeExecutionData[][])[0]).toHaveLength(1);
		expect((result as INodeExecutionData[][])[0][0].json.output).toBe('Hello world!');
	});

	it('should capture intermediate steps during streaming when returnIntermediateSteps is true', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);
		mockContext.isStreaming = jest.fn().mockReturnValue(true) as any;

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;

		// Mock streaming events without tool calls at the end - just streaming response
		const mockStreamEvents = async function* () {
			yield {
				event: 'on_chat_model_stream',
				data: {
					chunk: {
						content: 'Final response',
					} as AIMessageChunk,
				},
			};
		};

		mockRunnableSequence.streamEvents = jest.fn().mockReturnValue(mockStreamEvents());

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return true;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: true, // Enable intermediate steps
					passthroughBinaryImages: true,
					enableStreaming: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockContext.sendChunk = jest.fn() as any;

		const result = await toolsAgentExecute.call(mockContext);

		expect((result as INodeExecutionData[][])[0]).toHaveLength(1);
		expect((result as INodeExecutionData[][])[0][0].json.output).toBe('Final response');

		// Since we removed the tool calls from this test, there should be no intermediate steps
		expect((result as INodeExecutionData[][])[0][0].json.intermediateSteps).toBeDefined();
		expect((result as INodeExecutionData[][])[0][0].json.intermediateSteps).toHaveLength(0);
	});

	it('should handle response with previous tool calls', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValue({ returnValues: { output: 'success with tools' } });

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		// Mock a response with tool call results - but don't set itemIndex to match current item
		// so it doesn't return null and skip processing
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'TestTool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0, previousRequests: [] },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: [{ json: { result: 'tool result' } }] as any,
				},
			],
			metadata: { itemIndex: 999, previousRequests: [] }, // Different itemIndex so it doesn't skip
		};

		const result = await toolsAgentExecute.call(mockContext, response);

		expect(mockRunnableSequence.invoke).toHaveBeenCalledTimes(1);
		expect((result as INodeExecutionData[][])[0]).toHaveLength(1);
		expect((result as INodeExecutionData[][])[0][0].json).toEqual({ output: 'success with tools' });

		// Check that invoke was called with the built steps
		const invokeCall = mockRunnableSequence.invoke.mock.calls[0][0];
		expect(invokeCall.steps).toBeDefined();
		expect(invokeCall.steps).toHaveLength(1);
		expect(invokeCall.steps[0].action.tool).toBe('TestTool');
		expect(invokeCall.steps[0].observation).toBe('[{"json":{"result":"tool result"}}]');
	});

	it('should handle memory save with tool call context', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		const mockMemory = mock<BaseChatMemory>();
		mockMemory.saveContext = jest.fn() as any;
		(mockMemory.loadMemoryVariables as jest.Mock) = jest
			.fn()
			.mockResolvedValue({ chat_history: [] });
		mockMemory.chatHistory = { getMessages: jest.fn().mockResolvedValue([]) } as any;

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValue({ returnValues: { output: 'success' } });

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(mockMemory);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		// Mock a response with tool call results - use different itemIndex to avoid skipping
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'TestTool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0, previousRequests: [] },
						actionType: 'ExecutionNodeAction' as const,
						type: 'ai_tool' as const,
					},
					data: [{ json: { result: 'tool result' } }] as any,
				},
			],
			metadata: { itemIndex: 999, previousRequests: [] }, // Different itemIndex so it doesn't skip
		};

		await toolsAgentExecute.call(mockContext, response);

		expect(mockMemory.saveContext).toHaveBeenCalledWith(
			{ input: 'test input' },
			{
				output:
					'[Used tools: Tool: TestTool, Input: "test data", Result: [{"json":{"result":"tool result"}}]] success',
			},
		);
	});

	it('should handle errors in batch processing when continueOnFail is true', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);
		mockContext.continueOnFail.mockReturnValue(true);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValueOnce({ returnValues: { output: 'success' } })
			.mockRejectedValueOnce(new Error('Test error'));

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await toolsAgentExecute.call(mockContext);

		expect((result as INodeExecutionData[][])[0]).toHaveLength(2);
		expect((result as INodeExecutionData[][])[0][0].json).toEqual({ output: 'success' });
		expect((result as INodeExecutionData[][])[0][1].json).toEqual({ error: 'Test error' });
	});

	it('should throw error when continueOnFail is false', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);
		mockContext.continueOnFail.mockReturnValue(false);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest.fn().mockRejectedValue(new Error('Test error'));

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		await expect(toolsAgentExecute.call(mockContext)).rejects.toThrow(NodeOperationError);
	});

	it('should handle streaming when not available (SupplyDataFunctions context)', async () => {
		const mockSupplyDataContext = mock<ISupplyDataFunctions>();

		mockSupplyDataContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		const mockNode = mock<INode>();
		mockNode.typeVersion = 3;
		mockSupplyDataContext.getNode.mockReturnValue(mockNode);
		mockSupplyDataContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValue({ returnValues: { output: 'success' } });

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mock<Tool>()]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockSupplyDataContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return true;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockSupplyDataContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await toolsAgentExecute.call(mockSupplyDataContext);

		expect(mockRunnableSequence.invoke).toHaveBeenCalledTimes(1);
		expect((result as INodeExecutionData[][])[0]).toHaveLength(1);
		expect((result as INodeExecutionData[][])[0][0].json).toEqual({ output: 'success' });
	});
});
