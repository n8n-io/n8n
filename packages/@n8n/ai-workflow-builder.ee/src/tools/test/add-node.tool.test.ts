import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription, INode } from 'n8n-workflow';

import {
	createNode,
	createWorkflow,
	nodeTypes,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	setupWorkflowState,
	expectToolSuccess,
	expectToolError,
	expectNodeAdded,
	buildAddNodeInput,
	REASONING,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createAddNodeTool } from '../add-node.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		// Transform the Command params to match what the test expects
		content: JSON.stringify(params),
	})),
}));

// Mock crypto module
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomUUID: jest.fn().mockReturnValue('test-uuid-123'),
}));

describe('AddNodeTool', () => {
	let nodeTypesList: INodeTypeDescription[];
	let addNodeTool: ReturnType<typeof createAddNodeTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();

		nodeTypesList = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook, nodeTypes.agent];
		addNodeTool = createAddNodeTool(nodeTypesList).tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should add a node with custom name', async () => {
			const existingWorkflow = createWorkflow([createNode({ id: 'existing', name: 'Code' })]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('add_nodes', 'test-call-1');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.code',
					name: 'Process Data',
					initialParametersReasoning: REASONING.STATIC_NODE,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeAdded(content, {
				name: 'Process Data',
				type: 'n8n-nodes-base.code',
				parameters: {},
			});

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.id).toBeDefined();
			expect(typeof addedNode?.id).toBe('string');
			expect(addedNode?.position).toEqual(expect.any(Array));
			expect(addedNode?.position?.length).toBe(2);

			expectToolSuccess(content, 'Successfully added "Process Data"');

			expect(mockConfig.writer).toHaveBeenCalled();

			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();
			expect(startMessage?.updates[0]?.data).toMatchObject({
				nodeType: 'n8n-nodes-base.code',
				name: 'Process Data',
			});

			const progressMessage = findProgressMessage(progressCalls, 'running', 'progress');
			expect(progressMessage).toBeDefined();

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should generate unique name when no custom name provided', async () => {
			const existingWorkflow = createWorkflow([createNode({ id: 'existing', name: 'Code' })]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('add_nodes', 'test-call-1b');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.code',
					name: 'Code',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expect(content.update.workflowOperations?.[0]?.nodes?.[0]?.name).toBe('Code1');
		});

		it('should handle connection parameters for AI nodes', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-2');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: '@n8n/n8n-nodes-langchain.agent',
					name: 'AI Assistant',
					initialParametersReasoning: REASONING.DYNAMIC_AI_NODE + ', setting hasOutputParser:true',
					initialParameters: { hasOutputParser: true },
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeAdded(content, {
				name: 'AI Assistant',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: { hasOutputParser: true },
			});
		});

		it('should handle validation errors', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-3');

			try {
				await addNodeTool.invoke(
					{
						nodeType: 'n8n-nodes-base.code',
					} as Parameters<typeof addNodeTool.invoke>[0],
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle unknown node type', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-4');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.unknown',
					name: 'Unknown Node',
					initialParametersReasoning: 'Testing unknown node',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node type "n8n-nodes-base.unknown" not found');
		});

		it('should calculate correct position for nodes', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', position: [100, 100] }),
				createNode({ id: 'node2', position: [300, 100] }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('add_nodes', 'test-call-5');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.httpRequest',
					name: 'Fetch Data',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.position).toBeDefined();
			expect(addedNode?.position?.[0]).toBeGreaterThan(300);
		});

		it('should handle webhook nodes with special properties', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-6');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.webhook',
					name: 'Incoming Webhook',
					initialParametersReasoning: REASONING.WEBHOOK_NODE,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0] as INode & {
				webhookId?: string;
			};
			expect(addedNode?.type).toBe('n8n-nodes-base.webhook');
			expect(addedNode?.webhookId).toBeDefined();
			expect(typeof addedNode?.webhookId).toBe('string');
		});

		it('should use custom name instead of default name', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-7');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.code',
					name: 'My Custom Code Node',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.name).toBe('My Custom Code Node');
		});

		it('should generate unique names when adding multiple nodes of same type', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code' }),
				createNode({ id: 'node2', name: 'Code1' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('add_nodes', 'test-call-8');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.code',
					name: 'Code',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.name).toBe('Code2');
		});

		it('should handle sub-nodes positioning differently', async () => {
			const existingWorkflow = createWorkflow([createNode({ id: 'node1', position: [100, 100] })]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('add_nodes', 'test-call-9');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: '@n8n/n8n-nodes-langchain.agent',
					name: 'AI Agent',
					initialParametersReasoning: 'Agent node for AI processing',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.position?.[1]).toBeGreaterThan(100);
		});

		it('should add the correct node version when multiple versions exist', async () => {
			// Create multiple versions of the same node type
			const httpRequestV1 = {
				...nodeTypes.httpRequest,
				version: 1,
				displayName: 'HTTP Request V1',
			};
			const httpRequestV2 = {
				...nodeTypes.httpRequest,
				version: 2,
				displayName: 'HTTP Request V2',
			};
			const httpRequestV3 = {
				...nodeTypes.httpRequest,
				version: 3,
				displayName: 'HTTP Request V3',
			};

			const toolWithMultipleVersions = createAddNodeTool([
				httpRequestV1,
				httpRequestV2,
				httpRequestV3,
				nodeTypes.code,
			]).tool;

			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-10');

			// Request version 2 specifically
			const result = await toolWithMultipleVersions.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeVersion: 2,
					name: 'HTTP Request V2',
					initialParametersReasoning: 'Need version 2 for specific features',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeAdded(content, {
				name: 'HTTP Request V2',
				type: 'n8n-nodes-base.httpRequest',
			});

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.typeVersion).toBe(2);
			expectToolSuccess(content, 'Successfully added "HTTP Request V2"');
		});

		it('should fail when requesting a non-existent node version', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-11');

			const result = await addNodeTool.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.code',
					nodeVersion: 99, // Non-existent version
					name: 'Code V99',
					initialParametersReasoning: 'Requesting non-existent version',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node type "n8n-nodes-base.code" not found');
		});

		it('should add correct version from array version node type', async () => {
			// Create a node type that supports multiple versions in an array
			const multiVersionNode = {
				...nodeTypes.code,
				name: 'n8n-nodes-base.multiVersionCode',
				displayName: 'Multi Version Code',
				version: [1, 2, 3],
				properties: [
					{
						displayName: 'Code',
						name: 'code',
						type: 'string',
						default: '',
					},
				],
			} as INodeTypeDescription;

			const toolWithArrayVersion = createAddNodeTool([
				multiVersionNode,
				nodeTypes.httpRequest,
			]).tool;

			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-12');

			// Request version 2 from the array [1, 2, 3]
			const result = await toolWithArrayVersion.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.multiVersionCode',
					nodeVersion: 2,
					name: 'Multi Version Code V2',
					initialParametersReasoning: 'Need version 2 from array versions',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeAdded(content, {
				name: 'Multi Version Code V2',
				type: 'n8n-nodes-base.multiVersionCode',
			});

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.typeVersion).toBe(2);
			expectToolSuccess(content, 'Successfully added "Multi Version Code V2"');
		});

		it('should fail when requesting version not in array version node type', async () => {
			// Create a node type that supports versions [1, 2, 3]
			const multiVersionNode = {
				...nodeTypes.code,
				name: 'n8n-nodes-base.multiVersionCode',
				displayName: 'Multi Version Code',
				version: [1, 2, 3],
			} as INodeTypeDescription;

			const toolWithArrayVersion = createAddNodeTool([multiVersionNode]).tool;

			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('add_nodes', 'test-call-13');

			// Request version 4 which is not in the array [1, 2, 3]
			const result = await toolWithArrayVersion.invoke(
				buildAddNodeInput({
					nodeType: 'n8n-nodes-base.multiVersionCode',
					nodeVersion: 4,
					name: 'Multi Version Code V4',
					initialParametersReasoning: 'Requesting version not in array',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node type "n8n-nodes-base.multiVersionCode" not found');
		});
	});

	describe('getCustomDisplayTitle', () => {
		it('should return node display name when nodeType exists', () => {
			const tool = createAddNodeTool(nodeTypesList);
			const result = tool.getCustomDisplayTitle?.({
				nodeType: 'n8n-nodes-base.code',
				name: 'My Code',
			});

			expect(result).toBe('Adding Code node');
		});

		it('should return default title when nodeType not found or missing', () => {
			const tool = createAddNodeTool(nodeTypesList);

			expect(tool.getCustomDisplayTitle?.({ nodeType: 'unknown.node' })).toBe('Adding node');
			expect(tool.getCustomDisplayTitle?.({ name: 'Some Node' })).toBe('Adding node');
		});
	});
});
