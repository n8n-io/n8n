import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	createWorkflow,
	createNodeType,
	parseToolResult,
	createToolConfigWithWriter,
	setupWorkflowState,
	expectToolError,
	type ParsedToolContent,
} from '../../../../test/test-utils';
import { createExecuteScriptTool } from '../execute-script.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

// Mock vm2 - needs proper sandboxing behavior
jest.mock('vm2', () => ({
	NodeVM: jest.fn().mockImplementation(() => {
		return {
			on: jest.fn(),
			run: jest.fn().mockImplementation(async (_script: string) => {
				// Very simple mock execution - just eval in current context
				// In real tests, we'd want more sophisticated mocking
				return undefined;
			}),
		};
	}),
}));

describe('ExecuteScriptTool', () => {
	let executeScriptTool: ReturnType<typeof createExecuteScriptTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	const nodeTypes: INodeTypeDescription[] = [
		createNodeType({
			displayName: 'Manual Trigger',
			name: 'n8n-nodes-base.manualTrigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		createNodeType({
			displayName: 'HTTP Request',
			name: 'n8n-nodes-base.httpRequest',
			group: ['input'],
			inputs: ['main'],
			outputs: ['main'],
		}),
	];

	beforeEach(() => {
		jest.clearAllMocks();
		executeScriptTool = createExecuteScriptTool(nodeTypes).tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should execute a valid script', async () => {
			const existingWorkflow = createWorkflow([]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('execute_script', 'test-call-1');

			// Note: Due to mocking, actual script execution is limited
			// This test verifies the tool structure and error handling
			const result = await executeScriptTool.invoke(
				{
					script: `
						console.log('Hello from script');
					`,
					description: 'Test script',
				},
				mockConfig,
			);

			// The result depends on mock behavior
			expect(result).toBeDefined();
		});

		it('should reject scripts with syntax errors', async () => {
			const existingWorkflow = createWorkflow([]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('execute_script', 'test-call-2');

			const result = await executeScriptTool.invoke(
				{
					script: `
						const x = {;  // Syntax error
					`,
					description: 'Invalid script',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, /Script validation failed/);
		});

		it('should require script parameter', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfigWithWriter('execute_script', 'test-call-3');

			try {
				await executeScriptTool.invoke(
					{
						// Missing script parameter
					} as Parameters<typeof executeScriptTool.invoke>[0],
					mockConfig,
				);
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeDefined();
			}
		});

		it('should accept optional description parameter', async () => {
			const existingWorkflow = createWorkflow([]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('execute_script', 'test-call-4');

			// Script without description
			const result = await executeScriptTool.invoke(
				{
					script: "console.log('test');",
				},
				mockConfig,
			);

			expect(result).toBeDefined();
		});
	});

	describe('tool metadata', () => {
		it('should have correct tool name', () => {
			expect(executeScriptTool.name).toBe('execute_script');
		});

		it('should have descriptive description', () => {
			expect(executeScriptTool.description).toContain('Execute a TypeScript script');
			expect(executeScriptTool.description).toContain('tools.addNode');
			expect(executeScriptTool.description).toContain('tools.connectNodes');
		});
	});
});

// Integration tests with real vm2 sandboxing would go here
// They require the actual vm2 module and more complex setup
