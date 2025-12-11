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
});
