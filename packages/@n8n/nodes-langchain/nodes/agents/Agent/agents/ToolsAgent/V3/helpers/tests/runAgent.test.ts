import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import type { AgentRunnableSequence } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions, INode, EngineResponse } from 'n8n-workflow';

import * as agentExecution from '@utils/agent-execution';

import type { RequestResponseMetadata } from '../../types';
import type { ItemContext } from '../prepareItemContext';
import { runAgent } from '../runAgent';

jest.mock('@utils/agent-execution', () => ({
	loadMemory: jest.fn(),
	processEventStream: jest.fn(),
	buildSteps: jest.fn(),
	createEngineRequests: jest.fn(),
	saveToMemory: jest.fn(),
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
		const mockExecutor = mock<AgentRunnableSequence>({
			invoke: jest.fn().mockResolvedValue([
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
			]),
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
		jest.spyOn(agentExecution, 'createEngineRequests').mockResolvedValue([
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
		const mockExecutor = mock<AgentRunnableSequence>({
			invoke: jest.fn().mockResolvedValue([
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
			]),
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
		jest.spyOn(agentExecution, 'createEngineRequests').mockResolvedValue([
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
		const mockExecutor = mock<AgentRunnableSequence>({
			streamEvents: jest.fn().mockReturnValue(mockEventStream),
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
		jest.spyOn(agentExecution, 'createEngineRequests').mockResolvedValue([
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
		const mockExecutor = mock<AgentRunnableSequence>({
			invoke: jest.fn().mockResolvedValue({
				returnValues: {
					output: 'Final answer',
				},
			}),
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
