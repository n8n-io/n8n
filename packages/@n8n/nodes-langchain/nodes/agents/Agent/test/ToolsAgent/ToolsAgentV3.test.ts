import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	EngineRequest,
	EngineResponse,
	INodeExecutionData,
} from 'n8n-workflow';

import * as helpers from '../../agents/ToolsAgent/V3/helpers';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V3/execute';
import type { RequestResponseMetadata } from '../../agents/ToolsAgent/V3/execute';

// Mock the helper modules
jest.mock('../../agents/ToolsAgent/V3/helpers', () => ({
	buildExecutionContext: jest.fn(),
	executeBatch: jest.fn(),
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
		const sleepSpy = jest.spyOn(require('n8n-workflow'), 'sleep').mockResolvedValue(undefined);

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

		expect(sleepSpy).toHaveBeenCalledWith(1000);
		expect(sleepSpy).toHaveBeenCalledTimes(1); // Only between batches, not after the last one

		sleepSpy.mockRestore();
	});

	it('should not apply delay after last batch', async () => {
		const sleepSpy = jest.spyOn(require('n8n-workflow'), 'sleep').mockResolvedValue(undefined);

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

		expect(sleepSpy).not.toHaveBeenCalled();

		sleepSpy.mockRestore();
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
