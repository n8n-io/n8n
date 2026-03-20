/**
 * GHC-5636: Tests for agent_scratchpad bug in AI Agent V3
 *
 * This test verifies that tool call history (steps) is properly converted
 * to agent_scratchpad format before being passed to the LLM.
 *
 * BUG: Currently, steps are passed directly but LangChain's prompt template
 * expects {agent_scratchpad} placeholder to be populated with message history.
 */

import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseChatMemory } from '@langchain/classic/memory';
import type { IExecuteFunctions } from 'n8n-workflow';
import { runAgent } from './runAgent';
import type { ItemContext } from './prepareItemContext';

describe('runAgent - agent_scratchpad bug (GHC-5636)', () => {
	let mockExecutor: AgentRunnableSequence;
	let mockModel: BaseChatModel;
	let mockContext: IExecuteFunctions;
	let mockItemContext: ItemContext;
	let mockMemory: BaseChatMemory;

	// Track what parameters are passed to executor.invoke()
	let invokeParams: any;

	beforeEach(() => {
		// Mock the agent executor
		mockExecutor = {
			invoke: jest.fn(async (params: any) => {
				invokeParams = params;
				return {
					returnValues: {
						output: 'test output',
					},
				};
			}),
		} as any;

		mockModel = {
			getNumTokens: jest.fn(async () => 10),
		} as any;

		mockContext = {
			getExecutionCancelSignal: jest.fn(() => new AbortController().signal),
			getNode: jest.fn(() => ({ typeVersion: 3 })),
			logger: {
				debug: jest.fn(),
			},
		} as any;

		mockMemory = {
			loadMemoryVariables: jest.fn(async () => ({ chat_history: [] })),
			chatHistory: {
				addMessages: jest.fn(),
			},
		} as any;

		// Create item context with steps (tool call history)
		mockItemContext = {
			itemIndex: 0,
			input: 'What is 5*3?',
			steps: [
				{
					action: {
						tool: 'Calculator',
						toolCallId: 'call_1',
						toolInput: { input: '5*3' },
						messageLog: [
							{
								content: '',
								additional_kwargs: {
									tool_calls: [
										{
											id: 'call_1',
											type: 'function',
											function: {
												name: 'Calculator',
												arguments: '{"input":"5*3"}',
											},
										},
									],
								},
							},
						],
					},
					observation: '15',
				},
			],
			tools: [],
			options: {},
		};
	});

	it('should pass steps to executor (currently does this)', async () => {
		await runAgent(mockContext, mockExecutor, mockItemContext, mockModel, mockMemory);

		// Currently, steps are passed in invokeParams
		expect(invokeParams).toHaveProperty('steps');
		expect(invokeParams.steps).toEqual(mockItemContext.steps);
	});

	it('BUG: should populate agent_scratchpad with tool call history (currently does NOT)', async () => {
		await runAgent(mockContext, mockExecutor, mockItemContext, mockModel, mockMemory);

		// BUG: agent_scratchpad is NOT populated
		// The prompt template has {agent_scratchpad} placeholder but we never set it
		// Expected: agent_scratchpad should contain messages from steps:
		//   1. AIMessage with tool_calls (from steps[0].action.messageLog[0])
		//   2. ToolMessage with result (from steps[0].observation)

		// This test will FAIL because agent_scratchpad is not set
		expect(invokeParams).toHaveProperty('agent_scratchpad');
		expect(invokeParams.agent_scratchpad).toBeDefined();
		expect(Array.isArray(invokeParams.agent_scratchpad)).toBe(true);
		expect(invokeParams.agent_scratchpad.length).toBeGreaterThan(0);

		// Should contain AIMessage and ToolMessage from the tool call
		const messages = invokeParams.agent_scratchpad;
		const hasAIMessage = messages.some(
			(msg: any) => msg.constructor.name === 'AIMessage' || msg.additional_kwargs?.tool_calls,
		);
		const hasToolMessage = messages.some((msg: any) => msg.constructor.name === 'ToolMessage');

		expect(hasAIMessage).toBe(true);
		expect(hasToolMessage).toBe(true);
	});

	it('should convert steps to message format compatible with LangChain', async () => {
		await runAgent(mockContext, mockExecutor, mockItemContext, mockModel, mockMemory);

		// The agent_scratchpad should be an array of BaseMessage instances
		// that LangChain can inject into the {agent_scratchpad} placeholder
		const scratchpad = invokeParams.agent_scratchpad;

		expect(Array.isArray(scratchpad)).toBe(true);

		// For each step, there should be 2 messages:
		// 1. AIMessage with tool_calls
		// 2. ToolMessage with observation
		expect(scratchpad.length).toBe(mockItemContext.steps.length * 2);

		// First message should be the AI's tool call
		const aiMessage = scratchpad[0];
		expect(aiMessage).toHaveProperty('additional_kwargs.tool_calls');
		expect(aiMessage.additional_kwargs.tool_calls[0].id).toBe('call_1');

		// Second message should be the tool's response
		const toolMessage = scratchpad[1];
		expect(toolMessage.content).toBe('15');
	});
});
