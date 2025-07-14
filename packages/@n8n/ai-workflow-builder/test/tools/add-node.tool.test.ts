import type { ToolRunnableConfig } from '@langchain/core/tools';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createAddNodeTool } from '../../src/tools/add-node.tool';
import { createNode, createWorkflow, nodeTypes } from '../test-utils';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params) => params),
}));

// Mock crypto module
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
			// Given existing Code node
			const existingWorkflow = createWorkflow([createNode({ id: 'existing', name: 'Code' })]);
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: existingWorkflow,
			});

			const mockWriter = jest.fn();
			const mockConfig: ToolRunnableConfig & LangGraphRunnableConfig = {
				toolCall: { id: 'test-call-1', name: 'add_nodes', args: {} },
				writer: mockWriter,
			};

			// When adding another Code node with custom name
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.code',
					name: 'Process Data',
					connectionParametersReasoning:
						'Code node has static inputs/outputs, no connection parameters needed',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result - it comes wrapped in a ToolMessage
			const content = JSON.parse(result.content);

			// The tool should use the custom name "Process Data"
			expect(content.update.workflowOperations[0]).toMatchObject({
				type: 'addNodes',
				nodes: [
					expect.objectContaining({
						name: 'Process Data', // Uses custom name, not Code1
						type: 'n8n-nodes-base.code',
						parameters: {},
					}),
				],
			});

			// Check node has valid ID and position
			const addedNode = content.update.workflowOperations[0].nodes[0];
			expect(addedNode.id).toBeDefined();
			expect(typeof addedNode.id).toBe('string');
			expect(addedNode.position).toEqual(expect.any(Array));
			expect(addedNode.position.length).toBe(2);

			// Verify the message content
			expect(content.update.messages[0].kwargs.content).toContain(
				'Successfully added "Process Data"',
			);

			// Verify progress was reported via writer
			expect(mockWriter).toHaveBeenCalled();

			// Check that start, progress, and complete messages were sent
			const progressCalls = mockWriter.mock.calls.map((call) => call[0]);

			// Should have at least 3 calls: start, progress, complete
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			// Check start message
			const startMessage = progressCalls.find(
				(msg) => msg.status === 'running' && msg.updates[0].type === 'input',
			);
			expect(startMessage).toBeDefined();
			expect(startMessage.updates[0].data).toMatchObject({
				nodeType: 'n8n-nodes-base.code',
				name: 'Process Data',
			});

			// Check progress message
			const progressMessage = progressCalls.find(
				(msg) => msg.status === 'running' && msg.updates[0].type === 'progress',
			);
			expect(progressMessage).toBeDefined();

			// Check complete message
			const completeMessage = progressCalls.find((msg) => msg.status === 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should generate unique name when no custom name provided', async () => {
			// Given existing Code node
			const existingWorkflow = createWorkflow([createNode({ id: 'existing', name: 'Code' })]);
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: existingWorkflow,
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-1b', name: 'add_nodes', args: {} },
			};

			// When adding Code node without custom name (using default)
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.code',
					name: 'Code',
					connectionParametersReasoning: 'Code node has static inputs/outputs',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Should generate Code1 since Code exists
			expect(content.update.workflowOperations[0].nodes[0].name).toBe('Code1');
		});

		it('should handle connection parameters for AI nodes', async () => {
			// Given empty workflow
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: createWorkflow([]),
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-2', name: 'add_nodes', args: {} },
			};

			// When adding AI Agent with output parser
			const result = await addNodeTool.invoke(
				{
					nodeType: '@n8n/n8n-nodes-langchain.agent',
					name: 'AI Assistant',
					connectionParametersReasoning:
						'AI Agent has dynamic inputs, setting hasOutputParser:true to enable output parser connections',
					connectionParameters: { hasOutputParser: true },
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should include connection parameters
			expect(content.update.workflowOperations[0]).toMatchObject({
				type: 'addNodes',
				nodes: [
					expect.objectContaining({
						name: 'AI Assistant',
						type: '@n8n/n8n-nodes-langchain.agent',
						parameters: { hasOutputParser: true },
					}),
				],
			});
		});

		it('should handle validation errors', async () => {
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: createWorkflow([]),
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-3', name: 'add_nodes', args: {} },
			};

			// When invoking with invalid input (missing required fields)
			try {
				await addNodeTool.invoke(
					{
						nodeType: 'n8n-nodes-base.code',
						// Missing: name, connectionParametersReasoning, connectionParameters
					} as any,
					mockConfig,
				);

				// Should not reach here
				expect(true).toBe(false);
			} catch (error) {
				// Then it should throw validation error
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle unknown node type', async () => {
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: createWorkflow([]),
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-4', name: 'add_nodes', args: {} },
			};

			// When adding unknown node type
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.unknown',
					name: 'Unknown Node',
					connectionParametersReasoning: 'Testing unknown node',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should return error
			expect(content.update.messages[0].kwargs.content).toBe(
				'Error: Node type "n8n-nodes-base.unknown" not found',
			);

			// Note: Progress reporter is not called on errors in the current implementation
			// The error is returned directly via the response
		});

		it('should calculate correct position for nodes', async () => {
			// Given workflow with existing nodes
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', position: [100, 100] }),
				createNode({ id: 'node2', position: [300, 100] }),
			]);
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: existingWorkflow,
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-5', name: 'add_nodes', args: {} },
			};

			// When adding a new node
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.httpRequest',
					name: 'Fetch Data',
					connectionParametersReasoning: 'HTTP Request has static inputs/outputs',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should calculate position to the right of existing nodes
			const addedNode = content.update.workflowOperations[0].nodes[0];
			expect(addedNode.position).toBeDefined();
			expect(addedNode.position[0]).toBeGreaterThan(300); // Should be to the right of existing nodes
		});

		it('should handle webhook nodes with special properties', async () => {
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: createWorkflow([]),
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-6', name: 'add_nodes', args: {} },
			};

			// When adding webhook node
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.webhook',
					name: 'Incoming Webhook',
					connectionParametersReasoning:
						'Webhook is a trigger node, no connection parameters needed',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should have webhook-specific properties
			const addedNode = content.update.workflowOperations[0].nodes[0];
			expect(addedNode.type).toBe('n8n-nodes-base.webhook');
			expect(addedNode.webhookId).toBeDefined();
			expect(typeof addedNode.webhookId).toBe('string');
		});

		it('should use custom name instead of default name', async () => {
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: createWorkflow([]),
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-7', name: 'add_nodes', args: {} },
			};

			// When adding node with custom name
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.code',
					name: 'My Custom Code Node',
					connectionParametersReasoning: 'Standard code node',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should use the custom name
			const addedNode = content.update.workflowOperations[0].nodes[0];
			expect(addedNode.name).toBe('My Custom Code Node');
		});

		it('should generate unique names when adding multiple nodes of same type', async () => {
			// Given workflow with Code and Code1
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code' }),
				createNode({ id: 'node2', name: 'Code1' }),
			]);
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: existingWorkflow,
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-8', name: 'add_nodes', args: {} },
			};

			// When adding another Code node with base name
			const result = await addNodeTool.invoke(
				{
					nodeType: 'n8n-nodes-base.code',
					name: 'Code',
					connectionParametersReasoning: 'Standard code node',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should generate Code2
			const addedNode = content.update.workflowOperations[0].nodes[0];
			expect(addedNode.name).toBe('Code2');
		});

		it('should handle sub-nodes positioning differently', async () => {
			// Given workflow with regular nodes
			const existingWorkflow = createWorkflow([createNode({ id: 'node1', position: [100, 100] })]);
			mockGetCurrentTaskInput.mockReturnValue({
				workflowJSON: existingWorkflow,
			});

			const mockConfig: ToolRunnableConfig = {
				toolCall: { id: 'test-call-9', name: 'add_nodes', args: {} },
			};

			// When adding agent node (which is a sub-node)
			const result = await addNodeTool.invoke(
				{
					nodeType: '@n8n/n8n-nodes-langchain.agent',
					name: 'AI Agent',
					connectionParametersReasoning: 'Agent node for AI processing',
					connectionParameters: {},
				},
				mockConfig,
			);

			// Parse the result
			const content = JSON.parse(result.content);

			// Then it should position below main nodes
			const addedNode = content.update.workflowOperations[0].nodes[0];
			expect(addedNode.position[1]).toBeGreaterThan(100); // Should be below main nodes
		});
	});
});
