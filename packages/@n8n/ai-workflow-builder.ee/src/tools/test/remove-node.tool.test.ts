import { getCurrentTaskInput } from '@langchain/langgraph';

import {
	createNode,
	createWorkflow,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	setupWorkflowState,
	expectToolSuccess,
	expectToolError,
	expectNodeRemoved,
	createConnection,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createRemoveNodeTool } from '../remove-node.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('RemoveNodeTool', () => {
	let removeNodeTool: ReturnType<typeof createRemoveNodeTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		removeNodeTool = createRemoveNodeTool().tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should remove a node without connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_node', 'test-call-1');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node1');
			expectToolSuccess(content, 'Successfully removed node "Code" (n8n-nodes-base.code)');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();
			expect(startMessage?.updates[0]?.data).toMatchObject({
				nodeId: 'node1',
			});

			const progressMessage = findProgressMessage(progressCalls, 'running', 'progress');
			expect(progressMessage).toBeDefined();
			expect(progressMessage?.updates[0]?.data?.message).toContain('Removing node node1');

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
			expect(completeMessage?.updates[0]?.data).toMatchObject({
				removedNodeId: 'node1',
				removedNodeName: 'Code',
				removedNodeType: 'n8n-nodes-base.code',
				connectionsRemoved: 0,
			});
		});

		it('should remove a node with outgoing connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code' }),
				createNode({ id: 'node2', name: 'HTTP Request' }),
			]);
			// Add connection from node1 to node2
			existingWorkflow.connections = {
				node1: {
					main: [[createConnection('node1', 'node2')]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-2');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node1');
			expectToolSuccess(content, 'Successfully removed node "Code"');
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 1 connection');
		});

		it('should remove a node with incoming connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code' }),
				createNode({ id: 'node2', name: 'HTTP Request' }),
				createNode({ id: 'node3', name: 'Set' }),
			]);
			// Add connections: node1 -> node2, node2 -> node3
			existingWorkflow.connections = {
				node1: {
					main: [[createConnection('node1', 'node2')]],
				},
				node2: {
					main: [[createConnection('node2', 'node3')]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-3');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node2');
			expectToolSuccess(content, 'Successfully removed node "HTTP Request"');
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 2 connections');
		});

		it('should remove a node with multiple connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Webhook' }),
				createNode({ id: 'node2', name: 'If' }),
				createNode({ id: 'node3', name: 'Code1' }),
				createNode({ id: 'node4', name: 'Code2' }),
				createNode({ id: 'node5', name: 'Set' }),
			]);
			// Complex connections: node1 -> node2, node2 has two outputs -> node3 and node4, both converge to node5
			existingWorkflow.connections = {
				node1: {
					main: [[createConnection('node1', 'node2')]],
				},
				node2: {
					main: [
						[createConnection('node2', 'node3')], // true branch
						[createConnection('node2', 'node4')], // false branch
					],
				},
				node3: {
					main: [[createConnection('node3', 'node5')]],
				},
				node4: {
					main: [[createConnection('node4', 'node5')]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-4');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node2');
			expectToolSuccess(content, 'Successfully removed node "If"');
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 3 connections');
		});

		it('should handle removing non-existent node', async () => {
			const existingWorkflow = createWorkflow([createNode({ id: 'node1', name: 'Code' })]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-5');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'non-existent',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node with ID "non-existent" not found in workflow');
		});

		it('should handle removing node with AI connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
				createNode({ id: 'node2', name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({
					id: 'node3',
					name: 'Calculator Tool',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
				}),
			]);
			// AI connections: OpenAI -> Agent, Calculator -> Agent
			existingWorkflow.connections = {
				node1: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					ai_languageModel: [[createConnection('node1', 'node2', 'ai_languageModel')]],
				},
				node3: {
					ai_tool: [[createConnection('node3', 'node2', 'ai_tool')]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-6');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node2');
			expectToolSuccess(content, 'Successfully removed node "AI Agent"');
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 2 connections');
		});

		it('should handle validation errors', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('remove_node', 'test-call-7');

			try {
				await removeNodeTool.invoke(
					{
						// Missing nodeId
					} as Parameters<typeof removeNodeTool.invoke>[0],
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle empty workflow', async () => {
			setupWorkflowState(mockGetCurrentTaskInput, createWorkflow([]));

			const mockConfig = createToolConfig('remove_node', 'test-call-8');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'any-node',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node with ID "any-node" not found in workflow');
		});

		it('should count connections correctly for complex workflows', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Merge' }),
				createNode({ id: 'node2', name: 'Code1' }),
				createNode({ id: 'node3', name: 'Code2' }),
				createNode({ id: 'node4', name: 'Set' }),
			]);
			// Multiple nodes connecting to merge node
			existingWorkflow.connections = {
				node2: {
					main: [[createConnection('node2', 'node1', 'main', 0)]], // to input 0
				},
				node3: {
					main: [[createConnection('node3', 'node1', 'main', 1)]], // to input 1
				},
				node1: {
					main: [[createConnection('node1', 'node4')]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-9');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node1');
			expectToolSuccess(content, 'Successfully removed node "Merge"');
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 3 connections');
		});

		it('should handle node with self-connections', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Loop Node' }),
				createNode({ id: 'node2', name: 'Other Node' }),
			]);
			// Node with self-connection (loop) and external connection
			existingWorkflow.connections = {
				node1: {
					main: [
						[
							createConnection('node1', 'node1'), // self-connection
							createConnection('node1', 'node2'), // external connection
						],
					],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-10');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node1');
			expectToolSuccess(content, 'Successfully removed node "Loop Node"');
			// Should count both self-connection and external connection
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 3 connections');
		});

		it('should handle removing node by exact ID match', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'test-uuid-123', name: 'My Node', type: 'n8n-nodes-base.set' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_node', 'test-call-11');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'test-uuid-123',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'test-uuid-123');
			expectToolSuccess(content, 'Successfully removed node "My Node" (n8n-nodes-base.set)');

			// Verify progress messages contain the exact node ID
			const progressMessage = findProgressMessage(
				extractProgressMessages(mockConfig.writer),
				'running',
				'progress',
			);
			expect(progressMessage?.updates[0]?.data?.message).toBe('Removing node test-uuid-123');
		});

		it('should handle different connection types', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Vector Store',
					type: '@n8n/n8n-nodes-langchain.vectorStore',
				}),
				createNode({
					id: 'node2',
					name: 'Embeddings',
					type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
				}),
				createNode({
					id: 'node3',
					name: 'Document Loader',
					type: '@n8n/n8n-nodes-langchain.documentLoader',
				}),
			]);
			// Mixed connection types
			existingWorkflow.connections = {
				node3: {
					ai_document: [[createConnection('node3', 'node1', 'ai_document')]],
				},
				node2: {
					ai_embedding: [[createConnection('node2', 'node1', 'ai_embedding')]],
				},
			};
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('remove_node', 'test-call-12');

			const result = await removeNodeTool.invoke(
				{
					nodeId: 'node1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectNodeRemoved(content, 'node1');
			expectToolSuccess(content, 'Successfully removed node "Vector Store"');
			expect(content.update.messages[0]?.kwargs.content).toContain('Removed 2 connections');
		});

		it('should return correct output structure', async () => {
			const existingWorkflow = createWorkflow([
				createNode({
					id: 'node-to-remove',
					name: 'Test Node',
					type: 'n8n-nodes-base.httpRequest',
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('remove_node', 'test-call-13');

			await removeNodeTool.invoke(
				{
					nodeId: 'node-to-remove',
				},
				mockConfig,
			);

			// Check the completed progress message has correct output structure
			const completeMessage = findProgressMessage(
				extractProgressMessages(mockConfig.writer),
				'completed',
			);
			expect(completeMessage?.updates[0]?.data).toEqual({
				removedNodeId: 'node-to-remove',
				removedNodeName: 'Test Node',
				removedNodeType: 'n8n-nodes-base.httpRequest',
				connectionsRemoved: 0,
				message: 'Successfully removed node "Test Node" (n8n-nodes-base.httpRequest)',
			});
		});
	});
});
