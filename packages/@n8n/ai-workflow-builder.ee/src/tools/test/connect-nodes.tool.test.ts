import { getCurrentTaskInput } from '@langchain/langgraph';
import type { IConnections, INodeTypeDescription } from 'n8n-workflow';

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
	expectWorkflowOperation,
	buildConnectNodesInput,
	type ParsedToolContent,
	createNodeType,
} from '../../../test/test-utils';
import { createConnectNodesTool } from '../connect-nodes.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('ConnectNodesTool', () => {
	let nodeTypesList: INodeTypeDescription[];
	let connectNodesTool: ReturnType<typeof createConnectNodesTool>['tool'];
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;

	beforeEach(() => {
		jest.clearAllMocks();

		nodeTypesList = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook, nodeTypes.agent];
		connectNodesTool = createConnectNodesTool(nodeTypesList).tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should connect two nodes with main connection', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfigWithWriter('connect_nodes', 'test-call-1');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'mergeConnections');
			const connections = content.update.workflowOperations?.[0]?.connections as IConnections;
			expect(connections).toBeDefined();
			expect(connections?.['Code']).toBeDefined();
			expect(connections?.['Code']?.main).toBeDefined();
			expect(connections?.['Code']?.main?.[0]).toEqual([
				{
					node: 'HTTP Request',
					type: 'main',
					index: 0,
				},
			]);

			expectToolSuccess(content, 'Connected: Code → HTTP Request (main)');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should auto-swap nodes when AI sub-node is specified as target', async () => {
			// Create node types with proper AI connections
			const agentNodeType = createNodeType({
				displayName: 'AI Agent',
				name: '@n8n/n8n-nodes-langchain.agent',
				group: ['output'],
				inputs: ['main', 'ai_tool'],
				outputs: ['main'],
			});

			const toolNodeType = createNodeType({
				displayName: 'Calculator Tool',
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				group: ['output'],
				inputs: [],
				outputs: ['ai_tool'],
			});

			// Update node types list
			nodeTypesList = [nodeTypes.code, nodeTypes.httpRequest, agentNodeType, toolNodeType];
			connectNodesTool = createConnectNodesTool(nodeTypesList).tool;

			const existingWorkflow = createWorkflow([
				createNode({ id: 'agent1', name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				createNode({
					id: 'tool1',
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-2');

			const result = await connectNodesTool.invoke(
				buildConnectNodesInput({
					// Intentionally backwards - tool should be source, agent should be target
					sourceNodeId: 'agent1',
					targetNodeId: 'tool1',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			// The tool should auto-swap and connect Calculator (source) to AI Agent (target)
			expectWorkflowOperation(content, 'mergeConnections');
			const connections = content.update.workflowOperations?.[0]?.connections as IConnections;
			expect(connections).toBeDefined();
			expect(connections?.['Calculator']).toBeDefined();
			expect(connections?.['Calculator']?.ai_tool?.[0]).toEqual([
				{
					node: 'AI Agent',
					type: 'ai_tool',
					index: 0,
				},
			]);

			// Check for swapped message pattern
			expectToolSuccess(content, /Auto-corrected connection: Calculator \(ai_tool\) → AI Agent/);
		});

		it('should connect AI sub-nodes with proper connection type', async () => {
			// Update the agent node type to accept ai_languageModel input
			const agentNodeType = createNodeType({
				displayName: 'AI Agent',
				name: '@n8n/n8n-nodes-langchain.agent',
				group: ['output'],
				inputs: ['main', 'ai_languageModel'],
				outputs: ['main'],
			});

			// Add language model node type
			const languageModelNodeType = createNodeType({
				displayName: 'OpenAI Chat Model',
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				group: ['output'],
				inputs: [],
				outputs: ['ai_languageModel'],
			});

			// Replace the agent node type in the list
			nodeTypesList = nodeTypesList.filter((nt) => nt.name !== '@n8n/n8n-nodes-langchain.agent');
			nodeTypesList.push(agentNodeType, languageModelNodeType);
			connectNodesTool = createConnectNodesTool(nodeTypesList).tool;

			const existingWorkflow = createWorkflow([
				createNode({
					id: 'agent1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				}),
				createNode({
					id: 'model1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-3');

			const result = await connectNodesTool.invoke(
				buildConnectNodesInput({
					sourceNodeId: 'model1',
					targetNodeId: 'agent1',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectWorkflowOperation(content, 'mergeConnections');
			const connections = content.update.workflowOperations?.[0]?.connections as IConnections;
			expect(connections).toBeDefined();
			expect(connections?.['OpenAI Model']).toBeDefined();
			expect(connections?.['OpenAI Model']?.ai_languageModel).toBeDefined();
			expect(connections?.['OpenAI Model']?.ai_languageModel?.[0]).toEqual([
				{
					node: 'AI Agent',
					type: 'ai_languageModel',
					index: 0,
				},
			]);

			expectToolSuccess(content, 'Connected: OpenAI Model → AI Agent (ai_languageModel)');
		});

		it('should handle custom source and target indices', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Multi Output', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'Multi Input', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-4');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
					sourceOutputIndex: 1,
					targetInputIndex: 2,
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			const connections = content.update.workflowOperations?.[0]?.connections as IConnections;
			expect(connections?.['Multi Output']).toBeDefined();
			expect(connections?.['Multi Output']?.main?.[1]).toEqual([
				{
					node: 'Multi Input',
					type: 'main',
					index: 2,
				},
			]);
		});

		it('should handle validation errors for missing required fields', async () => {
			setupWorkflowState(mockGetCurrentTaskInput);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-5');

			try {
				await connectNodesTool.invoke(
					{
						sourceNodeId: 'node1',
						// Missing targetNodeId
					} as Parameters<typeof connectNodesTool.invoke>[0],
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle non-existent source node', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-6');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'nonexistent',
					targetNodeId: 'node1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node with ID "nonexistent" not found in workflow');
		});

		it('should handle non-existent target node', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-7');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'nonexistent',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node with ID "nonexistent" not found in workflow');
		});

		it('should handle invalid connection between incompatible nodes', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'webhook1', name: 'Webhook 1', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: 'webhook2', name: 'Webhook 2', type: 'n8n-nodes-base.webhook' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-8');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'webhook1',
					targetNodeId: 'webhook2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			// Both webhooks are triggers, so they can't be connected
			expectToolError(content, /Error: No compatible connection types found between/);
		});

		it('should detect existing connection and handle gracefully', async () => {
			const existingWorkflow = createWorkflow([
				createNode({ id: 'node1', name: 'Code', type: 'n8n-nodes-base.code' }),
				createNode({ id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			]);

			// Add existing connection
			existingWorkflow.connections = {
				node1: {
					main: [[{ node: 'node2', type: 'main', index: 0 }]],
				},
			};

			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-9');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'node1',
					targetNodeId: 'node2',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			// Should still succeed even if connection already exists
			expectToolSuccess(content, 'Connected: Code → HTTP Request (main)');
		});

		it('should handle multiple output types and pick the right one', async () => {
			// Create a node type with multiple output types
			const multiOutputNode = createNodeType({
				displayName: 'Multi Output',
				name: 'test.multiOutput',
				outputs: ['main', 'ai_tool'],
			});

			nodeTypesList.push(multiOutputNode);
			connectNodesTool = createConnectNodesTool(nodeTypesList).tool;

			const existingWorkflow = createWorkflow([
				createNode({ id: 'multi1', name: 'Multi Output', type: 'test.multiOutput' }),
				createNode({ id: 'code1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);
			setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);

			const mockConfig = createToolConfig('connect_nodes', 'test-call-10');

			const result = await connectNodesTool.invoke(
				{
					sourceNodeId: 'multi1',
					targetNodeId: 'code1',
				},
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			// Should pick 'main' connection type since Code node accepts 'main'
			expectToolSuccess(content, 'Connected: Multi Output → Code (main)');
		});
	});
});
