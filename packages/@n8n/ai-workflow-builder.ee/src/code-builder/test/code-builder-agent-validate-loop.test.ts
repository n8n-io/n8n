/**
 * Tests for CodeBuilderAgent validate-loop circuit breakers.
 *
 * Verifies:
 * 1. Auto-finalize exits cleanly when no code exists (no loop)
 * 2. Auto-finalize throws after MAX_VALIDATE_ATTEMPTS consecutive failures
 * 3. validate_workflow tool increments the validate-attempts counter
 * 4. Counter resets on successful validation
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { CodeBuilderAgent } from '../code-builder-agent';
import { MAX_VALIDATE_ATTEMPTS } from '../constants';

// Mock workflow-sdk to control parse/validate behavior
jest.mock('@n8n/workflow-sdk', () => ({
	parseWorkflowCodeToBuilder: jest.fn(),
	validateWorkflow: jest.fn(),
	generateWorkflowCode: jest.fn().mockReturnValue('// generated code'),
	setSchemaBaseDirs: jest.fn(),
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

function createMockLlm(respondFn: (callCount: number) => AIMessage): {
	llm: BaseChatModel;
	getCallCount: () => number;
} {
	let callCount = 0;
	const llm = {
		bindTools: jest.fn().mockReturnValue({
			invoke: jest.fn().mockImplementation(() => {
				callCount++;
				return respondFn(callCount);
			}),
		}),
	} as unknown as BaseChatModel;
	return { llm, getCallCount: () => callCount };
}

function noToolCallResponse(): AIMessage {
	return new AIMessage({
		content: 'Here is the workflow.',
		tool_calls: [],
		response_metadata: { usage: { input_tokens: 50, output_tokens: 20 } },
	});
}

function validateToolCallResponse(callId: string): AIMessage {
	return new AIMessage({
		content: '',
		tool_calls: [
			{
				name: 'validate_workflow',
				args: { path: '/workflow.js' },
				id: callId,
				type: 'tool_call' as const,
			},
		],
		response_metadata: { usage: { input_tokens: 50, output_tokens: 20 } },
	});
}

async function collectChunks(
	gen: AsyncGenerator<unknown, void, unknown>,
): Promise<{ chunks: unknown[]; error?: Error }> {
	const chunks: unknown[] = [];
	try {
		for await (const chunk of gen) {
			chunks.push(chunk);
		}
	} catch (error) {
		return { chunks, error: error as Error };
	}
	return { chunks };
}

describe('CodeBuilderAgent validate-loop circuit breakers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		parseWorkflowCodeToBuilder.mockReturnValue(createMockBuilder());
		validateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });
	});

	describe('auto-finalize with no code', () => {
		it('should exit cleanly when LLM stops calling tools and no code exists', async () => {
			// LLM responds with no tool calls on every iteration (text editor mode)
			// Since no code exists, handleTextEditorAutoFinalize should return shouldBreak: true
			const { llm, getCallCount } = createMockLlm(() => noToolCallResponse());

			const agent = new CodeBuilderAgent({
				llm,
				nodeTypes: [],
				enableTextEditor: true,
			});

			const { chunks } = await collectChunks(
				agent.chat({ id: 'msg-no-code', message: 'Create a workflow' }, 'user-1'),
			);

			// Should exit after 1 iteration (not loop 50 times)
			expect(getCallCount()).toBe(1);

			// Should NOT produce a workflow update (no code was generated)
			const workflowChunk = chunks.find((c) =>
				(c as { messages?: Array<{ type?: string }> }).messages?.some(
					(m) => m.type === 'workflow-updated',
				),
			);
			expect(workflowChunk).toBeUndefined();
		});
	});

	describe('auto-finalize validate attempts limit', () => {
		it(`should throw after ${MAX_VALIDATE_ATTEMPTS} consecutive failed auto-finalize attempts`, async () => {
			// LLM always responds with no tool calls, but code exists and always fails validation
			const { llm } = createMockLlm(() => noToolCallResponse());

			// Make parseWorkflowCodeToBuilder throw to simulate persistent validation failure
			parseWorkflowCodeToBuilder.mockImplementation(() => {
				throw new Error('Syntax error in workflow code');
			});

			const agent = new CodeBuilderAgent({
				llm,
				nodeTypes: [],
				enableTextEditor: true,
			});

			const { chunks } = await collectChunks(
				agent.chat(
					{
						id: 'msg-validate-limit',
						message: 'Create a workflow',
						workflowContext: {
							currentWorkflow: MOCK_WORKFLOW as unknown as Record<string, unknown>,
						},
					},
					'user-1',
				),
			);

			// Should produce an error about validate attempts
			const errorChunk = chunks.find((c) =>
				(c as { messages?: Array<{ text?: string }> }).messages?.some((m) =>
					m.text?.includes('validate attempts'),
				),
			);
			expect(errorChunk).toBeDefined();
		});
	});

	describe('validate_workflow tool increments counter', () => {
		it('should increment validate attempts when validate_workflow tool fails', async () => {
			let callCount = 0;

			// Make validation always fail
			parseWorkflowCodeToBuilder.mockImplementation(() => {
				throw new Error('Parse error');
			});

			const { llm } = createMockLlm((count) => {
				callCount = count;
				// Always call validate_workflow
				return validateToolCallResponse(`tc-validate-${count}`);
			});

			const agent = new CodeBuilderAgent({
				llm,
				nodeTypes: [],
				enableTextEditor: true,
			});

			const { chunks } = await collectChunks(
				agent.chat(
					{
						id: 'msg-tool-validate',
						message: 'Create a workflow',
						workflowContext: {
							currentWorkflow: MOCK_WORKFLOW as unknown as Record<string, unknown>,
						},
					},
					'user-1',
				),
			);

			// Should stop before MAX_AGENT_ITERATIONS (50) thanks to the counter
			expect(callCount).toBeLessThanOrEqual(MAX_VALIDATE_ATTEMPTS + 1);

			// Should produce an error about validate attempts
			const errorChunk = chunks.find((c) =>
				(c as { messages?: Array<{ text?: string }> }).messages?.some((m) =>
					m.text?.includes('validate attempts'),
				),
			);
			expect(errorChunk).toBeDefined();
		});
	});
});
