import {
	sleep,
	type IExecuteFunctions,
	type INode,
	type EngineRequest,
	type EngineResponse,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { RequestResponseMetadata } from '@utils/agent-execution';

import { toolsAgentExecute } from '../../agents/ToolsAgent/V3/execute';
import * as helpers from '../../agents/ToolsAgent/V3/helpers';
import type { MockedFunction } from 'vitest';

// Mock the helper modules
vi.mock('../../agents/ToolsAgent/V3/helpers', () => ({
	buildExecutionContext: vi.fn(),
	executeBatch: vi.fn(),
	checkMaxIterations: vi.fn(),
	buildResponseMetadata: vi.fn(),
}));

// Mock langchain modules
vi.mock('@langchain/classic/agents', () => ({
	createToolCallingAgent: vi.fn(),
}));

vi.mock('@langchain/core/runnables', () => ({
	RunnableSequence: {
		from: vi.fn(),
	},
}));

vi.mock('n8n-workflow', async () => ({
	...(await vi.importActual('n8n-workflow')),
	sleep: vi.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	vi.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
	mockContext.logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
	mockContext.customData = {
		set: vi.fn(),
		setAll: vi.fn(),
		get: vi.fn(),
		getAll: vi.fn(),
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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

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

	it('should pass response to executeBatch when provided', async () => {
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

		const mockResponse: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { previousRequests: [] },
		};

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		const result = await toolsAgentExecute.call(mockContext, mockResponse);

		expect(helpers.executeBatch).toHaveBeenCalledWith(
			mockContext,
			mockExecutionContext.items.slice(0, 1),
			0,
			mockExecutionContext.model,
			mockExecutionContext.fallbackModel,
			mockExecutionContext.memory,
			mockResponse,
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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch')
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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch')
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
		const sleepMock = sleep as MockedFunction<typeof sleep>;
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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

		await toolsAgentExecute.call(mockContext);

		expect(sleepMock).toHaveBeenCalledWith(1000);
		expect(sleepMock).toHaveBeenCalledTimes(1); // Only between batches, not after the last one
	});

	it('should not apply delay after last batch', async () => {
		const sleepMock = sleep as MockedFunction<typeof sleep>;
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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch').mockResolvedValue(mockBatchResult);

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

		vi.spyOn(helpers, 'buildExecutionContext').mockResolvedValue(mockExecutionContext);
		vi.spyOn(helpers, 'executeBatch')
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
});
