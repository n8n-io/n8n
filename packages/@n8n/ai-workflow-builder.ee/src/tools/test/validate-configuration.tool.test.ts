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
import {
	createValidateConfigurationTool,
	VALIDATE_CONFIGURATION_TOOL,
} from '../validate-configuration.tool';

jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('validateConfiguration tool', () => {
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;
	let parsedNodeTypes: INodeTypeDescription[];
	let validateConfigurationTool: ReturnType<typeof createValidateConfigurationTool>['tool'];

	beforeEach(() => {
		jest.clearAllMocks();
		parsedNodeTypes = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook, nodeTypes.agent];
		validateConfigurationTool = createValidateConfigurationTool(parsedNodeTypes).tool;
	});

	it('should have correct tool metadata', () => {
		expect(VALIDATE_CONFIGURATION_TOOL.toolName).toBe('validate_configuration');
		expect(VALIDATE_CONFIGURATION_TOOL.displayTitle).toBe('Validating configuration');
	});

	it('should return valid for simple workflow without AI nodes', async () => {
		const workflow = createWorkflow([
			createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
		]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_configuration', 'call-1');

		const result = await validateConfigurationTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolSuccess(content, 'Configuration is valid');
	});

	it('should handle empty workflow', async () => {
		const workflow = createWorkflow([]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_configuration', 'call-2');

		const result = await validateConfigurationTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		// Empty workflow has no configuration issues
		expectToolSuccess(content, 'valid');
	});

	it('should validate workflow with multiple nodes', async () => {
		const workflow = createWorkflow([
			createNode({
				id: 'webhook1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { path: 'test-webhook' },
			}),
			createNode({
				id: 'http1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://api.example.com', method: 'POST' },
			}),
			createNode({
				id: 'code1',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters: { jsCode: 'return items;' },
			}),
		]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_configuration', 'call-3');

		const result = await validateConfigurationTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolSuccess(content, 'valid');
	});

	it('should return configuration validation results in state update', async () => {
		const workflow = createWorkflow([
			createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
		]);

		setupWorkflowState(mockGetCurrentTaskInput, workflow);
		const config = createToolConfig('validate_configuration', 'call-4');

		const result = await validateConfigurationTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		// Should have validation results in the update
		expect(content.update).toBeDefined();
		expect(content.update.messages).toBeDefined();
	});
});
