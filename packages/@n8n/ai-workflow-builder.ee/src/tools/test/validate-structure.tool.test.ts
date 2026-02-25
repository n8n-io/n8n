import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	createWorkflow,
	createNode,
	nodeTypes,
	parseToolResult,
	createToolConfig,
	setupWorkflowState,
	expectToolSuccess,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createValidateStructureTool, VALIDATE_STRUCTURE_TOOL } from '../validate-structure.tool';

jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('validateStructure tool', () => {
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;
	let parsedNodeTypes: INodeTypeDescription[];
	let validateStructureTool: ReturnType<typeof createValidateStructureTool>['tool'];

	beforeEach(() => {
		jest.clearAllMocks();
		parsedNodeTypes = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook];
		validateStructureTool = createValidateStructureTool(parsedNodeTypes).tool;
	});

	it('should have correct tool metadata', () => {
		expect(VALIDATE_STRUCTURE_TOOL.toolName).toBe('validate_structure');
		expect(VALIDATE_STRUCTURE_TOOL.displayTitle).toBe('Validating structure');
	});

	it('should return valid when workflow has trigger and proper connections', async () => {
		const workflow = createWorkflow([
			createNode({ id: 'webhook1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
		]);
		workflow.connections = {
			Webhook: {
				main: [[{ node: 'Code', type: 'main', index: 0 }]],
			},
		};

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_structure', 'call-1');

		const result = await validateStructureTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolSuccess(content, 'Workflow structure is valid');
	});

	it('should report missing trigger node', async () => {
		const workflow = createWorkflow([
			createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
		]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_structure', 'call-2');

		const result = await validateStructureTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolSuccess(content, 'structure issues');
		expect(content.update.messages[0].kwargs.content).toContain('trigger');
	});

	it('should report connection issues', async () => {
		const workflow = createWorkflow([
			createNode({ id: 'webhook1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			createNode({ id: 'http1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
		]);
		// HTTP Request has no incoming connection (missing required input)

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_structure', 'call-3');

		const result = await validateStructureTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		// Should report the disconnected node
		expectToolSuccess(content, 'structure issues');
	});

	it('should handle empty workflow', async () => {
		const workflow = createWorkflow([]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_structure', 'call-4');

		const result = await validateStructureTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		// Empty workflow is valid structurally (no violations)
		expectToolSuccess(content, 'valid');
	});

	it('should allow multiple trigger nodes', async () => {
		const workflow = createWorkflow([
			createNode({ id: 'webhook1', name: 'Webhook 1', type: 'n8n-nodes-base.webhook' }),
			createNode({ id: 'webhook2', name: 'Webhook 2', type: 'n8n-nodes-base.webhook' }),
		]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_structure', 'call-5');

		const result = await validateStructureTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		// Multiple triggers are valid
		expectToolSuccess(content, 'valid');
	});

	it('should recognize connections from error output (output index 1)', async () => {
		// This test verifies that nodes connected to error output (index 1) are recognized
		// as having required input - reproduces issue where validation incorrectly reported
		// "missing required input" for nodes connected to error branch
		const workflow = createWorkflow([
			createNode({ id: 'webhook1', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			createNode({
				id: 'http1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				onError: 'continueErrorOutput',
			}),
			createNode({ id: 'code1', name: 'Success Handler', type: 'n8n-nodes-base.code' }),
			createNode({ id: 'code2', name: 'Error Handler', type: 'n8n-nodes-base.code' }),
		]);
		workflow.connections = {
			Webhook: {
				main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
			},
			// HTTP Request with continueErrorOutput has 2 outputs:
			// output 0 = success, output 1 = error
			'HTTP Request': {
				main: [
					[{ node: 'Success Handler', type: 'main', index: 0 }], // output 0 -> success
					[{ node: 'Error Handler', type: 'main', index: 0 }], // output 1 -> error
				],
			},
		};

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_structure', 'call-6');

		const result = await validateStructureTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		// Both Success Handler and Error Handler should be recognized as having connections
		// Validation should pass - no "missing required input" errors
		expectToolSuccess(content, 'valid');
		expect(content.update.messages[0].kwargs.content).not.toContain('Error Handler');
		expect(content.update.messages[0].kwargs.content).not.toContain('missing required input');
	});
});
