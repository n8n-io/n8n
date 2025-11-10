import { mock } from 'jest-mock-extended';
import {
	NodeOperationError,
	sleep,
	type IExecuteFunctions,
	type INode,
	type EngineRequest,
	type EngineResponse,
} from 'n8n-workflow';

import { toolsAgentExecute } from '../../agents/ToolsAgent/V3/execute';
import type { RequestResponseMetadata } from '../../agents/ToolsAgent/V3/execute';
import * as helpers from '../../agents/ToolsAgent/V3/helpers';

// Mock the helper modules
jest.mock('../../agents/ToolsAgent/V3/helpers', () => ({
	buildExecutionContext: jest.fn(),
	executeBatch: jest.fn(),
}));

// Mock langchain modules
jest.mock('langchain/agents', () => ({
	createToolCallingAgent: jest.fn(),
}));

jest.mock('@langchain/core/runnables', () => ({
	RunnableSequence: {
		from: jest.fn(),
	},
}));

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	jest.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
	mockContext.logger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
});

describe('toolsAgentExecute V3 - Execute Function Logic', () => {
	it('should build execution context and process single batch', async () => {
		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult = {
			returnData: [{ json: { output: 'success 1' }, pairedItem: { item: 0 } }],
			request: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		const result = await toolsAgentExecute.call(mockContext);

		expect(helpers.buildExecutionContext).toHaveBeenCalledWith(mockContext);
		expect(helpers.executeBatch).toHaveBeenCalledTimes(1);
		expect(helpers.executeBatch).toHaveBeenCalledWith(
			mockContext,
			mockExecutionContext.items.slice(0, 1),
			0,
			mockExecutionContext.model,
			mockExecutionContext.fallbackModel,
			mockExecutionContext.memory,
			undefined,
		);
		expect(result).toEqual([[{ json: { output: 'success 1' }, pairedItem: { item: 0 } }]]);
	});

	it('should process multiple batches sequentially', async () => {
		const mockExecutionContext = {
			items: [
				{ json: { text: 'test input 1' } },
				{ json: { text: 'test input 2' } },
				{ json: { text: 'test input 3' } },
			],
			batchSize: 2,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult1 = {
			returnData: [
				{ json: { output: 'success 1' }, pairedItem: { item: 0 } },
				{ json: { output: 'success 2' }, pairedItem: { item: 1 } },
			],
			request: undefined,
		};

		const mockBatchResult2 = {
			returnData: [{ json: { output: 'success 3' }, pairedItem: { item: 2 } }],
			request: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest
			.spyOn(helpers, 'executeBatch')
			.mockResolvedValueOnce(mockBatchResult1)
			.mockResolvedValueOnce(mockBatchResult2);

		const result = await toolsAgentExecute.call(mockContext);

		expect(helpers.executeBatch).toHaveBeenCalledTimes(2);
		expect(helpers.executeBatch).toHaveBeenNthCalledWith(
			1,
			mockContext,
			mockExecutionContext.items.slice(0, 2),
			0,
			mockExecutionContext.model,
			mockExecutionContext.fallbackModel,
			mockExecutionContext.memory,
			undefined,
		);
		expect(helpers.executeBatch).toHaveBeenNthCalledWith(
			2,
			mockContext,
			mockExecutionContext.items.slice(2, 3),
			2,
			mockExecutionContext.model,
			mockExecutionContext.fallbackModel,
			mockExecutionContext.memory,
			undefined,
		);
		expect(result).toEqual([
			[
				{ json: { output: 'success 1' }, pairedItem: { item: 0 } },
				{ json: { output: 'success 2' }, pairedItem: { item: 1 } },
				{ json: { output: 'success 3' }, pairedItem: { item: 2 } },
			],
		]);
	});

	it('should return request when batch returns tool call request', async () => {
		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockRequest: EngineRequest<RequestResponseMetadata> = {
			actions: [
				{
					actionType: 'ExecutionNodeAction' as const,
					nodeName: 'Test Tool',
					input: { input: 'test data' },
					type: 'ai_tool',
					id: 'call_123',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: { previousRequests: [] },
		};

		const mockBatchResult = {
			returnData: [],
			request: mockRequest,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		const result = await toolsAgentExecute.call(mockContext);

		expect(result).toEqual(mockRequest);
	});

	it('should merge requests from multiple batches', async () => {
		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }, { json: { text: 'test input 2' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockRequest1: EngineRequest<RequestResponseMetadata> = {
			actions: [
				{
					actionType: 'ExecutionNodeAction' as const,
					nodeName: 'Test Tool 1',
					input: { input: 'test data 1' },
					type: 'ai_tool',
					id: 'call_123',
					metadata: { itemIndex: 0 },
				},
			],
			metadata: { previousRequests: [] },
		};

		const mockRequest2: EngineRequest<RequestResponseMetadata> = {
			actions: [
				{
					actionType: 'ExecutionNodeAction' as const,
					nodeName: 'Test Tool 2',
					input: { input: 'test data 2' },
					type: 'ai_tool',
					id: 'call_456',
					metadata: { itemIndex: 1 },
				},
			],
			metadata: { previousRequests: [] },
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest
			.spyOn(helpers, 'executeBatch')
			.mockResolvedValueOnce({ returnData: [], request: mockRequest1 })
			.mockResolvedValueOnce({ returnData: [], request: mockRequest2 });

		const result = (await toolsAgentExecute.call(
			mockContext,
		)) as EngineRequest<RequestResponseMetadata>;

		expect(result.actions).toHaveLength(2);
		expect(result.actions[0].nodeName).toBe('Test Tool 1');
		expect(result.actions[1].nodeName).toBe('Test Tool 2');
	});

	it('should apply delay between batches when configured', async () => {
		const sleepMock = sleep as jest.MockedFunction<typeof sleep>;
		sleepMock.mockResolvedValue(undefined);

		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }, { json: { text: 'test input 2' } }],
			batchSize: 1,
			delayBetweenBatches: 1000,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult = {
			returnData: [{ json: { output: 'success' }, pairedItem: { item: 0 } }],
			request: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		await toolsAgentExecute.call(mockContext);

		expect(sleepMock).toHaveBeenCalledWith(1000);
		expect(sleepMock).toHaveBeenCalledTimes(1); // Only between batches, not after the last one
	});

	it('should not apply delay after last batch', async () => {
		const sleepMock = sleep as jest.MockedFunction<typeof sleep>;
		sleepMock.mockResolvedValue(undefined);

		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }],
			batchSize: 1,
			delayBetweenBatches: 1000,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult = {
			returnData: [{ json: { output: 'success' }, pairedItem: { item: 0 } }],
			request: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		await toolsAgentExecute.call(mockContext);

		expect(sleepMock).not.toHaveBeenCalled();
	});

	it('should pass response parameter to executeBatch', async () => {
		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult = {
			returnData: [{ json: { output: 'success' }, pairedItem: { item: 0 } }],
			request: undefined,
		};

		const mockResponse: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: { ai_tool: [[{ json: { result: 'tool result' } }]] },
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		await toolsAgentExecute.call(mockContext, mockResponse);

		expect(helpers.executeBatch).toHaveBeenCalledWith(
			mockContext,
			mockExecutionContext.items.slice(0, 1),
			0,
			mockExecutionContext.model,
			mockExecutionContext.fallbackModel,
			mockExecutionContext.memory,
			mockResponse,
		);
	});

	it('should collect return data from multiple batches', async () => {
		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }, { json: { text: 'test input 2' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest
			.spyOn(helpers, 'executeBatch')
			.mockResolvedValueOnce({
				returnData: [{ json: { output: 'success 1' }, pairedItem: { item: 0 } }],
				request: undefined,
			})
			.mockResolvedValueOnce({
				returnData: [{ json: { output: 'success 2' }, pairedItem: { item: 1 } }],
				request: undefined,
			});

		const result = await toolsAgentExecute.call(mockContext);

		expect(result).toEqual([
			[
				{ json: { output: 'success 1' }, pairedItem: { item: 0 } },
				{ json: { output: 'success 2' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('should log debug message when starting execution', async () => {
		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult = {
			returnData: [{ json: { output: 'success' }, pairedItem: { item: 0 } }],
			request: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		await toolsAgentExecute.call(mockContext);

		expect(mockContext.logger.debug).toHaveBeenCalledWith('Executing Tools Agent V3');
	});

	it('should throw NodeOperationError when max iterations is reached', async () => {
		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options.maxIterations') return 2;
			return undefined;
		});

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { iterationCount: 3 },
		};

		await expect(toolsAgentExecute.call(mockContext, response)).rejects.toThrow(NodeOperationError);
	});

	it('should not throw when iteration count is below max iterations', async () => {
		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options.maxIterations') return 10;
			return undefined;
		});

		const mockExecutionContext = {
			items: [{ json: { text: 'test input 1' } }],
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: {} as any,
			fallbackModel: null,
			memory: undefined,
		};

		const mockBatchResult = {
			returnData: [{ json: { output: 'success' }, pairedItem: { item: 0 } }],
			request: undefined,
		};

		jest.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		jest.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { iterationCount: 5 },
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
		expect(invokeCall.steps[0].observation).toBe('[{"result":"tool result"}]');
	});

	it('should handle tool responses with multiple items', async () => {
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;
		mockRunnableSequence.invoke = jest
			.fn()
			.mockResolvedValue({ returnValues: { output: 'success with multiple items' } });

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

		// Mock a response with tool call that returns multiple items
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_456',
						nodeName: 'GetUsers',
						input: { input: 'all', id: 'call_456' },
						metadata: { itemIndex: 0, previousRequests: [] },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [
								[
									{ json: { uid: '1', email: 'user1@example.com', name: 'User One' } },
									{ json: { uid: '2', email: 'user2@example.com', name: 'User Two' } },
									{ json: { uid: '3', email: 'user3@example.com', name: 'User Three' } },
								],
							],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 999, previousRequests: [] },
		};

		const result = await toolsAgentExecute.call(mockContext, response);

		expect(mockRunnableSequence.invoke).toHaveBeenCalledTimes(1);
		expect((result as INodeExecutionData[][])[0]).toHaveLength(1);

		// Verify that all 3 items are included in the observation, not just the first one
		const invokeCall = mockRunnableSequence.invoke.mock.calls[0][0];
		expect(invokeCall.steps).toBeDefined();
		expect(invokeCall.steps).toHaveLength(1);

		const observation = JSON.parse(invokeCall.steps[0].observation);
		expect(Array.isArray(observation)).toBe(true);
		expect(observation).toHaveLength(3);
		expect(observation[0]).toEqual({ uid: '1', email: 'user1@example.com', name: 'User One' });
		expect(observation[1]).toEqual({ uid: '2', email: 'user2@example.com', name: 'User Two' });
		expect(observation[2]).toEqual({ uid: '3', email: 'user3@example.com', name: 'User Three' });
	});

	it('should handle memory save with tool call context', async () => {
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
					data: {
						data: {
							ai_tool: [[{ json: { result: 'tool result' } }]],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 999, previousRequests: [] }, // Different itemIndex so it doesn't skip
		};

		await toolsAgentExecute.call(mockContext, response);

		expect(mockMemory.saveContext).toHaveBeenCalledWith(
			{ input: 'test input' },
			{
				output:
					'[Used tools: Tool: TestTool, Input: "test data", Result: [{"result":"tool result"}]] success',
			},
		);
	});

	it('should trim chat history to fit within `maxTokensFromMemory` limits', async () => {
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		// Mock model that only counts "tokens", and for simplicity we say each character is a token.
		// Normally we pass a BaseLanguageModel and its `BaseLanguageModel.getNumTokens()` is used but I couldn't to mock that.
		const mockModel = (async (messages: BaseMessage[]) => {
			return await Promise.resolve(
				messages.map((m: BaseMessage) => m.content.length).reduce((a, b) => a + b, 0),
			);
		}) as unknown as BaseChatModel;

		const mockHistory: BaseMessage[] = [
			new HumanMessage({ content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }), // 56 "tokens"
			new AIMessage({ content: 'Vivamus volutpat felis a sapien viverra pretium.' }), // 48 "tokens"
			new HumanMessage({
				content: 'Nam id felis condimentum, venenatis ligula non, pulvinar nunc.',
			}), // 62
			new AIMessage({ content: 'Praesent eget ante magna.' }), // 25 "tokens"
			new HumanMessage({
				content: 'Curabitur euismod sem at dui efficitur, at convallis erat facilisis.', // 68 "tokens"
			}),
			new AIMessage({ content: 'Sed nec eros euismod, tincidunt nunc at, fermentum massa.' }), // 57 "tokens"
		];
		const mockMemory = mock<BaseChatMemory>();
		(mockMemory.saveContext as jest.Mock) = jest.fn();
		(mockMemory.loadMemoryVariables as jest.Mock) = jest.fn().mockResolvedValue({
			chat_history: mockHistory,
		});
		mockMemory.chatHistory = { getMessages: jest.fn().mockResolvedValue(mockHistory) } as any;

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
					maxTokensFromMemory: 250, // Last four messages fit (25+68+57+62=212), first two (56+48=104) get removed
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		await toolsAgentExecute.call(mockContext);

		expect(mockRunnableSequence.invoke).toHaveBeenCalledWith(
			expect.objectContaining({
				chat_history: [mockHistory[2], mockHistory[3], mockHistory[4], mockHistory[5]],
			}),
		);
	});

	it('should handle errors in batch processing when continueOnFail is true', async () => {
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

describe('max iterations', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
	});

	it('should enforce maxIterations and stop when limit is reached', async () => {
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);
		mockContext.isStreaming = jest.fn().mockReturnValue(false) as any;

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();

		mockRunnableSequence.invoke = jest.fn().mockResolvedValue([
			{
				toolCalls: [
					{
						id: 'call_456',
						name: 'TestTool',
						args: { input: 'test data' },
						type: 'tool_call',
					},
				],
			},
		]);

		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = {
			sourceNodeName: 'Test Tool',
		};

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 2,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
					enableStreaming: false,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockContext.sendChunk = jest.fn() as any;

		// Should return an EngineRequest with actions and metadata
		// Now simulate the second call with response from tools
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
			metadata: { itemIndex: 999, previousRequests: [], iterationCount: 3 },
		};

		await expect(toolsAgentExecute.call(mockContext, response)).rejects.toThrow(NodeOperationError);
	});

	it('should track iteration count correctly when called first time', async () => {
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;

		mockRunnableSequence.invoke = jest.fn().mockResolvedValue([
			{
				toolCalls: [
					{
						id: 'call_456',
						name: 'TestTool',
						args: { input: 'test data' },
						type: 'tool_call',
					},
				],
			},
		]);

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = {
			sourceNodeName: 'Test Tool',
		};

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
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

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		// First iteration - no previous response
		const result1 = (await toolsAgentExecute.call(
			mockContext,
		)) as EngineRequest<RequestResponseMetadata>;

		expect(result1.metadata.iterationCount).toBe(1);
	});

	it('should enforce maxIterations and stop when limit is reached streaming)', async () => {
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
		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = {
			sourceNodeName: 'Test Tool',
		};

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
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
					maxIterations: 1,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
					enableStreaming: true,
				};
			return defaultValue;
		});

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
		mockContext.sendChunk = jest.fn() as any;

		// Should return an EngineRequest with actions and metadata
		// Now simulate the second call with response from tools
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
			metadata: { itemIndex: 999, previousRequests: [], iterationCount: 1 },
		};

		// Mock stream for second call - should hit maxIterations and return final output
		const mockStreamEvents2 = async function* () {
			yield {
				event: 'on_chat_model_stream',
				data: {
					chunk: {
						content: 'Maximum iterations reached',
					} as AIMessageChunk,
				},
			};
			yield {
				event: 'on_chat_model_end',
				data: {
					output: {
						content: 'Still want to call more tools',
						tool_calls: [
							{
								id: 'call_456',
								name: 'TestTool',
								args: { input: 'more data' },
								type: 'tool_call',
							},
						],
					},
				},
			};
		};

		mockRunnableSequence.streamEvents.mockReturnValue(mockStreamEvents2());

		await expect(toolsAgentExecute.call(mockContext, response)).rejects.toThrow(NodeOperationError);
	});

	it('should track iteration count correctly when called first time', async () => {
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;

		mockRunnableSequence.invoke = jest.fn().mockResolvedValue([
			{
				tool: 'TestTool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_456',
				type: 'tool_call',
				log: 'Need another tool call',
			},
		]);

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = {
			sourceNodeName: 'Test Tool',
		};

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
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

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		// First iteration - no previous response
		const result1 = (await toolsAgentExecute.call(
			mockContext,
		)) as EngineRequest<RequestResponseMetadata>;

		expect(result1.metadata.iterationCount).toBe(1);
	});

	it('should track iteration count correctly on iteration', async () => {
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();

		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		mockRunnableSequence.singleAction = true;
		mockRunnableSequence.streamRunnable = false;

		mockRunnableSequence.invoke = jest.fn().mockResolvedValue([
			{
				toolCalls: [
					{
						id: 'call_456',
						name: 'TestTool',
						args: { input: 'test data' },
						type: 'tool_call',
					},
				],
			},
		]);

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);

		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = {
			sourceNodeName: 'Test Tool',
		};

		const responses: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_456',
						nodeName: 'TestTool',
						input: { input: 'test data' },
						metadata: { itemIndex: 0, previousRequests: [] },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: [{ json: { result: 'tool result' } }] as any,
				},
			],
			metadata: { itemIndex: 1, previousRequests: [], iterationCount: 1 },
		};

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mock<ChatPromptTemplate>());
		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return false;
			if (param === 'options.enableStreaming') return false;
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

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		// First iteration - no previous response
		const result = (await toolsAgentExecute.call(
			mockContext,
			responses,
		)) as EngineRequest<RequestResponseMetadata>;

		expect(result.metadata.iterationCount).toBe(2);
	});
});
