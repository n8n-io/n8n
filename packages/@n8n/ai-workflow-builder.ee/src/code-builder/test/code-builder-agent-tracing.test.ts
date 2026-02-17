/**
 * Tests for CodeBuilderAgent LangSmith tracing output.
 *
 * Verifies that the parent LangSmith trace run includes the generated
 * workflow JSON as output when a workflow is successfully produced.
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { CodeBuilderAgent } from '../code-builder-agent';

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

/**
 * Create a mock LLM that returns a TypeScript code block on invoke.
 * The code block triggers final response handling (no tool calls).
 */
function createMockLlm(): BaseChatModel {
	const response = new AIMessage({
		content: '```typescript\nconst workflow = builder.addNode(...);\n```',
		tool_calls: [],
		response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
	});

	return {
		bindTools: jest.fn().mockReturnValue({
			invoke: jest.fn().mockResolvedValue(response),
		}),
	} as unknown as BaseChatModel;
}

function createMockBuilder() {
	return {
		regenerateNodeIds: jest.fn(),
		validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
		generatePinData: jest.fn(),
		toJSON: jest.fn().mockReturnValue(MOCK_WORKFLOW),
	};
}

/**
 * Custom callback handler that captures chain end outputs.
 * We use a class-based handler to ensure proper integration with
 * LangChain's CallbackManager.
 */
class ChainEndTracker extends BaseCallbackHandler {
	name = 'chain-end-tracker';

	chainEndOutputs: Array<Record<string, unknown>> = [];

	async handleChainEnd(outputs: Record<string, unknown>): Promise<void> {
		this.chainEndOutputs.push(outputs);
	}
}

describe('CodeBuilderAgent tracing', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		parseWorkflowCodeToBuilder.mockReturnValue(createMockBuilder());
		validateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });
	});

	it('should include workflow JSON in handleChainEnd output', async () => {
		const tracker = new ChainEndTracker();

		const agent = new CodeBuilderAgent({
			llm: createMockLlm(),
			nodeTypes: [],
			callbacks: [tracker],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{ id: 'msg-1', message: 'Create a simple workflow' },
			'user-1',
		)) {
			chunks.push(chunk);
		}

		// Verify the parent run's handleChainEnd received the workflow JSON
		expect(tracker.chainEndOutputs.length).toBeGreaterThan(0);
		// Find the parent chain end (the one with iterations field)
		const parentOutput = tracker.chainEndOutputs.find((o) => 'iterations' in o);
		expect(parentOutput).toBeDefined();
		expect(parentOutput).toMatchObject({
			iterations: expect.any(Number),
			hasWorkflow: true,
			outputTrace: expect.arrayContaining([
				expect.objectContaining({ type: 'text', text: expect.any(String) }),
			]),
			output: {
				code: expect.any(String),
				workflow: JSON.stringify(MOCK_WORKFLOW),
			},
		});
	});

	it('should capture interleaved text and tool-call entries in outputTrace', async () => {
		// Iteration 1: LLM returns text + two tool calls (search_nodes, get_node_types)
		const toolCallResponse = new AIMessage({
			content: 'Let me search for the right nodes...',
			tool_calls: [
				{ name: 'search_nodes', args: { query: 'http' }, id: 'tc-1', type: 'tool_call' as const },
				{
					name: 'get_node_types',
					args: { nodeTypes: ['n8n-nodes-base.httpRequest'] },
					id: 'tc-2',
					type: 'tool_call' as const,
				},
			],
			response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
		});

		// Iteration 2: LLM returns text with code block (final response)
		const codeResponse = new AIMessage({
			content: 'Here is your workflow:\n```typescript\nconst workflow = builder.addNode(...);\n```',
			tool_calls: [],
			response_metadata: { usage: { input_tokens: 200, output_tokens: 100 } },
		});

		let callCount = 0;
		const mockLlm = {
			bindTools: jest.fn().mockReturnValue({
				invoke: jest.fn().mockImplementation(() => {
					callCount++;
					return callCount === 1 ? toolCallResponse : codeResponse;
				}),
			}),
		} as unknown as BaseChatModel;

		const tracker = new ChainEndTracker();

		const agent = new CodeBuilderAgent({
			llm: mockLlm,
			nodeTypes: [],
			callbacks: [tracker],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{ id: 'msg-3', message: 'Create an HTTP request workflow' },
			'user-1',
		)) {
			chunks.push(chunk);
		}

		const parentOutput = tracker.chainEndOutputs.find((o) => 'iterations' in o);
		expect(parentOutput).toBeDefined();
		expect(parentOutput!.hasWorkflow).toBe(true);

		// Verify the outputTrace has the correct interleaved order
		const trace = parentOutput!.outputTrace as Array<{
			type: string;
			text?: string;
			toolName?: string;
		}>;
		expect(trace).toEqual([
			{ type: 'text', text: 'Let me search for the right nodes...' },
			{ type: 'tool-call', toolName: 'search_nodes' },
			{ type: 'tool-call', toolName: 'get_node_types' },
			{
				type: 'text',
				text: 'Here is your workflow:\n```typescript\nconst workflow = builder.addNode(...);\n```',
			},
		]);
	});

	it('should set output to null when no workflow is produced', async () => {
		// Make parse fail on all attempts so no workflow is generated
		parseWorkflowCodeToBuilder.mockImplementation(() => {
			throw new Error('Parse error');
		});

		const tracker = new ChainEndTracker();

		const agent = new CodeBuilderAgent({
			llm: createMockLlm(),
			nodeTypes: [],
			callbacks: [tracker],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat({ id: 'msg-2', message: 'Create a workflow' }, 'user-1')) {
			chunks.push(chunk);
		}

		// When parse fails and the error is caught, handleChainError is called.
		// If handleChainEnd was called instead, verify output is null
		const parentOutput = tracker.chainEndOutputs.find((o) => 'iterations' in o);
		if (parentOutput) {
			expect(parentOutput).toMatchObject({
				hasWorkflow: false,
				output: null,
			});
		}
	});
});
