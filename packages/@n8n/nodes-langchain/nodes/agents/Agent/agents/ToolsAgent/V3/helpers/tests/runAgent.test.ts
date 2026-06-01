import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { Tool } from '@langchain/classic/tools';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions, INode, EngineResponse } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { RequestResponseMetadata } from '@utils/agent-execution';
import * as agentExecution from '@utils/agent-execution';
import * as tracing from '@utils/tracing';

import type { ItemContext } from '../prepareItemContext';
import { runAgent } from '../runAgent';

vi.mock('@utils/agent-execution', async () => {
	const originalModule = await vi.importActual('@utils/agent-execution');
	return {
		...originalModule,
		loadMemory: vi.fn(),
		processEventStream: vi.fn(),
		buildSteps: vi.fn(),
		createEngineRequests: vi.fn(),
		saveToMemory: vi.fn(),
	};
});

vi.mock('@utils/tracing', async () => {
	const originalModule = await vi.importActual('@utils/tracing');
	return {
		...originalModule,
		getTracingConfig: vi.fn(),
	};
});

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	vi.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
	mockNode.typeVersion = 3;
	mockContext.getExecuteData = vi.fn() as any;
	(tracing.getTracingConfig as Mock).mockReturnValue({
		runName: '[Test Workflow] Test Node',
		metadata: { execution_id: 'test-123', workflow: {}, node: 'Test Node' },
	});
});

describe('runAgent - iteration count tracking', () => {
	it('should set iteration count to 1 on first call (no response)', async () => {
		const mockInvoke = vi.fn().mockResolvedValue([
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
			withConfig: vi.fn().mockReturnValue({ invoke: mockInvoke }),
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

		vi.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		vi.spyOn(agentExecution, 'buildSteps').mockReturnValue([]);
		vi.spyOn(agentExecution, 'createEngineRequests').mockReturnValue([
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
		const mockInvoke = vi.fn().mockResolvedValue([
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
			withConfig: vi.fn().mockReturnValue({ invoke: mockInvoke }),
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

		vi.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		vi.spyOn(agentExecution, 'buildSteps').mockReturnValue([]);
		vi.spyOn(agentExecution, 'createEngineRequests').mockReturnValue([
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
		const mockStreamEvents = vi.fn().mockReturnValue(mockEventStream);
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: vi.fn().mockReturnValue({ streamEvents: mockStreamEvents }),
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
			getNode: vi.fn().mockReturnValue(mockNode),
			isStreaming: vi.fn().mockReturnValue(true),
			getExecutionCancelSignal: vi.fn().mockReturnValue(new AbortController().signal),
		});
		mockNode.typeVersion = 2.1;

		// Mock streaming to return tool calls
		vi.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		vi.spyOn(agentExecution, 'processEventStream').mockResolvedValue({
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
		vi.spyOn(agentExecution, 'buildSteps').mockReturnValue([]);
		vi.spyOn(agentExecution, 'createEngineRequests').mockReturnValue([
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
		const mockInvoke = vi.fn().mockResolvedValue({
			returnValues: {
				output: 'Final answer',
			},
		});
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: vi.fn().mockReturnValue({ invoke: mockInvoke }),
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
		vi.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		vi.spyOn(agentExecution, 'saveToMemory').mockResolvedValue();

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
		vi.spyOn(tracing, 'getTracingConfig').mockReturnValue(mockTracingConfig);

		const mockInvoke = vi.fn().mockResolvedValue({
			returnValues: { output: 'Final answer' },
		});
		const mockWithConfig = vi.fn().mockReturnValue({ invoke: mockInvoke });
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

		vi.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		vi.spyOn(agentExecution, 'saveToMemory').mockResolvedValue();
		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		await runAgent(mockContext, mockExecutor, itemContext, mockModel, undefined);

		expect(tracing.getTracingConfig).toHaveBeenCalledWith(mockContext, {
			additionalMetadata: {},
		});
		expect(mockWithConfig).toHaveBeenCalledWith(mockTracingConfig);
		expect(mockInvoke).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it('should include tracing metadata when provided', async () => {
		// Use real implementations instead of mocks
		const { getTracingConfig: realGetTracingConfig } =
			await vi.importActual<typeof tracing>('@utils/tracing');
		(tracing.getTracingConfig as Mock).mockImplementation(realGetTracingConfig);

		const { loadMemory: realLoadMemory, saveToMemory: realSaveToMemory } =
			await vi.importActual<typeof agentExecution>('@utils/agent-execution');
		(agentExecution.loadMemory as Mock).mockImplementation(realLoadMemory);
		(agentExecution.saveToMemory as Mock).mockImplementation(realSaveToMemory);

		const mockInvoke = vi.fn().mockResolvedValue({
			returnValues: { output: 'Final answer' },
		});
		const mockWithConfig = vi.fn().mockReturnValue({ invoke: mockInvoke });
		const mockExecutor = mock<AgentRunnableSequence>({
			withConfig: mockWithConfig,
		});
		const mockModel = mock<BaseChatModel>();

		// Set up context for real getTracingConfig
		mockContext.getWorkflow.mockReturnValue({ name: 'Test Workflow' } as any);
		mockContext.getExecutionId.mockReturnValue('exec-456');
		mockNode.name = 'Test Node';

		const itemContext: ItemContext = {
			itemIndex: 0,
			input: 'test input',
			steps: [],
			tools: [],
			prompt: mock(),
			options: {
				maxIterations: 10,
				returnIntermediateSteps: false,
				tracingMetadata: {
					values: [
						{ key: 'team', value: 'ai' },
						{ key: 'run_id', value: 'r-123' },
					],
				},
			},
			outputParser: undefined,
		};

		mockContext.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);

		await runAgent(mockContext, mockExecutor, itemContext, mockModel, undefined);

		// Assert on the actual tracing config built by the real getTracingConfig + buildTracingMetadata
		expect(mockWithConfig).toHaveBeenCalledWith(
			expect.objectContaining({
				runName: '[Test Workflow] Test Node',
				metadata: expect.objectContaining({
					execution_id: 'exec-456',
					node: 'Test Node',
					team: 'ai',
					run_id: 'r-123',
				}),
			}),
		);
		expect(mockInvoke).toHaveBeenCalled();
	});

	it('should apply tracing config in streaming mode', async () => {
		const mockTracingConfig = {
			runName: '[Test Workflow] Test Node',
			metadata: { execution_id: 'test-123', workflow: {}, node: 'Test Node' },
		};
		vi.spyOn(tracing, 'getTracingConfig').mockReturnValue(mockTracingConfig);

		const mockEventStream = (async function* () {})();
		const mockStreamEvents = vi.fn().mockReturnValue(mockEventStream);
		const mockWithConfig = vi.fn().mockReturnValue({ streamEvents: mockStreamEvents });
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
			getNode: vi.fn().mockReturnValue({ ...mockNode, typeVersion: 2.1 }),
			isStreaming: vi.fn().mockReturnValue(true),
			getExecutionCancelSignal: vi.fn().mockReturnValue(new AbortController().signal),
		});
		streamingContext.getExecuteData = vi.fn() as any;

		vi.spyOn(agentExecution, 'loadMemory').mockResolvedValue([]);
		vi.spyOn(agentExecution, 'processEventStream').mockResolvedValue({
			output: 'Streamed answer',
		});

		await runAgent(streamingContext, mockExecutor, itemContext, mockModel, undefined);

		expect(tracing.getTracingConfig).toHaveBeenCalledWith(streamingContext, {
			additionalMetadata: {},
		});
		expect(mockWithConfig).toHaveBeenCalledWith(mockTracingConfig);
		expect(mockStreamEvents).toHaveBeenCalled();
	});
});
