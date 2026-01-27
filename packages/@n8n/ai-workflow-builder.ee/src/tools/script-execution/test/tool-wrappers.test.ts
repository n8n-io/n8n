import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { createNode, createNodeType, createWorkflow } from '../../../../test/test-utils';
import { OperationsCollector } from '../state-provider';
import { resolveNodeId, type ScriptTools } from '../tool-interfaces';
import { createToolWrappers } from '../tool-wrappers';

// Mock validation functions
jest.mock('../../../validation/checks', () => ({
	validateConnections: jest.fn(() => []),
	validateTrigger: jest.fn(() => []),
	validateAgentPrompt: jest.fn(() => []),
	validateTools: jest.fn(() => []),
	validateFromAi: jest.fn(() => []),
}));

describe('Tool Wrappers', () => {
	let tools: ScriptTools;
	let operationsCollector: OperationsCollector;
	let nodeTypes: INodeTypeDescription[];

	const manualTriggerType = createNodeType({
		displayName: 'Manual Trigger',
		name: 'n8n-nodes-base.manualTrigger',
		group: ['trigger'],
		inputs: [],
		outputs: ['main'],
	});

	const httpRequestType = createNodeType({
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		group: ['input'],
		inputs: ['main'],
		outputs: ['main'],
	});

	// Using expression-based inputs like the real AI Agent node
	// This is important for testing hasOutputParser behavior
	const agentType = createNodeType({
		displayName: 'AI Agent',
		name: '@n8n/n8n-nodes-langchain.agent',
		group: ['output'],
		inputs:
			"={{[{ type: 'main' }, { type: 'ai_languageModel' }, { type: 'ai_outputParser' }, { type: 'ai_memory' }, { type: 'ai_tool' }]}}",
		outputs: ['main'],
	});

	const chatModelType = createNodeType({
		displayName: 'OpenAI Chat Model',
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		group: ['output'],
		inputs: [],
		outputs: [{ type: 'ai_languageModel' }],
	});

	const outputParserType = createNodeType({
		displayName: 'Structured Output Parser',
		name: '@n8n/n8n-nodes-langchain.outputParserStructured',
		group: ['output'],
		inputs: [],
		outputs: [{ type: 'ai_outputParser' }],
	});

	// Switch node with multiple outputs
	const switchType = createNodeType({
		displayName: 'Switch',
		name: 'n8n-nodes-base.switch',
		group: ['transform'],
		inputs: ['main'],
		outputs: ['main', 'main', 'main'], // 3 outputs for testing
	});

	// Merge node with multiple inputs
	const mergeType = createNodeType({
		displayName: 'Merge',
		name: 'n8n-nodes-base.merge',
		group: ['transform'],
		inputs: ['main', 'main'], // 2 inputs for testing
		outputs: ['main'],
	});

	// Set node for generic data manipulation
	const setType = createNodeType({
		displayName: 'Set',
		name: 'n8n-nodes-base.set',
		group: ['transform'],
		inputs: ['main'],
		outputs: ['main'],
	});

	beforeEach(() => {
		operationsCollector = new OperationsCollector();
		nodeTypes = [
			manualTriggerType,
			httpRequestType,
			agentType,
			chatModelType,
			outputParserType,
			switchType,
			mergeType,
			setType,
		];

		const workflow = createWorkflow([]);

		tools = createToolWrappers({
			nodeTypes,
			workflow,
			operationsCollector,
		});
	});

	describe('addNode', () => {
		it('should add a node and return success with nodeId', async () => {
			const result = await tools.addNode({
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeVersion: 1,
				name: 'My Trigger',
				initialParametersReasoning: 'Test reasoning',
				initialParameters: {},
			});

			expect(result.success).toBe(true);
			expect(result.nodeId).toBeDefined();
			expect(result.nodeName).toBe('My Trigger');
			expect(result.nodeType).toBe('n8n-nodes-base.manualTrigger');
			expect(result.displayName).toBe('Manual Trigger');

			// Check operation was added
			const operations = operationsCollector.getOperations();
			expect(operations).toHaveLength(1);
			expect(operations[0].type).toBe('addNodes');
		});

		it('should return error for unknown node type', async () => {
			const result = await tools.addNode({
				nodeType: 'unknown.node',
				nodeVersion: 1,
				name: 'Unknown',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		it('should generate unique name when duplicate exists', async () => {
			// Add first node
			const result1 = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP Request',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Add second node with same name
			const result2 = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP Request',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(result1.nodeName).toBe('HTTP Request');
			expect(result2.nodeName).not.toBe(result1.nodeName);
		});
	});

	describe('connectNodes', () => {
		it('should connect two nodes using string nodeIds', async () => {
			// First add the nodes
			const trigger = await tools.addNode({
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeVersion: 1,
				name: 'Trigger',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const httpRequest = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Connect them using string nodeIds (original pattern)
			const result = await tools.connectNodes({
				sourceNodeId: trigger.nodeId!,
				targetNodeId: httpRequest.nodeId!,
			});

			expect(result.success).toBe(true);
			expect(result.connectionType).toBe('main');

			// Check operations
			const operations = operationsCollector.getOperations();
			expect(operations).toHaveLength(3); // 2 addNodes + 1 mergeConnections
			expect(operations[2].type).toBe('mergeConnections');
		});

		it('should connect two nodes using AddNodeResult objects directly', async () => {
			// First add the nodes
			const trigger = await tools.addNode({
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeVersion: 1,
				name: 'Trigger',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const httpRequest = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Connect them using result objects directly (ergonomic pattern)
			const result = await tools.connectNodes({
				sourceNodeId: trigger,
				targetNodeId: httpRequest,
			});

			expect(result.success).toBe(true);
			expect(result.connectionType).toBe('main');

			// Check operations
			const operations = operationsCollector.getOperations();
			expect(operations).toHaveLength(3); // 2 addNodes + 1 mergeConnections
			expect(operations[2].type).toBe('mergeConnections');
		});

		it('should return error for non-existent node', async () => {
			const result = await tools.connectNodes({
				sourceNodeId: 'non-existent',
				targetNodeId: 'also-non-existent',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		it('should return error for invalid source node reference', async () => {
			const result = await tools.connectNodes({
				sourceNodeId: { nodeId: undefined },
				targetNodeId: 'some-id',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid source node reference');
		});

		it('should return error for invalid target node reference', async () => {
			const trigger = await tools.addNode({
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeVersion: 1,
				name: 'Trigger',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const result = await tools.connectNodes({
				sourceNodeId: trigger,
				targetNodeId: { nodeId: undefined },
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid target node reference');
		});
	});

	describe('removeNode', () => {
		it('should remove an existing node', async () => {
			// Add a node first
			const added = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'To Remove',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Remove it
			const result = await tools.removeNode({
				nodeId: added.nodeId!,
			});

			expect(result.success).toBe(true);
			expect(result.removedNodeId).toBe(added.nodeId);
			expect(result.removedNodeName).toBe('To Remove');
		});

		it('should return error for non-existent node', async () => {
			const result = await tools.removeNode({
				nodeId: 'non-existent',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});
	});

	describe('renameNode', () => {
		it('should rename a node', async () => {
			// Add a node
			const added = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'Old Name',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Rename it
			const result = await tools.renameNode({
				nodeId: added.nodeId!,
				newName: 'New Name',
			});

			expect(result.success).toBe(true);
			expect(result.oldName).toBe('Old Name');
			expect(result.newName).toBe('New Name');
		});

		it('should return error for duplicate name', async () => {
			// Add two nodes
			await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'Node A',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const nodeB = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'Node B',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Try to rename Node B to Node A
			const result = await tools.renameNode({
				nodeId: nodeB.nodeId!,
				newName: 'Node A',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('already exists');
		});

		it('should rename a node from the original workflow (pre-existing node)', async () => {
			// Create a new tools instance with a pre-existing workflow
			const existingNode = createNode({
				id: 'existing-agent-id',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
			});
			const existingWorkflow = createWorkflow([existingNode]);

			const existingWorkflowCollector = new OperationsCollector();
			const existingWorkflowTools = createToolWrappers({
				nodeTypes,
				workflow: existingWorkflow,
				operationsCollector: existingWorkflowCollector,
			});

			// Rename the existing node
			const result = await existingWorkflowTools.renameNode({
				nodeId: 'existing-agent-id',
				newName: 'Renamed Agent',
			});

			expect(result.success).toBe(true);
			expect(result.oldName).toBe('AI Agent');
			expect(result.newName).toBe('Renamed Agent');

			// Verify operation was created correctly
			const operations = existingWorkflowCollector.getOperations();
			expect(operations).toHaveLength(1);
			expect(operations[0].type).toBe('renameNode');
			if (operations[0].type === 'renameNode') {
				expect(operations[0].nodeId).toBe('existing-agent-id');
				expect(operations[0].oldName).toBe('AI Agent');
				expect(operations[0].newName).toBe('Renamed Agent');
			}
		});

		it('should connect output parser to existing AI Agent by UUID', async () => {
			// This is the exact scenario the user reported failing:
			// 1. Existing workflow has AI Agent with hasOutputParser enabled
			// 2. Script adds output parser
			// 3. Script connects parser to AI Agent using UUID

			const existingAgent = createNode({
				id: 'agent-uuid-12345',
				name: 'Generate Fun Weather Email',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: { hasOutputParser: true }, // Must be true for ai_outputParser input to be available
			});
			const existingWorkflow = createWorkflow([existingAgent]);

			const collector = new OperationsCollector();
			const toolsWithExisting = createToolWrappers({
				nodeTypes,
				workflow: existingWorkflow,
				operationsCollector: collector,
			});

			// 1. Add output parser
			const parser = await toolsWithExisting.addNode({
				nodeType: '@n8n/n8n-nodes-langchain.outputParserStructured',
				nodeVersion: 1, // Using version 1 to match the mock node type
				name: 'Extract Email and Temperature',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});
			expect(parser.success).toBe(true);

			// 2. Connect parser to AI Agent by UUID (this was failing)
			const connectResult = await toolsWithExisting.connectNodes({
				sourceNodeId: parser,
				targetNodeId: 'agent-uuid-12345', // Using UUID, not name
			});

			// This should succeed!
			expect(connectResult.success).toBe(true);
			expect(connectResult.connectionType).toBe('ai_outputParser');

			// The parser should be the source (sub-node -> main node)
			expect(connectResult.sourceNode).toBe('Extract Email and Temperature');
			expect(connectResult.targetNode).toBe('Generate Fun Weather Email');

			// Verify the operation was created correctly
			const operations = collector.getOperations();
			expect(operations).toHaveLength(2); // addNodes + mergeConnections

			const connOp = operations[1];
			expect(connOp.type).toBe('mergeConnections');
			if (connOp.type === 'mergeConnections') {
				const parserConn = connOp.connections['Extract Email and Temperature'];
				expect(parserConn).toBeDefined();
				expect(parserConn?.ai_outputParser?.[0]?.[0]).toEqual({
					node: 'Generate Fun Weather Email',
					type: 'ai_outputParser',
					index: 0,
				});
			}
		});

		it('should FAIL to connect output parser when AI Agent has hasOutputParser undefined', async () => {
			// This tests the fix: ai_outputParser should only be available when hasOutputParser === true
			const existingAgent = createNode({
				id: 'agent-uuid-no-parser',
				name: 'AI Agent Without Parser',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {}, // hasOutputParser NOT set (undefined) - default state
			});
			const existingWorkflow = createWorkflow([existingAgent]);

			const collector = new OperationsCollector();
			const toolsWithExisting = createToolWrappers({
				nodeTypes,
				workflow: existingWorkflow,
				operationsCollector: collector,
			});

			// Add output parser
			const parser = await toolsWithExisting.addNode({
				nodeType: '@n8n/n8n-nodes-langchain.outputParserStructured',
				nodeVersion: 1,
				name: 'Output Parser',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});
			expect(parser.success).toBe(true);

			// Try to connect parser to AI Agent - should FAIL because hasOutputParser is not true
			const connectResult = await toolsWithExisting.connectNodes({
				sourceNodeId: parser,
				targetNodeId: 'agent-uuid-no-parser',
			});

			// This should fail because ai_outputParser is not available
			expect(connectResult.success).toBe(false);
			expect(connectResult.error).toBeDefined();
		});

		it('should handle rename followed by connect on existing workflow', async () => {
			// This is the user-reported scenario:
			// 1. Existing workflow has AI Agent
			// 2. Script adds new nodes
			// 3. Script renames AI Agent
			// 4. Script connects nodes using UUID of the renamed AI Agent

			const existingAgent = createNode({
				id: 'agent-uuid',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
			});
			const existingWorkflow = createWorkflow([existingAgent]);

			const collector = new OperationsCollector();
			const toolsWithExisting = createToolWrappers({
				nodeTypes,
				workflow: existingWorkflow,
				operationsCollector: collector,
			});

			// 1. Add a new node
			const parser = await toolsWithExisting.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'Output Parser',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});
			expect(parser.success).toBe(true);

			// 2. Rename the existing AI Agent
			const renameResult = await toolsWithExisting.renameNode({
				nodeId: 'agent-uuid',
				newName: 'Renamed Agent',
			});
			expect(renameResult.success).toBe(true);
			expect(renameResult.oldName).toBe('AI Agent');

			// 3. Connect new node to the existing (now renamed) AI Agent by UUID
			const connectResult = await toolsWithExisting.connectNodes({
				sourceNodeId: parser.nodeId!,
				targetNodeId: 'agent-uuid', // Using UUID, not name
			});
			expect(connectResult.success).toBe(true);

			// Verify operations are correct
			const operations = collector.getOperations();
			expect(operations).toHaveLength(3);

			// addNodes operation
			expect(operations[0].type).toBe('addNodes');

			// renameNode operation
			expect(operations[1].type).toBe('renameNode');
			if (operations[1].type === 'renameNode') {
				expect(operations[1].oldName).toBe('AI Agent');
				expect(operations[1].newName).toBe('Renamed Agent');
			}

			// mergeConnections should use the NEW name (since rename was simulated)
			expect(operations[2].type).toBe('mergeConnections');
			if (operations[2].type === 'mergeConnections') {
				// The connection should reference the RENAMED node name
				const parserConn = operations[2].connections['Output Parser'];
				expect(parserConn).toBeDefined();
				expect(parserConn?.main?.[0]?.[0]?.node).toBe('Renamed Agent');
			}
		});
	});

	describe('removeConnection', () => {
		it('should remove a connection', async () => {
			// Add nodes
			const nodeA = await tools.addNode({
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeVersion: 1,
				name: 'Trigger',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const nodeB = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Connect
			await tools.connectNodes({
				sourceNodeId: nodeA.nodeId!,
				targetNodeId: nodeB.nodeId!,
			});

			// Remove connection (can use node names or IDs)
			const result = await tools.removeConnection({
				sourceNodeId: 'Trigger',
				targetNodeId: 'HTTP',
				connectionType: 'main',
			});

			expect(result.success).toBe(true);
		});
	});

	describe('validateStructure', () => {
		it('should validate workflow structure', async () => {
			const result = await tools.validateStructure();

			expect(result.success).toBe(true);
			expect(result.isValid).toBe(true);
		});
	});

	describe('getNodeParameter', () => {
		it('should get a parameter value from a node', async () => {
			// Add a node with parameters
			const added = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP Request',
				initialParametersReasoning: 'Test',
				initialParameters: { url: 'https://api.example.com', method: 'GET' },
			});

			// Get a parameter value
			const result = await tools.getNodeParameter({
				nodeId: added.nodeId!,
				path: 'url',
			});

			expect(result.success).toBe(true);
			expect(result.value).toBe('https://api.example.com');
		});

		it('should get nested parameter values', async () => {
			const added = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP Request',
				initialParametersReasoning: 'Test',
				initialParameters: {
					options: {
						timeout: 5000,
						allowUnauthorizedCerts: true,
					},
				},
			});

			const result = await tools.getNodeParameter({
				nodeId: added.nodeId!,
				path: 'options.timeout',
			});

			expect(result.success).toBe(true);
			expect(result.value).toBe(5000);
		});

		it('should return undefined for non-existent path', async () => {
			const added = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP Request',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const result = await tools.getNodeParameter({
				nodeId: added.nodeId!,
				path: 'nonExistent.path',
			});

			expect(result.success).toBe(true);
			expect(result.value).toBeUndefined();
		});

		it('should return error for non-existent node', async () => {
			const result = await tools.getNodeParameter({
				nodeId: 'non-existent-id',
				path: 'url',
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});
	});

	describe('validateConfiguration', () => {
		it('should validate configuration when no issues', async () => {
			const result = await tools.validateConfiguration();

			expect(result.success).toBe(true);
			expect(result.isValid).toBe(true);
		});
	});

	describe('updateNodeParameters', () => {
		it('should throw error when LLM is not configured', async () => {
			// Add a node first
			const added = await tools.addNode({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeVersion: 1,
				name: 'HTTP Request',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Try to update without LLM - should throw
			await expect(
				tools.updateNodeParameters({
					nodeId: added.nodeId!,
					changes: ['Set URL to https://api.example.com'],
				}),
			).rejects.toThrow('LLM configuration');
		});

		it('should throw LLM error for non-existent node when LLM not configured', async () => {
			// Note: LLM check happens first, so even with non-existent node we get LLM error
			await expect(
				tools.updateNodeParameters({
					nodeId: 'non-existent',
					changes: ['Set URL to https://api.example.com'],
				}),
			).rejects.toThrow('LLM configuration');
		});
	});

	describe('addNodes (batch)', () => {
		it('should add multiple nodes in a single operation', async () => {
			const result = await tools.addNodes({
				nodes: [
					{
						nodeType: 'n8n-nodes-base.manualTrigger',
						nodeVersion: 1,
						name: 'Trigger',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
					{
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeVersion: 1,
						name: 'HTTP',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
				],
			});

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(2);
			expect(result.results[0].success).toBe(true);
			expect(result.results[0].nodeName).toBe('Trigger');
			expect(result.results[1].success).toBe(true);
			expect(result.results[1].nodeName).toBe('HTTP');

			// Should be a single addNodes operation, not two
			const operations = operationsCollector.getOperations();
			expect(operations).toHaveLength(1);
			expect(operations[0].type).toBe('addNodes');
			if (operations[0].type === 'addNodes') {
				expect(operations[0].nodes).toHaveLength(2);
			}
		});

		it('should generate unique names when batch has duplicates', async () => {
			const result = await tools.addNodes({
				nodes: [
					{
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeVersion: 1,
						name: 'HTTP Request',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
					{
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeVersion: 1,
						name: 'HTTP Request',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
				],
			});

			expect(result.success).toBe(true);
			expect(result.results[0].nodeName).toBe('HTTP Request');
			expect(result.results[1].nodeName).not.toBe(result.results[0].nodeName);
		});

		it('should handle partial failures gracefully', async () => {
			const result = await tools.addNodes({
				nodes: [
					{
						nodeType: 'n8n-nodes-base.manualTrigger',
						nodeVersion: 1,
						name: 'Trigger',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
					{
						nodeType: 'unknown.node',
						nodeVersion: 1,
						name: 'Unknown',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
				],
			});

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(2);
			expect(result.results[0].success).toBe(true);
			expect(result.results[1].success).toBe(false);
			expect(result.results[1].error).toContain('not found');

			// Should still add the successful node
			const operations = operationsCollector.getOperations();
			expect(operations).toHaveLength(1);
			if (operations[0].type === 'addNodes') {
				expect(operations[0].nodes).toHaveLength(1);
			}
		});

		it('should return empty results for empty input', async () => {
			const result = await tools.addNodes({ nodes: [] });

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(0);
		});
	});

	describe('add() alias', () => {
		it('should work as alias for addNodes', async () => {
			const result = await tools.add({
				nodes: [
					{
						nodeType: 'n8n-nodes-base.manualTrigger',
						nodeVersion: 1,
						name: 'Trigger',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
				],
			});

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].nodeName).toBe('Trigger');
		});
	});

	describe('connectMultiple (batch)', () => {
		it('should connect multiple node pairs in a single operation', async () => {
			// First add nodes
			const nodesResult = await tools.addNodes({
				nodes: [
					{
						nodeType: 'n8n-nodes-base.manualTrigger',
						nodeVersion: 1,
						name: 'Trigger',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
					{
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeVersion: 1,
						name: 'HTTP1',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
					{
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeVersion: 1,
						name: 'HTTP2',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
				],
			});

			const [trigger, http1, http2] = nodesResult.results;

			// Connect Trigger -> HTTP1 and Trigger -> HTTP2
			const connectResult = await tools.connectMultiple({
				connections: [
					{ sourceNodeId: trigger, targetNodeId: http1 },
					{ sourceNodeId: trigger, targetNodeId: http2 },
				],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(2);
			expect(connectResult.results[0].success).toBe(true);
			expect(connectResult.results[1].success).toBe(true);

			// Should be addNodes + one mergeConnections operation
			const operations = operationsCollector.getOperations();
			expect(operations).toHaveLength(2);
			expect(operations[1].type).toBe('mergeConnections');
		});

		it('should handle partial connection failures', async () => {
			const trigger = await tools.addNode({
				nodeType: 'n8n-nodes-base.manualTrigger',
				nodeVersion: 1,
				name: 'Trigger',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const connectResult = await tools.connectMultiple({
				connections: [
					{ sourceNodeId: trigger, targetNodeId: 'non-existent' },
					{ sourceNodeId: trigger, targetNodeId: { nodeId: undefined } },
				],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(2);
			expect(connectResult.results[0].success).toBe(false);
			expect(connectResult.results[0].error).toContain('not found');
			expect(connectResult.results[1].success).toBe(false);
			expect(connectResult.results[1].error).toContain('Invalid target node reference');
		});

		it('should return empty results for empty input', async () => {
			const result = await tools.connectMultiple({ connections: [] });

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(0);
		});

		it('should work with AI connections in batch', async () => {
			// Add AI Agent with hasOutputParser enabled
			const agent = await tools.addNode({
				nodeType: '@n8n/n8n-nodes-langchain.agent',
				nodeVersion: 1,
				name: 'AI Agent',
				initialParametersReasoning: 'Test',
				initialParameters: { hasOutputParser: true },
			});

			const chatModel = await tools.addNode({
				nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				nodeVersion: 1,
				name: 'Chat Model',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			const outputParser = await tools.addNode({
				nodeType: '@n8n/n8n-nodes-langchain.outputParserStructured',
				nodeVersion: 1,
				name: 'Output Parser',
				initialParametersReasoning: 'Test',
				initialParameters: {},
			});

			// Connect both AI sub-nodes to agent in one batch
			const connectResult = await tools.connectMultiple({
				connections: [
					{ sourceNodeId: chatModel, targetNodeId: agent },
					{ sourceNodeId: outputParser, targetNodeId: agent },
				],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(2);
			expect(connectResult.results[0].success).toBe(true);
			expect(connectResult.results[0].connectionType).toBe('ai_languageModel');
			expect(connectResult.results[1].success).toBe(true);
			expect(connectResult.results[1].connectionType).toBe('ai_outputParser');
		});
	});

	describe('conn() alias', () => {
		it('should work as alias for connectMultiple', async () => {
			const nodesResult = await tools.add({
				nodes: [
					{
						nodeType: 'n8n-nodes-base.manualTrigger',
						nodeVersion: 1,
						name: 'Trigger',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
					{
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeVersion: 1,
						name: 'HTTP',
						initialParametersReasoning: 'Test',
						initialParameters: {},
					},
				],
			});

			const [trigger, http] = nodesResult.results;

			const connectResult = await tools.conn({
				connections: [{ sourceNodeId: trigger, targetNodeId: http }],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(1);
			expect(connectResult.results[0].success).toBe(true);
		});
	});

	describe('Multi-output/multi-input connections', () => {
		it('should connect Switch node outputs to different targets using so (sourceOutputIndex)', async () => {
			// Create Switch node with multiple outputs + target nodes
			const nodesResult = await tools.add({
				nodes: [
					{ t: 'n8n-nodes-base.manualTrigger', n: 'Trigger' },
					{ t: 'n8n-nodes-base.switch', n: 'Router' },
					{ t: 'n8n-nodes-base.set', n: 'Path A' },
					{ t: 'n8n-nodes-base.set', n: 'Path B' },
					{ t: 'n8n-nodes-base.set', n: 'Path C' },
				],
			});

			const [trigger, switchNode, pathA, pathB, pathC] = nodesResult.results;

			// Connect with different source output indices
			const connectResult = await tools.conn({
				connections: [
					{ s: trigger, d: switchNode },
					{ s: switchNode, d: pathA, so: 0 }, // Switch output 0 -> Path A
					{ s: switchNode, d: pathB, so: 1 }, // Switch output 1 -> Path B
					{ s: switchNode, d: pathC, so: 2 }, // Switch output 2 -> Path C
				],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(4);
			expect(connectResult.results.every((r) => r.success)).toBe(true);

			// Verify the mergeConnections operation has correct structure
			const operations = operationsCollector.getOperations();
			const connOp = operations.find((op) => op.type === 'mergeConnections');
			expect(connOp).toBeDefined();
			if (connOp?.type === 'mergeConnections') {
				// Switch node should have connections from outputs 0, 1, and 2
				const switchConnections = connOp.connections['Router']?.main;
				expect(switchConnections).toBeDefined();
				expect(switchConnections?.length).toBeGreaterThanOrEqual(3);
				// Output 0 connects to Path A
				expect(switchConnections?.[0]?.[0]?.node).toBe('Path A');
				// Output 1 connects to Path B
				expect(switchConnections?.[1]?.[0]?.node).toBe('Path B');
				// Output 2 connects to Path C
				expect(switchConnections?.[2]?.[0]?.node).toBe('Path C');
			}
		});

		it('should connect multiple sources to Merge node inputs using di (targetInputIndex)', async () => {
			// Create nodes that feed into a Merge
			const nodesResult = await tools.add({
				nodes: [
					{ t: 'n8n-nodes-base.set', n: 'Source A' },
					{ t: 'n8n-nodes-base.set', n: 'Source B' },
					{ t: 'n8n-nodes-base.merge', n: 'Combine' },
					{ t: 'n8n-nodes-base.set', n: 'Output' },
				],
			});

			const [sourceA, sourceB, merge, output] = nodesResult.results;

			// Connect with different target input indices
			const connectResult = await tools.conn({
				connections: [
					{ s: sourceA, d: merge, di: 0 }, // Source A -> Merge input 0
					{ s: sourceB, d: merge, di: 1 }, // Source B -> Merge input 1
					{ s: merge, d: output }, // Merge -> Output
				],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(3);
			expect(connectResult.results.every((r) => r.success)).toBe(true);

			// Verify the mergeConnections operation has correct structure
			const operations = operationsCollector.getOperations();
			const connOp = operations.find((op) => op.type === 'mergeConnections');
			expect(connOp).toBeDefined();
			if (connOp?.type === 'mergeConnections') {
				// Source A should connect to Merge input 0
				const sourceAConn = connOp.connections['Source A']?.main?.[0]?.[0];
				expect(sourceAConn?.node).toBe('Combine');
				expect(sourceAConn?.index).toBe(0);
				// Source B should connect to Merge input 1
				const sourceBConn = connOp.connections['Source B']?.main?.[0]?.[0];
				expect(sourceBConn?.node).toBe('Combine');
				expect(sourceBConn?.index).toBe(1);
			}
		});

		it('should handle combined Switch outputs and Merge inputs', async () => {
			// Complex scenario: Switch -> multiple paths -> Merge
			const nodesResult = await tools.add({
				nodes: [
					{ t: 'n8n-nodes-base.manualTrigger', n: 'Trigger' },
					{ t: 'n8n-nodes-base.switch', n: 'Router' },
					{ t: 'n8n-nodes-base.set', n: 'Branch 1' },
					{ t: 'n8n-nodes-base.set', n: 'Branch 2' },
					{ t: 'n8n-nodes-base.merge', n: 'Combine' },
					{ t: 'n8n-nodes-base.set', n: 'Final' },
				],
			});

			const [trigger, switchNode, branch1, branch2, merge, final] = nodesResult.results;

			// Connect the full workflow
			const connectResult = await tools.conn({
				connections: [
					{ s: trigger, d: switchNode },
					{ s: switchNode, d: branch1, so: 0 }, // Switch output 0 -> Branch 1
					{ s: switchNode, d: branch2, so: 1 }, // Switch output 1 -> Branch 2
					{ s: branch1, d: merge, di: 0 }, // Branch 1 -> Merge input 0
					{ s: branch2, d: merge, di: 1 }, // Branch 2 -> Merge input 1
					{ s: merge, d: final }, // Merge -> Final
				],
			});

			expect(connectResult.success).toBe(true);
			expect(connectResult.results).toHaveLength(6);
			expect(connectResult.results.every((r) => r.success)).toBe(true);
		});

		it('should default to output 0 and input 0 when indices not specified', async () => {
			const nodesResult = await tools.add({
				nodes: [
					{ t: 'n8n-nodes-base.switch', n: 'Switch' },
					{ t: 'n8n-nodes-base.set', n: 'Target' },
				],
			});

			const [switchNode, target] = nodesResult.results;

			// Connect without specifying indices - should use 0, 0
			const connectResult = await tools.conn({
				connections: [{ s: switchNode, d: target }],
			});

			expect(connectResult.success).toBe(true);

			// Verify default indices were used
			const operations = operationsCollector.getOperations();
			const connOp = operations.find((op) => op.type === 'mergeConnections');
			if (connOp?.type === 'mergeConnections') {
				// Should connect from output 0
				const switchConnections = connOp.connections['Switch']?.main;
				expect(switchConnections?.[0]?.[0]?.node).toBe('Target');
				expect(switchConnections?.[0]?.[0]?.index).toBe(0); // Target input 0
			}
		});
	});

	describe('Short-form input support', () => {
		describe('addNode with short-form', () => {
			it('should accept short-form input (t, n, p)', async () => {
				const result = await tools.addNode({
					t: 'n8n-nodes-base.manualTrigger',
					n: 'MyTrigger',
				});

				expect(result.success).toBe(true);
				expect(result.nodeName).toBe('MyTrigger');
				expect(result.nodeType).toBe('n8n-nodes-base.manualTrigger');
			});

			it('should default version to latest when not specified', async () => {
				const result = await tools.addNode({
					t: 'n8n-nodes-base.httpRequest',
					n: 'HTTP',
				});

				expect(result.success).toBe(true);
				expect(result.nodeType).toBe('n8n-nodes-base.httpRequest');
			});

			it('should default initialParameters to empty object', async () => {
				const result = await tools.addNode({
					t: 'n8n-nodes-base.manualTrigger',
				});

				expect(result.success).toBe(true);
			});

			it('should accept parameters with p shorthand', async () => {
				const result = await tools.addNode({
					t: '@n8n/n8n-nodes-langchain.agent',
					n: 'Agent',
					p: { hasOutputParser: true },
				});

				expect(result.success).toBe(true);
			});
		});

		describe('addNodes (batch) with short-form', () => {
			it('should accept short-form inputs in batch', async () => {
				const result = await tools.add({
					nodes: [
						{ t: 'n8n-nodes-base.manualTrigger', n: 'Trigger' },
						{ t: 'n8n-nodes-base.httpRequest', n: 'HTTP' },
					],
				});

				expect(result.success).toBe(true);
				expect(result.results).toHaveLength(2);
				expect(result.results[0].nodeName).toBe('Trigger');
				expect(result.results[1].nodeName).toBe('HTTP');
			});
		});

		describe('connectNodes with short-form', () => {
			it('should accept short-form input (s, d)', async () => {
				const nodesResult = await tools.add({
					nodes: [
						{ t: 'n8n-nodes-base.manualTrigger', n: 'Trigger' },
						{ t: 'n8n-nodes-base.httpRequest', n: 'HTTP' },
					],
				});

				const [trigger, http] = nodesResult.results;

				const result = await tools.connectNodes({
					s: trigger,
					d: http,
				});

				expect(result.success).toBe(true);
			});
		});

		describe('connectMultiple (batch) with short-form', () => {
			it('should accept short-form inputs in batch', async () => {
				const nodesResult = await tools.add({
					nodes: [
						{ t: 'n8n-nodes-base.manualTrigger', n: 'Trigger' },
						{ t: 'n8n-nodes-base.httpRequest', n: 'HTTP1' },
						{ t: 'n8n-nodes-base.httpRequest', n: 'HTTP2' },
					],
				});

				const [trigger, http1, http2] = nodesResult.results;

				const result = await tools.conn({
					connections: [
						{ s: trigger, d: http1 },
						{ s: trigger, d: http2 },
					],
				});

				expect(result.success).toBe(true);
				expect(result.results).toHaveLength(2);
				expect(result.results[0].success).toBe(true);
				expect(result.results[1].success).toBe(true);
			});
		});
	});

	describe('setParameters (direct parameter setting)', () => {
		it('should set parameters directly without LLM', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
			});

			const result = await tools.setParameters({
				nodeId: node,
				params: { url: 'https://example.com', method: 'POST' },
			});

			expect(result.success).toBe(true);
			expect(result.parameters).toEqual({ url: 'https://example.com', method: 'POST' });
		});

		it('should merge with existing parameters by default', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
				p: { url: 'https://old.com' },
			});

			const result = await tools.setParameters({
				nodeId: node,
				params: { method: 'POST' },
			});

			expect(result.success).toBe(true);
			expect(result.parameters).toEqual({ url: 'https://old.com', method: 'POST' });
		});

		it('should replace all parameters when replace=true', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
				p: { url: 'https://old.com', method: 'GET' },
			});

			const result = await tools.setParameters({
				nodeId: node,
				params: { url: 'https://new.com' },
				replace: true,
			});

			expect(result.success).toBe(true);
			expect(result.parameters).toEqual({ url: 'https://new.com' });
		});

		it('should return error for non-existent node', async () => {
			const result = await tools.setParameters({
				nodeId: 'non-existent',
				params: { url: 'https://example.com' },
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		it('should handle nested objects correctly', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
			});

			const result = await tools.setParameters({
				nodeId: node,
				params: {
					url: 'https://example.com',
					options: {
						timeout: 5000,
						proxy: 'http://proxy.example.com',
					},
				},
			});

			expect(result.success).toBe(true);
			expect(result.parameters).toEqual({
				url: 'https://example.com',
				options: { timeout: 5000, proxy: 'http://proxy.example.com' },
			});
		});

		it('should handle arrays correctly', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
			});

			const result = await tools.setParameters({
				nodeId: node,
				params: {
					url: 'https://example.com',
					headers: [
						{ name: 'Content-Type', value: 'application/json' },
						{ name: 'Auth', value: 'Bearer token' },
					],
				},
			});

			expect(result.success).toBe(true);
			expect(result.parameters?.headers).toEqual([
				{ name: 'Content-Type', value: 'application/json' },
				{ name: 'Auth', value: 'Bearer token' },
			]);
		});

		describe('set() alias', () => {
			it('should work as alias for setParameters', async () => {
				const node = await tools.addNode({
					t: 'n8n-nodes-base.httpRequest',
					n: 'HTTP',
				});

				const result = await tools.set({
					nodeId: node,
					params: { url: 'https://example.com' },
				});

				expect(result.success).toBe(true);
			});
		});
	});

	describe('setAll (batch direct parameter setting)', () => {
		it('should set parameters on multiple nodes', async () => {
			const nodesResult = await tools.add({
				nodes: [
					{ t: 'n8n-nodes-base.httpRequest', n: 'HTTP1' },
					{ t: 'n8n-nodes-base.httpRequest', n: 'HTTP2' },
				],
			});

			const [http1, http2] = nodesResult.results;

			const result = await tools.setAll({
				updates: [
					{ nodeId: http1, params: { url: 'https://example1.com' } },
					{ nodeId: http2, params: { url: 'https://example2.com' } },
				],
			});

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(2);
			expect(result.results[0].success).toBe(true);
			expect(result.results[0].parameters).toEqual({ url: 'https://example1.com' });
			expect(result.results[1].success).toBe(true);
			expect(result.results[1].parameters).toEqual({ url: 'https://example2.com' });
		});

		it('should handle partial failures', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
			});

			const result = await tools.setAll({
				updates: [
					{ nodeId: node, params: { url: 'https://example.com' } },
					{ nodeId: 'non-existent', params: { url: 'https://fail.com' } },
				],
			});

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(2);
			expect(result.results[0].success).toBe(true);
			expect(result.results[1].success).toBe(false);
		});

		it('should return empty results for empty input', async () => {
			const result = await tools.setAll({ updates: [] });

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(0);
		});
	});

	describe('updateAll (batch LLM parameter updates)', () => {
		it('should return empty results for empty input', async () => {
			const result = await tools.updateAll({ updates: [] });

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(0);
		});

		it('should throw error when LLM not configured', async () => {
			const node = await tools.addNode({
				t: 'n8n-nodes-base.httpRequest',
				n: 'HTTP',
			});

			await expect(
				tools.updateAll({
					updates: [{ nodeId: node.nodeId!, changes: ['Set URL'] }],
				}),
			).rejects.toThrow();
		});
	});
});

describe('OperationsCollector', () => {
	it('should accumulate operations', () => {
		const collector = new OperationsCollector();

		collector.addOperation({ type: 'addNodes', nodes: [] });
		collector.addOperation({ type: 'mergeConnections', connections: {} });

		expect(collector.count).toBe(2);
		expect(collector.getOperations()).toHaveLength(2);
	});

	it('should cache nodes from addNodes operations', () => {
		const collector = new OperationsCollector();
		const node = createNode({ id: 'test-id', name: 'Test' });

		collector.addOperation({ type: 'addNodes', nodes: [node] });

		const cached = collector.getCachedNode('test-id');
		expect(cached).toBeDefined();
		expect(cached?.name).toBe('Test');
	});

	it('should clear operations', () => {
		const collector = new OperationsCollector();

		collector.addOperation({ type: 'addNodes', nodes: [] });
		collector.clear();

		expect(collector.count).toBe(0);
		expect(collector.getOperations()).toHaveLength(0);
	});
});

describe('resolveNodeId', () => {
	it('should return string directly when given a string', () => {
		expect(resolveNodeId('abc-123')).toBe('abc-123');
	});

	it('should extract nodeId from object with nodeId property', () => {
		expect(resolveNodeId({ nodeId: 'def-456' })).toBe('def-456');
	});

	it('should return undefined when object has undefined nodeId', () => {
		expect(resolveNodeId({ nodeId: undefined })).toBeUndefined();
	});

	it('should return undefined when object has no nodeId property', () => {
		expect(resolveNodeId({} as { nodeId?: string })).toBeUndefined();
	});

	it('should work with AddNodeResult-like objects', () => {
		const addNodeResult = {
			success: true,
			nodeId: 'ghi-789',
			nodeName: 'Test Node',
			nodeType: 'n8n-nodes-base.httpRequest',
		};
		expect(resolveNodeId(addNodeResult)).toBe('ghi-789');
	});
});

describe('Default Parameter Extraction', () => {
	// Test case based on user-reported issue: model parameters showing as 'undefined'
	// after creating lmChatOpenAi nodes

	it('should apply default parameters from node type when creating nodes', async () => {
		// Create a node type that mimics lmChatOpenAi with model parameter that has displayOptions
		const chatModelWithDisplayOptions = createNodeType({
			displayName: 'OpenAI Chat Model',
			name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: [1, 1.1, 1.2, 1.3],
			group: ['output'],
			inputs: [],
			outputs: [{ type: 'ai_languageModel' }],
			properties: [
				{
					displayName: 'Model',
					name: 'model',
					type: 'options',
					default: 'gpt-4',
					options: [
						{ name: 'GPT-4', value: 'gpt-4' },
						{ name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
					],
					// This displayOptions is version-based, not parameter-based
					displayOptions: {
						show: {
							'@version': [1.1, 1.2, 1.3],
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					options: [
						{
							displayName: 'System Message',
							name: 'systemMessage',
							type: 'string',
							default: '',
						},
					],
				},
			],
		});

		const operationsCollector = new OperationsCollector();
		const workflow = createWorkflow([]);

		const tools = createToolWrappers({
			nodeTypes: [chatModelWithDisplayOptions],
			workflow,
			operationsCollector,
		});

		// Create the node - this should apply defaults from properties
		const result = await tools.addNode({
			t: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			n: 'Test Model',
		});

		expect(result.success).toBe(true);

		// Get the created node from operations
		const operations = operationsCollector.getOperations();
		expect(operations).toHaveLength(1);
		expect(operations[0].type).toBe('addNodes');

		const addedNode = (operations[0] as { type: 'addNodes'; nodes: INode[] }).nodes[0];

		// Check that default parameters were applied
		// The 'options' property with empty object default should be there
		expect(addedNode.parameters).toHaveProperty('options');
		expect(addedNode.parameters.options).toEqual({});

		// NOTE: The model parameter has displayOptions with '@version', which means
		// extractDefaultParameters will skip it (currently). This test documents
		// the CURRENT behavior - model is NOT included because of displayOptions.
		// This is the bug we need to fix!
		console.log('Created node parameters:', JSON.stringify(addedNode.parameters, null, 2));
	});

	it('should include defaults for properties with version-only displayOptions', async () => {
		// This test will FAIL with current code but shows what we WANT to happen
		const chatModelWithVersionDisplayOptions = createNodeType({
			displayName: 'OpenAI Chat Model',
			name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: [1, 1.1, 1.2, 1.3],
			group: ['output'],
			inputs: [],
			outputs: [{ type: 'ai_languageModel' }],
			properties: [
				{
					displayName: 'Model',
					name: 'model',
					type: 'options',
					default: 'gpt-4',
					// Version-based displayOptions should NOT prevent default extraction
					displayOptions: {
						show: {
							'@version': [1.1, 1.2, 1.3],
						},
					},
				},
			],
		});

		const operationsCollector = new OperationsCollector();
		const workflow = createWorkflow([]);

		const tools = createToolWrappers({
			nodeTypes: [chatModelWithVersionDisplayOptions],
			workflow,
			operationsCollector,
		});

		const result = await tools.addNode({
			t: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			n: 'Test Model',
		});

		expect(result.success).toBe(true);

		const operations = operationsCollector.getOperations();
		const addedNode = (operations[0] as { type: 'addNodes'; nodes: INode[] }).nodes[0];

		// This is what we WANT - model default should be included even with @version displayOptions
		// Currently this will FAIL because extractDefaultParameters skips ANY displayOptions
		expect(addedNode.parameters).toHaveProperty('model');
		expect(addedNode.parameters.model).toBe('gpt-4');
	});
});
