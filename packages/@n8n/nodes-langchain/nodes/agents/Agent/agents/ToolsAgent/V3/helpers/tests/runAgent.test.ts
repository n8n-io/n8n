import type { RequestResponseMetadata } from '@utils/agent-execution';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { Tool } from '@langchain/classic/tools';
import type { IExecuteFunctions, INode, EngineResponse } from 'n8n-workflow';

import * as agentExecution from '@utils/agent-execution';
import * as tracing from '@utils/tracing';

import type { ItemContext } from '../prepareItemContext';
import { runAgent } from '../runAgent';

jest.mock('@utils/agent-execution', () => {
	const originalModule = jest.requireActual('@utils/agent-execution');
	return {
		...originalModule,
		loadMemory: jest.fn(),
		processEventStream: jest.fn(),
		buildSteps: jest.fn(),
		createEngineRequests: jest.fn(),
		saveToMemory: jest.fn(),
	};
});

jest.mock('@utils/tracing', () => ({
	getTracingConfig: jest.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	jest.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
	mockNode.typeVersion = 3;
});

describe('runAgent - iteration count tracking', () => {
	it('should set iteration count to 1 on first call (no response)', async () => {
		const mockInvoke = jest.fn().mockResolvedValue([
			{
				toolCalls: [
					{
						id: 'call_123',
						name: 'TestTool',
						args: { input: 'test' },
						type: 'tool_call',
					},
				],
			},
		]);
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: jest.fn().mockReturnValue({ invoke: mockInvoke }),
		});
		const mockModel = mock<BaseChatModel>();
		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [mockTool],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
			},
			outputParser: undefined,
		};

		jest.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		jest.spyOn(agentExecution, 'buildSteps').mockReturnValue([]);
		jest.spyOn(agentExecution, 'createEngineRequests').mockReturnValue([
			{
				actionType: 'ExecutionNodeAction' as const,
				nodeName: 'Test Tool',
				input: { input: 'test' },
				type: 'ai_tool' as any,
				id: 'call_123',
				metadata: { itemIndex: 0 },
			},
		]);

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await runAgent(mockContext, mockExecutor, itemContext, mockModel, undefined);

		expect(result).toHaveProperty('actions');
		expect(result).toHaveProperty('metadata');
		expect((result as any).metadata.iterationCount).toBe(1);
	});

	it('should increment iteration count when response is provided', async () => {
		const mockInvoke = jest.fn().mockResolvedValue([
			{
				toolCalls: [
					{
						id: 'call_456',
						name: 'TestTool',
						args: { input: 'test2' },
						type: 'tool_call',
					},
				],
			},
		]);
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: jest.fn().mockReturnValue({ invoke: mockInvoke }),
		});
		const mockModel = mock<BaseChatModel>();
		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [mockTool],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
			},
			outputParser: undefined,
		};

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { itemIndex: 0, previousRequests: [], iterationCount: 2 },
		};

		jest.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		jest.spyOn(agentExecution, 'buildSteps').mockReturnValue([]);
		jest.spyOn(agentExecution, 'createEngineRequests').mockReturnValue([
			{
				actionType: 'ExecutionNodeAction' as const,
				nodeName: 'Test Tool',
				input: { input: 'test2' },
				type: 'ai_tool' as any,
				id: 'call_456',
				metadata: { itemIndex: 0 },
			},
		]);

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await runAgent(
			mockContext,
			mockExecutor,
			itemContext,
			mockModel,
			undefined,
			response,
		);

		expect(result).toHaveProperty('actions');
		expect(result).toHaveProperty('metadata');
		expect((result as any).metadata.iterationCount).toBe(3);
	});

	it('should set iteration count to 1 in streaming mode on first call', async () => {
		const mockEventStream = (async function* () {})();
		const mockStreamEvents = jest.fn().mockReturnValue(mockEventStream);
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: jest.fn().mockReturnValue({ streamEvents: mockStreamEvents }),
		});
		const mockModel = mock<BaseChatModel>();
		const mockTool = mock<Tool>();
		mockTool.name = 'TestTool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [mockTool],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
				enableStreaming: true,
			},
			outputParser: undefined,
		};

		const mockContext = mock<IExecuteFunctions>({
			getNode: jest.fn().mockReturnValue(mockNode),
			isStreaming: jest.fn().mockReturnValue(true),
			getExecutionCancelSignal: jest.fn().mockReturnValue(new AbortController().signal),
		});
		mockNode.typeVersion = 2.1;

		// Mock streaming to return tool calls
		jest.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		jest.spyOn(agentExecution, 'processEventStream').mockResolvedValue({
			output: '',
			toolCalls: [
				{
					tool: 'TestTool',
					toolInput: { input: 'test' },
					toolCallId: 'call_123',
					type: 'tool_call',
				},
			],
		});
		jest.spyOn(agentExecution, 'buildSteps').mockReturnValue([]);
		jest.spyOn(agentExecution, 'createEngineRequests').mockReturnValue([
			{
				actionType: 'ExecutionNodeAction' as const,
				nodeName: 'Test Tool',
				input: { input: 'test' },
				type: 'ai_tool' as any,
				id: 'call_123',
				metadata: { itemIndex: 0 },
			},
		]);

		const result = await runAgent(mockContext, mockExecutor, itemContext, mockModel, undefined);

		expect(result).toHaveProperty('actions');
		expect(result).toHaveProperty('metadata');
		expect((result as any).metadata.iterationCount).toBe(1);
	});

	it('should not include iteration count when returning final result', async () => {
		const mockInvoke = jest.fn().mockResolvedValue({
			returnValues: {
				output: 'Final answer',
			},
		});
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: jest.fn().mockReturnValue({ invoke: mockInvoke }),
		});
		const mockModel = mock<BaseChatModel>();

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
			},
			outputParser: undefined,
		};

		// Mock the agent to return a final result (no tool calls)
		jest.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		jest.spyOn(agentExecution, 'saveToMemory').mockResolvedValue();

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		const result = await runAgent(mockContext, mockExecutor, itemContext, mockModel, undefined);

		expect(result).toHaveProperty('output');
		expect(result).not.toHaveProperty('actions');
		expect(result).not.toHaveProperty('metadata');
	});
});

describe('runAgent - tracing configuration', () => {
	it('should apply tracing config in non-streaming mode', async () => {
		const mockTracingConfig = {
			runName: '[Test Workflow] Test Node',
			metadata: { execution_id: 'test-123', workflow: {}, node: 'Test Node' },
		};
		jest.spyOn(tracing, 'getTracingConfig').mockReturnValue(mockTracingConfig);

		const mockInvoke = jest.fn().mockResolvedValue({
			returnValues: { output: 'Final answer' },
		});
		const mockWithConfig = jest.fn().mockReturnValue({ invoke: mockInvoke });
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: mockWithConfig,
		});
		const mockModel = mock<BaseChatModel>();

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
			},
			outputParser: undefined,
		};

		jest.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		jest.spyOn(agentExecution, 'saveToMemory').mockResolvedValue();
		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		await runAgent(mockContext, mockExecutor, itemContext, mockModel, undefined);

		expect(tracing.getTracingConfig).toHaveBeenCalledWith(mockContext);
		expect(mockWithConfig).toHaveBeenCalledWith(mockTracingConfig);
		expect(mockInvoke).toHaveBeenCalled();
	});

	it('should apply tracing config in streaming mode', async () => {
		const mockTracingConfig = {
			runName: '[Test Workflow] Test Node',
			metadata: { execution_id: 'test-123', workflow: {}, node: 'Test Node' },
		};
		jest.spyOn(tracing, 'getTracingConfig').mockReturnValue(mockTracingConfig);

		const mockEventStream = (async function* () {})();
		const mockStreamEvents = jest.fn().mockReturnValue(mockEventStream);
		const mockWithConfig = jest.fn().mockReturnValue({ streamEvents: mockStreamEvents });
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: mockWithConfig,
		});
		const mockModel = mock<BaseChatModel>();

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
				enableStreaming: true,
			},
			outputParser: undefined,
		};

		const streamingContext = mock<IExecuteFunctions>({
			getNode: jest.fn().mockReturnValue({ ...mockNode, typeVersion: 2.1 }),
			isStreaming: jest.fn().mockReturnValue(true),
			getExecutionCancelSignal: jest.fn().mockReturnValue(new AbortController().signal),
		});

		jest.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		jest.spyOn(agentExecution, 'processEventStream').mockResolvedValue({
			output: 'Streamed answer',
		});

		await runAgent(streamingContext, mockExecutor, itemContext, mockModel, undefined);

		expect(tracing.getTracingConfig).toHaveBeenCalledWith(streamingContext);
		expect(mockWithConfig).toHaveBeenCalledWith(mockTracingConfig);
		expect(mockStreamEvents).toHaveBeenCalled();
	});
});
