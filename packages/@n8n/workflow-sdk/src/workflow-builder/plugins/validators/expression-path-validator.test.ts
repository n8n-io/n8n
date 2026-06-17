import { expressionPathValidator } from './expression-path-validator';
import type { GraphNode, NodeInstance, ConnectionTarget, IDataObject } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance with optional config
function createMockNode(
	type: string,
	name: string,
	config: {
		parameters?: Record<string, unknown>;
		output?: IDataObject[];
	} = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: config.parameters ?? {},
			output: config.output,
		},
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a connection target
function conn(node: string, index: number): ConnectionTarget {
	return { node, type: 'main', index };
}

// Helper to create a mock graph node with optional connections
function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return {
		instance: node,
		connections,
	};
}

// Helper to create plugin context with nodes
function createMockPluginContext(
	nodes: Map<string, GraphNode>,
	pinData?: Record<string, IDataObject[]>,
): PluginContext {
	return {
		nodes,
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
		pinData,
	};
}

describe('expressionPathValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(expressionPathValidator.id).toBe('core:expression-path');
		});

		it('has correct name', () => {
			expect(expressionPathValidator.name).toBe('Expression Path Validator');
		});

		it('has validateWorkflow method', () => {
			expect(expressionPathValidator.validateWorkflow).toBeDefined();
		});
	});

	describe('validateNode', () => {
		it('returns empty array (validation happens at workflow level)', () => {
			const node = createMockNode('n8n-nodes-base.set', 'Set', {
				parameters: { value: '={{ $json.name }}' },
			});
			const ctx = createMockPluginContext(new Map());

			const issues = expressionPathValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});
	});

	describe('validateWorkflow', () => {
		it('returns INVALID_EXPRESSION_PATH warning when $json.field does not exist in predecessor output', () => {
			// Create predecessor node with known output shape
			const triggerNode = createMockNode('n8n-nodes-base.manualTrigger', 'Trigger');
			const triggerConns = new Map<string, Map<number, ConnectionTarget[]>>();
			triggerConns.set('main', new Map([[0, [conn('Consumer', 0)]]]));
			const triggerGraph = createGraphNode(triggerNode, triggerConns);

			// Create consumer node that references a non-existent field
			const consumerNode = createMockNode('n8n-nodes-base.set', 'Consumer', {
				parameters: { value: '={{ $json.nonExistent }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Trigger', triggerGraph);
			nodes.set('Consumer', consumerGraph);

			// Pin data shows what Trigger outputs
			const pinData = {
				Trigger: [{ existingField: 'value' }],
			};

			const ctx = createMockPluginContext(nodes, pinData);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_EXPRESSION_PATH',
					severity: 'warning',
				}),
			);
		});

		it('returns no warning when $json.field exists in predecessor output', () => {
			const triggerNode = createMockNode('n8n-nodes-base.manualTrigger', 'Trigger');
			const triggerConns = new Map<string, Map<number, ConnectionTarget[]>>();
			triggerConns.set('main', new Map([[0, [conn('Consumer', 0)]]]));
			const triggerGraph = createGraphNode(triggerNode, triggerConns);

			const consumerNode = createMockNode('n8n-nodes-base.set', 'Consumer', {
				parameters: { value: '={{ $json.name }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Trigger', triggerGraph);
			nodes.set('Consumer', consumerGraph);

			const pinData = {
				Trigger: [{ name: 'John' }],
			};

			const ctx = createMockPluginContext(nodes, pinData);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when no pinData or output available', () => {
			const triggerNode = createMockNode('n8n-nodes-base.manualTrigger', 'Trigger');
			const triggerConns = new Map<string, Map<number, ConnectionTarget[]>>();
			triggerConns.set('main', new Map([[0, [conn('Consumer', 0)]]]));
			const triggerGraph = createGraphNode(triggerNode, triggerConns);

			const consumerNode = createMockNode('n8n-nodes-base.set', 'Consumer', {
				parameters: { value: '={{ $json.anything }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Trigger', triggerGraph);
			nodes.set('Consumer', consumerGraph);

			// No pinData
			const ctx = createMockPluginContext(nodes);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toHaveLength(0);
		});

		it('uses node config output when available instead of pinData', () => {
			const setNode = createMockNode('n8n-nodes-base.set', 'Set', {
				output: [{ processedField: 'value' }],
			});
			const setConns = new Map<string, Map<number, ConnectionTarget[]>>();
			setConns.set('main', new Map([[0, [conn('Consumer', 0)]]]));
			const setGraph = createGraphNode(setNode, setConns);

			const consumerNode = createMockNode('n8n-nodes-base.httpRequest', 'Consumer', {
				parameters: { url: '={{ $json.processedField }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Set', setGraph);
			nodes.set('Consumer', consumerGraph);

			const ctx = createMockPluginContext(nodes);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when output has json wrapper and field exists inside it', () => {
			const setNode = createMockNode('n8n-nodes-base.set', 'Set', {
				output: [{ json: { processedField: 'value' } }] as unknown as IDataObject[],
			});
			const setConns = new Map<string, Map<number, ConnectionTarget[]>>();
			setConns.set('main', new Map([[0, [conn('Consumer', 0)]]]));
			const setGraph = createGraphNode(setNode, setConns);

			const consumerNode = createMockNode('n8n-nodes-base.httpRequest', 'Consumer', {
				parameters: { url: '={{ $json.processedField }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Set', setGraph);
			nodes.set('Consumer', consumerGraph);

			const ctx = createMockPluginContext(nodes);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when ctx.pinData has json wrapper', () => {
			const triggerNode = createMockNode('n8n-nodes-base.manualTrigger', 'Trigger');
			const triggerConns = new Map<string, Map<number, ConnectionTarget[]>>();
			triggerConns.set('main', new Map([[0, [conn('Consumer', 0)]]]));
			const triggerGraph = createGraphNode(triggerNode, triggerConns);

			const consumerNode = createMockNode('n8n-nodes-base.set', 'Consumer', {
				parameters: { value: '={{ $json.name }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Trigger', triggerGraph);
			nodes.set('Consumer', consumerGraph);

			const pinData = {
				Trigger: [{ json: { name: 'John' } }] as unknown as IDataObject[],
			};

			const ctx = createMockPluginContext(nodes, pinData);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toHaveLength(0);
		});

		it('validates $("NodeName").item.json.field references', () => {
			const triggerNode = createMockNode('n8n-nodes-base.manualTrigger', 'Trigger');
			const triggerGraph = createGraphNode(triggerNode);

			const consumerNode = createMockNode('n8n-nodes-base.set', 'Consumer', {
				parameters: { value: '={{ $("Trigger").item.json.nonExistent }}' },
			});
			const consumerGraph = createGraphNode(consumerNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Trigger', triggerGraph);
			nodes.set('Consumer', consumerGraph);

			const pinData = {
				Trigger: [{ existingField: 'value' }],
			};

			const ctx = createMockPluginContext(nodes, pinData);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_EXPRESSION_PATH',
					severity: 'warning',
				}),
			);
		});

		it('does not produce false positive when chain target resolves via getConnections()', () => {
			// Simulates: nodeA.to(nodeB.to(nodeC))
			// nodeA stores a NodeChain target whose .name = tail (nodeC)
			// The validator should resolve to head (nodeB), not tail (nodeC)
			//
			// Chain: NodeA → NodeB → NodeC
			// NodeC uses $json.caption which only exists in NodeB's output
			// NodeA outputs { data: 'value' } (no caption)
			// NodeB outputs { caption: 'hello' }

			// NodeB connects to NodeC via graphNode.connections (correctly resolved)
			const nodeB = createMockNode('n8n-nodes-base.set', 'NodeB', {
				output: [{ caption: 'hello' }],
			});
			const nodeBConns = new Map<string, Map<number, ConnectionTarget[]>>();
			nodeBConns.set('main', new Map([[0, [conn('NodeC', 0)]]]));

			// NodeA has a getConnections() that returns a NodeChain target pointing to NodeB→NodeC chain
			// The chain's .name = 'NodeC' (tail), but head = 'NodeB'
			const nodeA = createMockNode('n8n-nodes-base.set', 'NodeA', {
				output: [{ data: 'value' }],
			});
			// Mock getConnections to return a chain-like target
			const chainTarget = {
				_isChain: true,
				head: { name: 'NodeB' },
				tail: { name: 'NodeC' },
				name: 'NodeC', // NodeChain proxies .name to tail
			};
			(nodeA as unknown as Record<string, unknown>).getConnections = () => [
				{ target: chainTarget, outputIndex: 0 },
			];

			const nodeC = createMockNode('n8n-nodes-base.set', 'NodeC', {
				parameters: { value: '={{ $json.caption }}' },
			});

			const nodes = new Map<string, GraphNode>();
			nodes.set('NodeA', createGraphNode(nodeA));
			nodes.set('NodeB', createGraphNode(nodeB, nodeBConns));
			nodes.set('NodeC', createGraphNode(nodeC));

			const ctx = createMockPluginContext(nodes);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			// Should produce NO warnings - $json.caption exists in NodeB (the direct predecessor)
			// Bug: without fix, NodeA is incorrectly identified as predecessor of NodeC
			// (because chain.name = 'NodeC'), causing a false PARTIAL_EXPRESSION_PATH warning
			expect(issues).toHaveLength(0);
		});

		it('deduplicates predecessors found from both connections map and getConnections()', () => {
			// When a connection exists in BOTH graphNode.connections AND getConnections(),
			// the predecessor should only be counted once in PARTIAL messages.
			// Setup: NodeA (has field) connects to NodeC via both paths,
			// NodeB (no field) also connects to NodeC → triggers PARTIAL

			const nodeA = createMockNode('n8n-nodes-base.set', 'NodeA', {
				output: [{ caption: 'hello' }],
			});
			// Connection in graphNode.connections
			const nodeAConns = new Map<string, Map<number, ConnectionTarget[]>>();
			nodeAConns.set('main', new Map([[0, [conn('NodeC', 0)]]]));
			// Also returned by getConnections() as a direct NodeInstance target
			(nodeA as unknown as Record<string, unknown>).getConnections = () => [
				{ target: { name: 'NodeC' }, outputIndex: 0 },
			];

			const nodeB = createMockNode('n8n-nodes-base.set', 'NodeB', {
				output: [{ other: 'value' }],
			});
			const nodeBConns = new Map<string, Map<number, ConnectionTarget[]>>();
			nodeBConns.set('main', new Map([[0, [conn('NodeC', 0)]]]));

			const nodeC = createMockNode('n8n-nodes-base.set', 'NodeC', {
				parameters: { value: '={{ $json.caption }}' },
			});

			const nodes = new Map<string, GraphNode>();
			nodes.set('NodeA', createGraphNode(nodeA, nodeAConns));
			nodes.set('NodeB', createGraphNode(nodeB, nodeBConns));
			nodes.set('NodeC', createGraphNode(nodeC));

			const ctx = createMockPluginContext(nodes);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			// Should have one PARTIAL warning with NodeA appearing exactly once
			expect(issues).toHaveLength(1);
			expect(issues[0]).toMatchObject({
				code: 'PARTIAL_EXPRESSION_PATH',
				severity: 'warning',
			});
			// Bug: without dedup, NodeA appears twice: "exists in [NodeA, NodeA]"
			const nodeAOccurrences = (issues[0].message.match(/NodeA/g) ?? []).length;
			expect(nodeAOccurrences).toBe(1);
		});

		it('returns PARTIAL_EXPRESSION_PATH when field exists in some but not all predecessors', () => {
			// Two predecessors connecting directly to Consumer (like after branching)
			const node1 = createMockNode('n8n-nodes-base.set', 'Set1');
			const node1Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			node1Conns.set('main', new Map([[0, [conn('Consumer', 0)]]]));

			const node2 = createMockNode('n8n-nodes-base.set', 'Set2');
			const node2Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			node2Conns.set('main', new Map([[0, [conn('Consumer', 0)]]]));

			const consumerNode = createMockNode('n8n-nodes-base.set', 'Consumer', {
				parameters: { value: '={{ $json.specificField }}' },
			});

			const nodes = new Map<string, GraphNode>();
			nodes.set('Set1', createGraphNode(node1, node1Conns));
			nodes.set('Set2', createGraphNode(node2, node2Conns));
			nodes.set('Consumer', createGraphNode(consumerNode));

			const pinData = {
				Set1: [{ specificField: 'value' }],
				Set2: [{ differentField: 'value' }],
			};

			const ctx = createMockPluginContext(nodes, pinData);
			const issues = expressionPathValidator.validateWorkflow!(ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'PARTIAL_EXPRESSION_PATH',
					severity: 'warning',
				}),
			);
		});
	});
});
