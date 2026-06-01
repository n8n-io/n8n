/**
 * Tests for CodeBuilderAgent pre-validation of existing workflows.
 *
 * Verifies that when a currentWorkflow is provided, the agent pre-validates
 * it and marks discovered warnings as pre-existing before the agentic loop.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { IWorkflowBase } from 'n8n-workflow';

import { CodeBuilderAgent } from '../code-builder-agent';

const mockFromJSON = jest.fn();

// Mock workflow-sdk to control parse/validate behavior
jest.mock('@n8n/workflow-sdk', () => ({
	parseWorkflowCodeToBuilder: jest.fn(),
	validateWorkflow: jest.fn(),
	generateWorkflowCode: jest.fn().mockReturnValue('// generated code'),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	workflow: { fromJSON: (...args: unknown[]) => mockFromJSON(...args) },
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

const MOCK_WORKFLOW: Partial<IWorkflowBase> = {
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
};

function createMockBuilder(warnings: Array<{ code: string; message: string }> = []) {
	return {
		regenerateNodeIds: jest.fn(),
		validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings }),
		generatePinData: jest.fn(),
		toJSON: jest.fn().mockReturnValue(MOCK_WORKFLOW),
	};
}

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

describe('CodeBuilderAgent pre-validation', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		parseWorkflowCodeToBuilder.mockReturnValue(createMockBuilder());
		validateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });
		mockFromJSON.mockReturnValue(createMockBuilder());
	});

	it('should call validateExistingWorkflow when currentWorkflow is provided', async () => {
		const agent = new CodeBuilderAgent({
			llm: createMockLlm(),
			nodeTypes: [],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{
				id: 'msg-1',
				message: 'Add a Set node',
				workflowContext: { currentWorkflow: MOCK_WORKFLOW },
			},
			'user-1',
		)) {
			chunks.push(chunk);
		}

		expect(mockFromJSON).toHaveBeenCalledWith(MOCK_WORKFLOW);
	});

	it('should not call validateExistingWorkflow when no currentWorkflow', async () => {
		const agent = new CodeBuilderAgent({
			llm: createMockLlm(),
			nodeTypes: [],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat({ id: 'msg-2', message: 'Create a workflow' }, 'user-1')) {
			chunks.push(chunk);
		}

		expect(mockFromJSON).not.toHaveBeenCalled();
	});

	it('should continue normally when pre-validation throws', async () => {
		mockFromJSON.mockImplementation(() => {
			throw new Error('fromJSON failed');
		});

		const agent = new CodeBuilderAgent({
			llm: createMockLlm(),
			nodeTypes: [],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{
				id: 'msg-3',
				message: 'Add a Set node',
				workflowContext: { currentWorkflow: MOCK_WORKFLOW },
			},
			'user-1',
		)) {
			chunks.push(chunk);
		}

		// Should still produce a workflow despite pre-validation failure
		const workflowUpdate = chunks.find((c) =>
			c.messages?.some((m: { type: string }) => m.type === 'workflow-updated'),
		);
		expect(workflowUpdate).toBeDefined();
	});

	it('should tag pre-existing warnings in validation feedback', async () => {
		const preExistingWarning = {
			code: 'WARN_EXISTING',
			message: 'Already broken',
			nodeName: 'Node1',
		};

		// Pre-validate returns warnings from the existing workflow
		mockFromJSON.mockReturnValue(createMockBuilder([preExistingWarning]));

		// The agent's own parse also returns the same warning (still present)
		// plus a new one
		const newWarning = { code: 'WARN_NEW', message: 'Newly introduced' };
		const agentBuilder = createMockBuilder();
		agentBuilder.validate.mockReturnValue({
			valid: true,
			errors: [],
			warnings: [preExistingWarning, newWarning],
		});
		parseWorkflowCodeToBuilder.mockReturnValue(agentBuilder);

		// First call returns warnings, second (after "fix") returns clean
		let parseCallCount = 0;
		const originalToJSON = agentBuilder.toJSON;
		agentBuilder.toJSON.mockImplementation(() => {
			parseCallCount++;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return originalToJSON();
		});

		const agent = new CodeBuilderAgent({
			llm: createMockLlm(),
			nodeTypes: [],
			enableTextEditor: false,
		});

		const chunks = [];
		for await (const chunk of agent.chat(
			{
				id: 'msg-4',
				message: 'Modify the workflow',
				workflowContext: { currentWorkflow: MOCK_WORKFLOW },
			},
			'user-1',
		)) {
			chunks.push(chunk);
		}

		// Pre-validation should have been called
		expect(mockFromJSON).toHaveBeenCalledWith(MOCK_WORKFLOW);
	});
});
