import { mergeNodeValidator } from './merge-node-validator';
import type { GraphNode, NodeInstance, ConnectionTarget } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance
function createMockNode(type: string, name: string): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: {},
		},
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a connection target
function conn(node: string, index: number): ConnectionTarget {
	return { node, type: 'main', index };
}

// Helper to create a mock graph node with connections
function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return {
		instance: node,
		connections,
	};
}

// Helper to create a mock plugin context with nodes
function createMockPluginContext(nodes: Map<string, GraphNode> = new Map()): PluginContext {
	return {
		nodes,
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('mergeNodeValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(mergeNodeValidator.id).toBe('core:merge-node');
		});

		it('has correct name', () => {
			expect(mergeNodeValidator.name).toBe('Merge Node Validator');
		});

		it('nodeTypes includes merge node type', () => {
			expect(mergeNodeValidator.nodeTypes).toContain('n8n-nodes-base.merge');
		});
	});

	describe('validateNode', () => {
		it('returns MERGE_SINGLE_INPUT warning when merge node has only 1 input connection', () => {
			// Create a merge node
			const mergeNode = createMockNode('n8n-nodes-base.merge', 'Merge');

			// Create a source node with connection to merge
			const sourceNode = createMockNode('n8n-nodes-base.set', 'Source');
			const sourceConnections = new Map<string, Map<number, ConnectionTarget[]>>();
			sourceConnections.set('main', new Map([[0, [conn('Merge', 0)]]]));
			const sourceGraphNode = createGraphNode(sourceNode, sourceConnections);

			// Create the merge graph node
			const mergeGraphNode = createGraphNode(mergeNode);

			// Build the context with both nodes
			const nodes = new Map<string, GraphNode>();
			nodes.set('Source', sourceGraphNode);
			nodes.set('Merge', mergeGraphNode);
			const ctx = createMockPluginContext(nodes);

			const issues = mergeNodeValidator.validateNode(mergeNode, mergeGraphNode, ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'MERGE_SINGLE_INPUT',
					severity: 'warning',
				}),
			);
		});

		it('returns MERGE_SINGLE_INPUT warning when merge node has 0 input connections', () => {
			const mergeNode = createMockNode('n8n-nodes-base.merge', 'Merge');
			const mergeGraphNode = createGraphNode(mergeNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('Merge', mergeGraphNode);
			const ctx = createMockPluginContext(nodes);

			const issues = mergeNodeValidator.validateNode(mergeNode, mergeGraphNode, ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'MERGE_SINGLE_INPUT',
					severity: 'warning',
				}),
			);
		});

		it('returns no warning when merge node has 2 input connections', () => {
			const mergeNode = createMockNode('n8n-nodes-base.merge', 'Merge');
			const mergeGraphNode = createGraphNode(mergeNode);

			// Create two source nodes with connections to different inputs of merge
			const source1 = createMockNode('n8n-nodes-base.set', 'Source1');
			const source1Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source1Conns.set('main', new Map([[0, [conn('Merge', 0)]]]));

			const source2 = createMockNode('n8n-nodes-base.set', 'Source2');
			const source2Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source2Conns.set('main', new Map([[0, [conn('Merge', 1)]]]));

			const nodes = new Map<string, GraphNode>();
			nodes.set('Source1', createGraphNode(source1, source1Conns));
			nodes.set('Source2', createGraphNode(source2, source2Conns));
			nodes.set('Merge', mergeGraphNode);
			const ctx = createMockPluginContext(nodes);

			const issues = mergeNodeValidator.validateNode(mergeNode, mergeGraphNode, ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when merge node has more than 2 input connections', () => {
			const mergeNode = createMockNode('n8n-nodes-base.merge', 'Merge');
			const mergeGraphNode = createGraphNode(mergeNode);

			// Create three source nodes
			const source1 = createMockNode('n8n-nodes-base.set', 'Source1');
			const source1Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source1Conns.set('main', new Map([[0, [conn('Merge', 0)]]]));

			const source2 = createMockNode('n8n-nodes-base.set', 'Source2');
			const source2Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source2Conns.set('main', new Map([[0, [conn('Merge', 1)]]]));

			const source3 = createMockNode('n8n-nodes-base.set', 'Source3');
			const source3Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source3Conns.set('main', new Map([[0, [conn('Merge', 2)]]]));

			const nodes = new Map<string, GraphNode>();
			nodes.set('Source1', createGraphNode(source1, source1Conns));
			nodes.set('Source2', createGraphNode(source2, source2Conns));
			nodes.set('Source3', createGraphNode(source3, source3Conns));
			nodes.set('Merge', mergeGraphNode);
			const ctx = createMockPluginContext(nodes);

			const issues = mergeNodeValidator.validateNode(mergeNode, mergeGraphNode, ctx);

			expect(issues).toHaveLength(0);
		});

		it('counts distinct input indices (multiple connections to same input count as 1)', () => {
			const mergeNode = createMockNode('n8n-nodes-base.merge', 'Merge');
			const mergeGraphNode = createGraphNode(mergeNode);

			// Both sources connect to the same input index (0)
			const source1 = createMockNode('n8n-nodes-base.set', 'Source1');
			const source1Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source1Conns.set('main', new Map([[0, [conn('Merge', 0)]]]));

			const source2 = createMockNode('n8n-nodes-base.set', 'Source2');
			const source2Conns = new Map<string, Map<number, ConnectionTarget[]>>();
			source2Conns.set('main', new Map([[0, [conn('Merge', 0)]]])); // Same index!

			const nodes = new Map<string, GraphNode>();
			nodes.set('Source1', createGraphNode(source1, source1Conns));
			nodes.set('Source2', createGraphNode(source2, source2Conns));
			nodes.set('Merge', mergeGraphNode);
			const ctx = createMockPluginContext(nodes);

			const issues = mergeNodeValidator.validateNode(mergeNode, mergeGraphNode, ctx);

			// Should warn because only 1 distinct input index
			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'MERGE_SINGLE_INPUT',
					severity: 'warning',
				}),
			);
		});

		it('includes nodeName in issues', () => {
			const mergeNode = createMockNode('n8n-nodes-base.merge', 'My Merge Node');
			const mergeGraphNode = createGraphNode(mergeNode);

			const nodes = new Map<string, GraphNode>();
			nodes.set('My Merge Node', mergeGraphNode);
			const ctx = createMockPluginContext(nodes);

			const issues = mergeNodeValidator.validateNode(mergeNode, mergeGraphNode, ctx);

			expect(issues[0]?.nodeName).toBe('My Merge Node');
		});
	});
});
