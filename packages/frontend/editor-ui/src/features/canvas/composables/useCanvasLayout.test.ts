import { useVueFlow, type GraphNode, type VueFlowStore } from '@vue-flow/core';
import { computed, ref } from 'vue';
import { createCanvasGraphEdge, createCanvasGraphNode } from '@/features/canvas/__tests__/utils';
import { CanvasNodeRenderType, type CanvasNodeData } from '../canvas.types';
import { useCanvasLayout, type CanvasLayoutResult } from './useCanvasLayout';
import { STICKY_NODE_TYPE } from '@/constants';
import { GRID_SIZE } from '@/utils/nodeViewUtils';

vi.mock('@vue-flow/core');

function matchesGrid(result: CanvasLayoutResult) {
	return result.nodes.every((node) => node.x % GRID_SIZE === 0 && node.y % GRID_SIZE === 0);
}

describe('useCanvasLayout', () => {
	function createTestSetup(
		nodes: Array<GraphNode<CanvasNodeData>>,
		connections: Array<[string, string]>,
		selectedNodeIds?: string[],
	) {
		const nodesById = Object.fromEntries(nodes.map((node) => [node.id, node]));
		const edges = connections.map(([sourceId, targetId]) =>
			createCanvasGraphEdge(nodesById[sourceId], nodesById[targetId]),
		);
		const edgesById = Object.fromEntries(edges.map((edge) => [edge.id, edge]));

		const selectedNodes = selectedNodeIds?.map((id) => nodesById[id]) ?? nodes;

		const vueFlowStoreMock = {
			nodes: ref(nodes),
			edges: ref(edges),
			getSelectedNodes: ref(selectedNodes),
			findNode: (nodeId: string) => nodesById[nodeId],
			findEdge: (edgeId: string) => edgesById[edgeId],
		} as unknown as VueFlowStore;

		vi.mocked(useVueFlow).mockReturnValue(vueFlowStoreMock);

		const { layout } = useCanvasLayout(
			'test-canvas-id',
			computed(() => false),
		);

		return { layout };
	}

	test('should layout a basic workflow', () => {
		const nodes = [
			createCanvasGraphNode({ id: 'node1' }),
			createCanvasGraphNode({ id: 'node2' }),
			createCanvasGraphNode({ id: 'node3' }),
		];

		const connections: Array<[string, string]> = [
			['node1', 'node2'],
			['node2', 'node3'],
		];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');

		expect(result).toMatchSnapshot();
		expect(matchesGrid(result)).toBe(true);
	});

	test('should layout a basic workflow with selected nodes', () => {
		const nodes = [
			createCanvasGraphNode({ id: 'node1' }),
			createCanvasGraphNode({ id: 'node2' }),
			createCanvasGraphNode({ id: 'node3' }),
			createCanvasGraphNode({ id: 'node4' }),
		];

		const connections: Array<[string, string]> = [
			['node1', 'node2'],
			['node2', 'node3'],
			['node3', 'node4'],
		];

		const { layout } = createTestSetup(nodes, connections, ['node1', 'node2', 'node3']);
		const result = layout('selection');
		expect(result).toMatchSnapshot();
		expect(matchesGrid(result)).toBe(true);
	});

	test('should layout a workflow with AI nodes', () => {
		const nodes = [
			createCanvasGraphNode({ id: 'node1' }),
			createCanvasGraphNode({
				id: 'aiAgent',
				data: { render: { type: CanvasNodeRenderType.Default, options: { configurable: true } } },
			}),
			createCanvasGraphNode({
				id: 'aiTool1',
				data: { render: { type: CanvasNodeRenderType.Default, options: { configuration: true } } },
			}),
			createCanvasGraphNode({
				id: 'aiTool2',
				data: { render: { type: CanvasNodeRenderType.Default, options: { configuration: true } } },
			}),
			createCanvasGraphNode({
				id: 'configurableAiTool',
				data: {
					render: {
						type: CanvasNodeRenderType.Default,
						options: { configurable: true, configuration: true },
					},
				},
			}),
			createCanvasGraphNode({
				id: 'aiTool3',
				data: { render: { type: CanvasNodeRenderType.Default, options: { configuration: true } } },
			}),
			createCanvasGraphNode({ id: 'node2' }),
		];

		const connections: Array<[string, string]> = [
			['node1', 'aiAgent'],
			['aiTool1', 'aiAgent'],
			['aiTool2', 'aiAgent'],
			['configurableAiTool', 'aiAgent'],
			['aiTool3', 'configurableAiTool'],
			['aiAgent', 'node2'],
		];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');
		expect(result).toMatchSnapshot();
		expect(matchesGrid(result)).toBe(true);
	});

	test('should layout a workflow with sticky notes', () => {
		const nodes = [
			createCanvasGraphNode({ id: 'node1', position: { x: 0, y: 0 } }),
			createCanvasGraphNode({ id: 'node2', position: { x: 500, y: 0 } }),
			createCanvasGraphNode({ id: 'node3', position: { x: 700, y: 0 } }),
			createCanvasGraphNode({ id: 'node4', position: { x: 1000, y: 0 } }),
			createCanvasGraphNode({
				id: 'sticky',
				data: { type: STICKY_NODE_TYPE },
				dimensions: { width: 500, height: 400 },
				position: { x: 400, y: -100 },
			}),
		];

		const connections: Array<[string, string]> = [
			['node1', 'node2'],
			['node2', 'node3'],
			['node3', 'node4'],
		];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');
		expect(result).toMatchSnapshot();
	});

	test('should not reorder nodes vertically as it affects execution order', () => {
		const nodes = [
			createCanvasGraphNode({ id: 'node1', position: { x: 0, y: 0 } }),
			createCanvasGraphNode({ id: 'node2', position: { x: 400, y: 208 } }),
			createCanvasGraphNode({ id: 'node3', position: { x: 400, y: -208 } }),
		];

		const connections: Array<[string, string]> = [
			['node1', 'node3'],
			['node1', 'node2'],
		];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');
		expect(result).toMatchSnapshot();
		expect(matchesGrid(result)).toBe(true);
	});

	test('should handle nodes with missing dimensions', () => {
		const nodes = [
			createCanvasGraphNode({
				id: 'node1',
				dimensions: undefined,
			}),
			createCanvasGraphNode({
				id: 'node2',
				dimensions: { width: 0, height: 0 },
			}),
			createCanvasGraphNode({
				id: 'node3',
				dimensions: { width: 100, height: 100 },
			}),
		];

		const connections: Array<[string, string]> = [
			['node1', 'node2'],
			['node2', 'node3'],
		];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');

		// Should complete without errors
		expect(result).toBeDefined();
		expect(result.nodes).toHaveLength(3);

		// All nodes should have valid positions
		result.nodes.forEach((node) => {
			expect(node.x).toBeDefined();
			expect(node.y).toBeDefined();
			expect(typeof node.x).toBe('number');
			expect(typeof node.y).toBe('number');
			expect(isFinite(node.x)).toBe(true);
			expect(isFinite(node.y)).toBe(true);
		});

		const node1 = result.nodes.find((n) => n.id === 'node1');
		const node2 = result.nodes.find((n) => n.id === 'node2');
		const node3 = result.nodes.find((n) => n.id === 'node3');

		assert(node1);
		assert(node2);
		assert(node3);

		// Nodes should be positioned in a logical order (node1 -> node2 -> node3)
		expect(node2.x).toBeGreaterThan(node1.x);
		expect(node3.x).toBeGreaterThan(node2.x);
	});

	test('should calculate dimensions for configurable nodes with missing dimensions', () => {
		const nodes = [
			createCanvasGraphNode({
				id: 'configurableNode',
				data: {
					render: {
						type: CanvasNodeRenderType.Default,
						options: { configurable: true },
					},
					inputs: [
						{ type: 'main', index: 0 },
						{ type: 'main', index: 1 },
						{ type: 'ai_tool', index: 0 },
					],
					outputs: [{ type: 'main', index: 0 }],
				},
				dimensions: undefined,
			}),
			createCanvasGraphNode({
				id: 'configurationNode',
				data: {
					render: {
						type: CanvasNodeRenderType.Default,
						options: { configuration: true },
					},
					inputs: [{ type: 'main', index: 0 }],
					outputs: [{ type: 'main', index: 0 }],
				},
				dimensions: { width: 0, height: 0 },
			}),
		];

		const connections: Array<[string, string]> = [['configurationNode', 'configurableNode']];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');

		expect(result).toBeDefined();
		expect(result.nodes).toHaveLength(2);

		// All nodes should have valid positions
		result.nodes.forEach((node) => {
			expect(node.x).toBeDefined();
			expect(node.y).toBeDefined();
			expect(typeof node.x).toBe('number');
			expect(typeof node.y).toBe('number');
			expect(isFinite(node.x)).toBe(true);
			expect(isFinite(node.y)).toBe(true);
		});

		// Both nodes should be positioned correctly
		const configNode = result.nodes.find((n) => n.id === 'configurationNode');
		const configurableNode = result.nodes.find((n) => n.id === 'configurableNode');

		assert(configNode);
		assert(configurableNode);

		expect(configNode).toBeDefined();
		expect(configurableNode).toBeDefined();

		// The layout should work despite missing dimensions
		// The exact positioning depends on whether they're recognized as AI nodes
		expect(
			Math.abs(configNode.x - configurableNode.x) + Math.abs(configNode.y - configurableNode.y),
		).toBeGreaterThan(0);
	});

	test('should handle mixed scenarios with sticky notes and missing dimensions', () => {
		const nodes = [
			createCanvasGraphNode({
				id: 'node1',
			}),
			createCanvasGraphNode({
				id: 'node2',
				dimensions: { width: 100, height: 100 },
			}),
			createCanvasGraphNode({
				id: 'sticky',
				data: { type: STICKY_NODE_TYPE },
				dimensions: { width: 500, height: 400 },
				position: { x: 0, y: -100 },
			}),
		];

		const connections: Array<[string, string]> = [['node1', 'node2']];

		const { layout } = createTestSetup(nodes, connections);
		const result = layout('all');

		expect(result).toBeDefined();
		// Should include both regular nodes and sticky
		expect(result.nodes.length).toBeGreaterThanOrEqual(2);

		// All nodes should have valid positions
		result.nodes.forEach((node) => {
			expect(node.x).toBeDefined();
			expect(node.y).toBeDefined();
			expect(typeof node.x).toBe('number');
			expect(typeof node.y).toBe('number');
			expect(isFinite(node.x)).toBe(true);
			expect(isFinite(node.y)).toBe(true);
		});

		// Non-sticky nodes should be positioned correctly
		const node1 = result.nodes.find((n) => n.id === 'node1');
		const node2 = result.nodes.find((n) => n.id === 'node2');

		assert(node1);
		assert(node2);

		expect(node2.x).toBeGreaterThan(node1.x);
	});
});
