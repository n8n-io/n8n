/**
 * Tests for CodeBuilderAgent think-loop circuit breaker.
 *
 * Verifies that when the agent calls only the `think` tool for
 * MAX_CONSECUTIVE_THINK_ONLY iterations, a HumanMessage is injected
 * to force it to take an action.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { CodeBuilderAgent } from '../code-builder-agent';
import { MAX_CONSECUTIVE_THINK_ONLY } from '../constants';

// Mock workflow-sdk to control parse/validate behavior
jest.mock('@n8n/workflow-sdk', () => ({
	parseWorkflowCodeToBuilder: jest.fn(),
	validateWorkflow: jest.fn(),
	generateWorkflowCode: jest.fn().mockReturnValue('// generated code'),
}));

// Mock the prompts module to avoid complex prompt building
jest.mock('../prompts', () => ({
	buildCodeBuilderPrompt: jest.fn().mockReturnValue({
		formatMessages: jest.fn().mockResolvedValue([]),
	}),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseWorkflowCodeToBuilder, validateWorkflow } = require('@n8n/workflow-sdk') as {
	parseWorkflowCodeToBuilder: jest.Mock;
	validateWorkflow: jest.Mock;
};

const MOCK_WORKFLOW: WorkflowJSON = {
	id: 'test-wf-1',
	name: 'Test Workflow',
	nodes: [
		{
			id: 'node-1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1.1,
			position: [240, 300],
			parameters: {},
		},
	],
	connections: {},
} as unknown as WorkflowJSON;

function createMockBuilder() {
	return {
		regenerateNodeIds: jest.fn(),
		validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
		generatePinData: jest.fn(),
		toJSON: jest.fn().mockReturnValue(MOCK_WORKFLOW),
	};
}

/**
 * Extract the text content from a message, handling both plain string content
 * and multi-part content arrays (produced by applySubgraphCacheMarkers).
 */
function getTextContent(msg: BaseMessage): string {
	if (typeof msg.content === 'string') return msg.content;
	if (Array.isArray(msg.content)) {
		return msg.content
			.filter((b): b is { type: 'text'; text: string } => typeof b === 'object' && 'text' in b)
			.map((b) => b.text)
			.join('');
	}
	return '';
}

describe('CodeBuilderAgent think-loop circuit breaker', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		parseWorkflowCodeToBuilder.mockReturnValue(createMockBuilder());
		validateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });
	});

	it(`should inject a forced-action HumanMessage after ${MAX_CONSECUTIVE_THINK_ONLY} consecutive think-only iterations`, async () => {
		let callCount = 0;

		// Snapshot messages at each LLM invocation (the array is mutated in-place,
		// so we must shallow-copy at call time to inspect later)
		const messageSnapshots: unknown[][] = [];

		// First N calls: return think-only tool calls
		// Call after injection: return final code response
		const mockLlm = {
			bindTools: jest.fn().mockReturnValue({
				invoke: jest.fn().mockImplementation((messages: unknown[]) => {
					messageSnapshots.push([...messages]);
					callCount++;

					if (callCount <= MAX_CONSECUTIVE_THINK_ONLY) {
						return new AIMessage({
							content: '',
							tool_calls: [
								{
									name: 'think',
									args: { thought: `thinking iteration ${callCount}` },
									id: `tc-think-${callCount}`,
									type: 'tool_call' as const,
								},
							],
							response_metadata: { usage: { input_tokens: 50, output_tokens: 20 } },
						});
					}

					// After forced-action message, return code
					return new AIMessage({
						content: '```typescript\nconst workflow = builder.addNode(...);\n```',
						tool_calls: [],
						response_metadata: { usage: { input_tokens: 200, output_tokens: 100 } },
					});
				}),
			}),
		} as unknown as BaseChatModel;

		const agent = new CodeBuilderAgent({
			llm: mockLlm,
			nodeTypes: [],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{ id: 'msg-think-loop', message: 'Create a workflow' },
			'user-1',
		)) {
			chunks.push(chunk);
		}

		// The agent should have completed (produced a workflow)
		const workflowChunk = chunks.find((c) =>
			c.messages?.some((m) => 'type' in m && m.type === 'workflow-updated'),
		);
		expect(workflowChunk).toBeDefined();

		// The HumanMessage is injected AFTER the 3rd think-only dispatch returns,
		// so it appears in the messages for the (MAX_CONSECUTIVE_THINK_ONLY + 1)th call.
		// Verify we had enough invocations.
		expect(messageSnapshots.length).toBe(MAX_CONSECUTIVE_THINK_ONLY + 1);

		const postThinkSnapshot = messageSnapshots[MAX_CONSECUTIVE_THINK_ONLY] as BaseMessage[];

		// Content may have been transformed to multi-part format by cache markers,
		// so use the helper to extract text.
		const forcedActionMessage = postThinkSnapshot.find((m) =>
			getTextContent(m).includes('You have been reasoning without making changes'),
		);

		expect(forcedActionMessage).toBeDefined();
	});

	it('should reset think-only counter when a non-think tool is called', async () => {
		let callCount = 0;
		const messageSnapshots: unknown[][] = [];

		const mockLlm = {
			bindTools: jest.fn().mockReturnValue({
				invoke: jest.fn().mockImplementation((messages: unknown[]) => {
					messageSnapshots.push([...messages]);
					callCount++;

					// First 2 calls: think only (below threshold)
					if (callCount <= 2) {
						return new AIMessage({
							content: '',
							tool_calls: [
								{
									name: 'think',
									args: { thought: `thinking ${callCount}` },
									id: `tc-think-${callCount}`,
									type: 'tool_call' as const,
								},
							],
							response_metadata: { usage: { input_tokens: 50, output_tokens: 20 } },
						});
					}

					// 3rd call: search_nodes (resets counter)
					if (callCount === 3) {
						return new AIMessage({
							content: '',
							tool_calls: [
								{
									name: 'search_nodes',
									args: { query: 'http' },
									id: 'tc-search-1',
									type: 'tool_call' as const,
								},
							],
							response_metadata: { usage: { input_tokens: 50, output_tokens: 20 } },
						});
					}

					// 4th call: final code response
					return new AIMessage({
						content: '```typescript\nconst workflow = builder.addNode(...);\n```',
						tool_calls: [],
						response_metadata: { usage: { input_tokens: 200, output_tokens: 100 } },
					});
				}),
			}),
		} as unknown as BaseChatModel;

		const agent = new CodeBuilderAgent({
			llm: mockLlm,
			nodeTypes: [],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{ id: 'msg-reset', message: 'Create a workflow' },
			'user-1',
		)) {
			chunks.push(chunk);
		}

		// Should have completed successfully
		const workflowChunk = chunks.find((c) =>
			c.messages?.some((m) => 'type' in m && m.type === 'workflow-updated'),
		);
		expect(workflowChunk).toBeDefined();

		// No forced-action HumanMessage should have been injected because
		// the search_nodes call reset the counter before reaching the threshold
		for (const snapshot of messageSnapshots) {
			const forcedActionMsg = (snapshot as BaseMessage[]).find((m) =>
				getTextContent(m).includes('You have been reasoning without making changes'),
			);
			expect(forcedActionMsg).toBeUndefined();
		}
	});
});
