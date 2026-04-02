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
import { createRemoveConnectionTool } from '../remove-connection.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('RemoveConnectionTool', () => {
	let removeConnectionTool: ReturnType<typeof createRemoveConnectionTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		removeConnectionTool = createRemoveConnectionTool().tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should remove a main connection between two nodes', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// Add existing connection
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

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-1');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					connectionType: 'main',
					sourceOutputIndex: 0,
					targetInputIndex: 0,
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'removeConnection');
			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				type: 'removeConnection',
				sourceNode: 'Code',
				targetNode: 'HTTP Request',
				connectionType: 'main',
				sourceOutputIndex: 0,
				targetInputIndex: 0,
			});

			expectToolSuccess(content, 'Successfully removed connection: Code → HTTP Request (main)');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should remove AI connection (ai_languageModel) between model and agent', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'model1',
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
				createNode({ id: 'agent1', name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			]);

			// Add existing AI connection
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

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-2');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'model1',
					targetNodeId: 'agent1',
					connectionType: 'ai_languageModel',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'removeConnection');
			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				type: 'removeConnection',
				sourceNode: 'OpenAI Chat Model',
				targetNode: 'AI Agent',
				connectionType: 'ai_languageModel',
			});

			expectToolSuccess(
				content,
				'Successfully removed connection: OpenAI Chat Model → AI Agent (ai_languageModel)',
			);
		});

		it('should remove connection at specific output/input indices', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'If', type: 'n8n-nodes-base.if' }),
				createNode({ id: 'node2', name: 'Set', type: 'n8n-nodes-base.set' }),
			]);

			// Add connection at output index 1 (false branch)
			existingWorkflow.connections = {
				If: {
					main: [
						[], // Output 0 (true branch) - empty
						[
							{
								node: 'Set',
								type: 'main',
								index: 0,
							},
						], // Output 1 (false branch)
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-3');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					connectionType: 'main',
					sourceOutputIndex: 1,
					targetInputIndex: 0,
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'removeConnection');
			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				sourceOutputIndex: 1,
				targetInputIndex: 0,
			});

			expectToolSuccess(content, /Output index: 1, Input index: 0/);
		});

		it('should handle removing one connection when multiple exist', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'Set 1', type: 'n8n-nodes-base.set' }),
				createNode({ id: 'node3', name: 'Set 2', type: 'n8n-nodes-base.set' }),
			]);

			// Add multiple connections from same source
			existingWorkflow.connections = {
				Code: {
					main: [
						[
							{
								node: 'Set 1',
								type: 'main',
								index: 0,
							},
							{
								node: 'Set 2',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-4');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2', // Remove only connection to Set 1
					connectionType: 'main',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'removeConnection');
			expectToolSuccess(content, 'Successfully removed connection: Code → Set 1 (main)');

			const operation = content.update.workflowOperations?.[0];
			expect(operation).toMatchObject({
				type: 'removeConnection',
				sourceNode: 'Code',
				targetNode: 'Set 1',
				connectionType: 'main',
			});
		});

		it('should return error when source node not found', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-5');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'nonexistent',
					targetNodeId: 'node2',
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

		it('should return error when target node not found', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-6');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'nonexistent',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /not found/);
		});

		it('should return error when source node has no connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// No connections at all
			existingWorkflow.connections = {};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-7');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /has no outgoing connections/);
		});

		it('should return error when connection type does not exist', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// Only main connections exist
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

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-8');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					connectionType: 'ai_languageModel', // Wrong type
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /has no connections of type "ai_languageModel"/);
		});

		it('should return error when output index does not exist', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

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

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-9');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					connectionType: 'main',
					sourceOutputIndex: 5, // Out of range
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /has no connections at output index 5/);
		});

		it('should return error when specific connection does not exist', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
				createNode({ id: 'node3', name: 'Set', type: 'n8n-nodes-base.set' }),
			]);

			// Connection exists, but to a different node
			existingWorkflow.connections = {
				Code: {
					main: [
						[
							{
								node: 'Set', // Connected to Set, not HTTP Request
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-10');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2', // Trying to remove connection to HTTP Request
					connectionType: 'main',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /Connection not found/);
		});

		it('should default connectionType to "main" when not specified', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

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

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-11');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					// connectionType omitted - should default to 'main'
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'removeConnection');
			const operation = content.update.workflowOperations?.[0];
			expect(operation?.connectionType).toBe('main');
		});

		it('should default indices to 0 when not specified', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

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

			const mockConfig = createToolConfigWithWriter('remove_connection', 'test-call-12');

			const result = await removeConnectionTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					// indices omitted - should default to 0
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'removeConnection');
			const operation = content.update.workflowOperations?.[0];
			expect(operation?.sourceOutputIndex).toBe(0);
			expect(operation?.targetInputIndex).toBe(0);
		});
	});
});
