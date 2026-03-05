import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	setupWorkflowState,
	expectToolSuccess,
	expectToolError,
	expectWorkflowOperation,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createRenameNodeTool } from '../rename-node.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('RenameNodeTool', () => {
	let renameNodeTool: ReturnType<typeof createRenameNodeTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		renameNodeTool = createRenameNodeTool().tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should rename a node successfully', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-1');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node1',
					newName: 'Process Data',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'renameNode');
			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				type: 'renameNode',
				nodeId: 'node1',
				oldName: 'Code',
				newName: 'Process Data',
			});

			expectToolSuccess(content, 'Successfully renamed node from "Code" to "Process Data"');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should rename a node that has outgoing connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// Add connection where the renamed node is the source
			existingWorkflow.connections = {
				Code: {
					main: [
						[
							{
								node: 'HTTP Request',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-2');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node1',
					newName: 'Process Data',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'renameNode');
			expectToolSuccess(content, 'Successfully renamed node from "Code" to "Process Data"');
		});

		it('should rename a node that has incoming connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// Add connection where the renamed node is the target
			existingWorkflow.connections = {
				Code: {
					main: [
						[
							{
								node: 'HTTP Request',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-3');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node2',
					newName: 'Send Request',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'renameNode');
			expectToolSuccess(content, 'Successfully renamed node from "HTTP Request" to "Send Request"');
		});

		it('should rename an AI node', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'model1',
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
				createNode({ id: 'agent1', name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			]);

			// Add AI connection
			existingWorkflow.connections = {
				'OpenAI Chat Model': {
					ai_languageModel: [
						[
							{
								node: 'AI Agent',
								type: 'ai_languageModel',
								index: 0,
							},
						],
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-4');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'model1',
					newName: 'GPT-4 Model',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'renameNode');
			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				type: 'renameNode',
				nodeId: 'model1',
				oldName: 'OpenAI Chat Model',
				newName: 'GPT-4 Model',
			});

			expectToolSuccess(
				content,
				'Successfully renamed node from "OpenAI Chat Model" to "GPT-4 Model"',
			);
		});

		it('should return error when node not found', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-5');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'nonexistent',
					newName: 'New Name',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /not found/);

			// Check error was reported
			const progressCalls = extractProgressMessages(mockConfig.writer);
			const errorMessage = findProgressMessage(progressCalls, 'error');
			expect(errorMessage).toBeDefined();
		});

		it('should return error when new name is the same as current name', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-6');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node1',
					newName: 'Code',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /already has this name/);
		});

		it('should return error when new name conflicts with existing node', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-7');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node1',
					newName: 'HTTP Request', // Conflicts with existing node
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /already exists/);
		});

		it('should throw error when new name is empty', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-8');

			// Zod schema validation happens at LangChain level, so it throws before our code runs
			await expect(
				renameNodeTool.invoke(
					{
						nodeId: 'node1',
						newName: '',
					},
					mockConfig,
				),
			).rejects.toThrow(/String must contain at least 1 character/);
		});

		it('should handle node with no connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			// Empty connections
			existingWorkflow.connections = {};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-9');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node1',
					newName: 'My Custom Code',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'renameNode');
			expectToolSuccess(content, 'Successfully renamed node from "Code" to "My Custom Code"');
		});

		it('should handle renaming a node that is both source and target of connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Trigger', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'node2', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node3', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// Code is both a target (from Trigger) and source (to HTTP Request)
			existingWorkflow.connections = {
				Trigger: {
					main: [
						[
							{
								node: 'Code',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				Code: {
					main: [
						[
							{
								node: 'HTTP Request',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('rename_node', 'test-call-10');

			const result = await renameNodeTool.invoke(
				{
					nodeId: 'node2',
					newName: 'Transform Data',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'renameNode');
			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				type: 'renameNode',
				nodeId: 'node2',
				oldName: 'Code',
				newName: 'Transform Data',
			});

			expectToolSuccess(content, 'Successfully renamed node from "Code" to "Transform Data"');
		});
	});
});
