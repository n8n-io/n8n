import type { INodeTypeDescription } from 'n8n-workflow';

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
		inputs: `={{[{ type: 'main' }, { type: 'ai_languageModel' }, { type: 'ai_outputParser' }, { type: 'ai_memory' }, { type: 'ai_tool' }]}}`,
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

	beforeEach(() => {
		operationsCollector = new OperationsCollector();
		nodeTypes = [manualTriggerType, httpRequestType, agentType, chatModelType, outputParserType];

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
