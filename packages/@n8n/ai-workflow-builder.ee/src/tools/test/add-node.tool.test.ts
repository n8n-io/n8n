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
	let addNodeTool: ReturnType<typeof createAddNodeTool>;
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();

		nodeTypesList = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook, nodeTypes.agent];
		addNodeTool = createAddNodeTool(nodeTypesList);
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
					connectionParametersReasoning: REASONING.STATIC_NODE,
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
					connectionParametersReasoning:
						REASONING.DYNAMIC_AI_NODE + ', setting hasOutputParser:true',
					connectionParameters: { hasOutputParser: true },
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
					connectionParametersReasoning: 'Testing unknown node',
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
					connectionParametersReasoning: REASONING.WEBHOOK_NODE,
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
					connectionParametersReasoning: 'Agent node for AI processing',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const addedNode = content.update.workflowOperations?.[0]?.nodes?.[0];
			expect(addedNode?.position?.[1]).toBeGreaterThan(100);
		});
	});
});
