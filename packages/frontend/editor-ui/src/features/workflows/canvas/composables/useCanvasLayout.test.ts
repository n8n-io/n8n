import { useVueFlow, type GraphNode, type VueFlowStore } from '@vue-flow/core';
import { computed, ref, shallowRef } from 'vue';
import {
	checkOverlap,
	createEmptyCanvasRenderData,
	type CanvasRenderData,
} from '@/features/workflows/canvas/canvas.utils';
import {
	createCanvasGraphEdge,
	createCanvasGraphGroupNode,
	createCanvasGraphNode,
} from '@/features/workflows/canvas/__tests__/utils';
import {
	CanvasNodeRenderType,
	createCanvasGroupNodeId,
	type CanvasGroupNodeData,
	type CanvasNodeData,
} from '../canvas.types';
import { useCanvasLayout, type CanvasLayoutResult } from './useCanvasLayout';
import { STICKY_NODE_TYPE } from '@/app/constants';
import { AGENT_NODE_SIZE, DEFAULT_NODE_SIZE, GRID_SIZE } from '@/app/utils/nodeViewUtils';
import type { INodeUi } from '@/Interface';
import { computeGroupFrameRects, computeNodesRectFromStore } from './useCanvasMapping.groups';
import {
	computeNodeGroupLayoutPushes,
	type NodeGroupLayoutComponent,
} from './useCanvasNodeGroupLayout';

vi.mock('@vue-flow/core');

function matchesGrid(result: CanvasLayoutResult) {
	return result.nodes.every((node) => node.x % GRID_SIZE === 0 && node.y % GRID_SIZE === 0);
}

describe('useCanvasLayout', () => {
	function createTestSetup(
		nodes: Array<GraphNode<CanvasNodeData> | GraphNode<CanvasGroupNodeData>>,
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
			shallowRef<CanvasRenderData>(createEmptyCanvasRenderData()),
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

	test('should use agent fallback dimensions and preserve center alignment when unmeasured', () => {
		const nodes = [
			createCanvasGraphNode({ id: 'node' }),
			createCanvasGraphNode({
				id: 'agent',
				data: { render: { type: CanvasNodeRenderType.Agent, options: {} } },
				dimensions: { width: 0, height: 0 },
			}),
		];

		const { layout } = createTestSetup(nodes, [['node', 'agent']]);
		const result = layout('all');
		const node = result.nodes.find(({ id }) => id === 'node');
		const agent = result.nodes.find(({ id }) => id === 'agent');

		assert(node);
		assert(agent);
		expect(result.boundingBox).toEqual({
			x: 0,
			y: 0,
			width: DEFAULT_NODE_SIZE[0] + GRID_SIZE * 8 + AGENT_NODE_SIZE[0],
			height: AGENT_NODE_SIZE[1],
		});
		expect(node.y + DEFAULT_NODE_SIZE[1] / 2).toBe(agent.y + AGENT_NODE_SIZE[1] / 2);
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

	describe('node groups', () => {
		const groupId = 'g1';
		const chipId = `group:${groupId}`;
		const expandedGroups = [
			{ id: 'approval', name: 'Approval', nodeIds: ['approval-start', 'approval-done'] },
			{ id: 'billing', name: 'Billing', nodeIds: ['billing-start', 'billing-done'] },
		];

		type NodePosition = { x: number; y: number };

		function toStoreNode(id: string, position: NodePosition): INodeUi {
			return {
				id,
				name: id,
				position: [position.x, position.y],
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				parameters: {},
			} as INodeUi;
		}

		function computeGroupFrames(positions: Map<string, NodePosition>) {
			const getNodeById = (id: string) => {
				const position = positions.get(id);
				return position ? toStoreNode(id, position) : undefined;
			};

			return expandedGroups.map((group) => ({
				name: group.name,
				frame: computeGroupFrameRects(computeNodesRectFromStore(group.nodeIds, getNodeById))
					.expanded,
			}));
		}

		function findOverlappingGroupPairs(positions: Map<string, NodePosition>): string[] {
			const frames = computeGroupFrames(positions);
			const pairs: string[] = [];
			for (let i = 0; i < frames.length; i++) {
				for (let j = i + 1; j < frames.length; j++) {
					if (checkOverlap(frames[i].frame, frames[j].frame)) {
						pairs.push(`${frames[i].name} overlaps ${frames[j].name}`);
					}
				}
			}
			return pairs;
		}

		function computeGroupLayoutComponents(
			positions: Map<string, NodePosition>,
		): NodeGroupLayoutComponent[] {
			const getNodeById = (id: string) => {
				const position = positions.get(id);
				return position ? toStoreNode(id, position) : undefined;
			};

			return expandedGroups.map((group) => {
				const { collapsed, expanded } = computeGroupFrameRects(
					computeNodesRectFromStore(group.nodeIds, getNodeById),
				);

				return {
					id: createCanvasGroupNodeId(group.id),
					kind: 'group',
					groupId: group.id,
					nodeIds: [...group.nodeIds],
					rect: expanded,
					collapsedRect: collapsed,
					expandedRect: expanded,
				};
			});
		}

		function createCollapsedGroupSetup() {
			// Use a grid-aligned gap so snap-to-grid preserves the relative spacing
			const m1 = createCanvasGraphNode({ id: 'm1', position: { x: 1008, y: 1008 } });
			const m2 = createCanvasGraphNode({ id: 'm2', position: { x: 1104, y: 1008 } });
			const before = createCanvasGraphNode({ id: 'before', position: { x: 0, y: 0 } });
			const after = createCanvasGraphNode({ id: 'after', position: { x: 2000, y: 0 } });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['m1', 'm2'],
				isCollapsed: true,
				nodesRect: { x: 1008, y: 1008, width: 192, height: 96 },
				position: { x: 944, y: 908 },
			});

			const nodes = [before, m1, m2, after, group];
			const connections: Array<[string, string]> = [
				['before', chipId],
				[chipId, 'after'],
			];

			return createTestSetup(nodes, connections);
		}

		function createExpandedGroupFrameSetup() {
			const graphNodes = [
				createCanvasGraphNode({ id: 'source', position: { x: 0, y: 120 } }),
				createCanvasGraphNode({ id: 'approval-start', position: { x: 384, y: 0 } }),
				createCanvasGraphNode({ id: 'approval-done', position: { x: 608, y: 0 } }),
				createCanvasGraphNode({ id: 'billing-start', position: { x: 384, y: 320 } }),
				createCanvasGraphNode({ id: 'billing-done', position: { x: 608, y: 320 } }),
				createCanvasGraphNode({ id: 'merge', position: { x: 896, y: 120 } }),
			];
			const initialPositions = new Map(graphNodes.map((node) => [node.id, node.position]));

			const groupNodes = expandedGroups.map((group) => {
				const getNodeById = (id: string) => {
					const position = initialPositions.get(id);
					return position ? toStoreNode(id, position) : undefined;
				};
				const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById);
				const frame = computeGroupFrameRects(nodesRect).expanded;
				return createCanvasGraphGroupNode({
					id: group.id,
					nodeIds: [...group.nodeIds],
					isCollapsed: false,
					position: { x: frame.x, y: frame.y },
					nodesRect,
				});
			});

			const connections: Array<[string, string]> = [
				['source', 'approval-start'],
				['approval-start', 'approval-done'],
				['approval-done', 'merge'],
				['source', 'billing-start'],
				['billing-start', 'billing-done'],
				['billing-done', 'merge'],
			];

			return createTestSetup([...graphNodes, ...groupNodes], connections);
		}

		test('lays out a collapsed group as a unit, preserving member offsets and dropping the chip', () => {
			const { layout } = createCollapsedGroupSetup();
			const result = layout('all');

			const ids = result.nodes.map((n) => n.id);
			expect(ids).toContain('m1');
			expect(ids).toContain('m2');
			// Chip is placed from its members, never emitted as a node.
			expect(ids).not.toContain(chipId);

			const rm1 = result.nodes.find((n) => n.id === 'm1');
			const rm2 = result.nodes.find((n) => n.id === 'm2');
			assert(rm1);
			assert(rm2);

			// Members move as a block, keeping their relative offset.
			expect(rm2.x - rm1.x).toBe(96);
			expect(rm2.y - rm1.y).toBe(0);
			expect(matchesGrid(result)).toBe(true);
		});

		test('keeps a collapsed group clustered between its external neighbours', () => {
			const { layout } = createCollapsedGroupSetup();
			const result = layout('all');

			const before = result.nodes.find((n) => n.id === 'before');
			const after = result.nodes.find((n) => n.id === 'after');
			const rm1 = result.nodes.find((n) => n.id === 'm1');
			const rm2 = result.nodes.find((n) => n.id === 'm2');
			assert(before);
			assert(after);
			assert(rm1);
			assert(rm2);

			expect(before.x).toBeLessThan(rm1.x);
			expect(after.x).toBeGreaterThan(rm2.x);
		});

		test('keeps a top-left collapsed group anchored in place', () => {
			// Group owns the top-left corner, where the chip box (944, 908) and the
			// member box (1008, 1008) disagree — the anchor must not absorb that gap.
			const m1 = createCanvasGraphNode({ id: 'm1', position: { x: 1008, y: 1008 } });
			const m2 = createCanvasGraphNode({ id: 'm2', position: { x: 1104, y: 1008 } });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['m1', 'm2'],
				isCollapsed: true,
				nodesRect: { x: 1008, y: 1008, width: 192, height: 96 },
				position: { x: 944, y: 908 },
			});

			const { layout } = createTestSetup([m1, m2, group], []);
			const result = layout('all');

			const rm1 = result.nodes.find((n) => n.id === 'm1');
			assert(rm1);
			// A lone group has nothing to re-flow, so its members stay put.
			expect(rm1).toMatchObject({ x: 1008, y: 1008 });
		});

		test('lays out an expanded group as a unit, preserving member offsets and dropping the chip', () => {
			const m1 = createCanvasGraphNode({ id: 'm1', position: { x: 1008, y: 1008 } });
			const m2 = createCanvasGraphNode({ id: 'm2', position: { x: 1104, y: 1008 } });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['m1', 'm2'],
				isCollapsed: false,
				nodesRect: { x: 96, y: 96, width: 192, height: 96 },
				position: { x: 944, y: 908 },
			});

			const nodes = [m1, m2, group];
			const connections: Array<[string, string]> = [['m1', 'm2']];

			const { layout } = createTestSetup(nodes, connections);
			const result = layout('all');

			const ids = result.nodes.map((n) => n.id);
			expect(ids).toContain('m1');
			expect(ids).toContain('m2');
			expect(ids).not.toContain(chipId);

			const rm1 = result.nodes.find((n) => n.id === 'm1');
			const rm2 = result.nodes.find((n) => n.id === 'm2');
			assert(rm1);
			assert(rm2);
			expect(rm2.x - rm1.x).toBe(96);
			expect(rm2.y - rm1.y).toBe(0);
			expect(matchesGrid(result)).toBe(true);
		});

		function createStickyOverGroupSetup(isCollapsed: boolean) {
			const before = createCanvasGraphNode({ id: 'before', position: { x: 0, y: 0 } });
			const m1 = createCanvasGraphNode({ id: 'm1', position: { x: 1008, y: 1008 } });
			const m2 = createCanvasGraphNode({ id: 'm2', position: { x: 1104, y: 1008 } });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['m1', 'm2'],
				isCollapsed,
				nodesRect: { x: 1008, y: 1008, width: 192, height: 96 },
				position: { x: 944, y: 908 },
			});
			// Covers the whole group frame, not only its members
			const sticky = createCanvasGraphNode({
				id: 'sticky',
				data: { type: STICKY_NODE_TYPE },
				dimensions: { width: 800, height: 600 },
				position: { x: 800, y: 700 },
			});

			const nodes = [before, m1, m2, group, sticky];
			const connections: Array<[string, string]> = [['before', isCollapsed ? chipId : 'm1']];

			return createTestSetup(nodes, connections);
		}

		test.each([
			['an expanded', false],
			['a collapsed', true],
		])('moves a sticky note covering %s group along with its members', (_, isCollapsed) => {
			const { layout } = createStickyOverGroupSetup(isCollapsed);
			const result = layout('all');

			const sticky = result.nodes.find((n) => n.id === 'sticky');
			const rm1 = result.nodes.find((n) => n.id === 'm1');
			const rm2 = result.nodes.find((n) => n.id === 'm2');
			assert(sticky);
			assert(rm1);
			assert(rm2);

			expect(Number.isFinite(sticky.x)).toBe(true);
			expect(Number.isFinite(sticky.y)).toBe(true);
			expect(matchesGrid(result)).toBe(true);

			// The sticky still spans the members after they moved
			expect(sticky.x).toBeLessThanOrEqual(rm1.x);
			expect(sticky.x + 800).toBeGreaterThanOrEqual(rm2.x + DEFAULT_NODE_SIZE[0]);
			expect(sticky.y).toBeLessThanOrEqual(rm1.y);
			expect(sticky.y + 600).toBeGreaterThanOrEqual(rm1.y + DEFAULT_NODE_SIZE[1]);
		});

		test('leaves a sticky note alone when it covers no node or group', () => {
			const { layout } = createTestSetup(
				[
					createCanvasGraphNode({ id: 'm1', position: { x: 1008, y: 1008 } }),
					createCanvasGraphGroupNode({
						id: groupId,
						nodeIds: ['m1'],
						isCollapsed: false,
						nodesRect: { x: 1008, y: 1008, width: 96, height: 96 },
						position: { x: 944, y: 908 },
					}),
					createCanvasGraphNode({
						id: 'sticky',
						data: { type: STICKY_NODE_TYPE },
						dimensions: { width: 200, height: 200 },
						position: { x: -2000, y: -2000 },
					}),
				],
				[],
			);

			const result = layout('all');

			expect(result.nodes.map((n) => n.id)).not.toContain('sticky');
		});

		function createStickyOverParallelGroupsSetup(stickyBox: {
			x: number;
			y: number;
			width: number;
			height: number;
		}) {
			const positions = new Map<string, NodePosition>([
				['trigger', { x: 320, y: -48 }],
				['approval-start', { x: 560, y: 80 }],
				['approval-done', { x: 784, y: 80 }],
				['billing-start', { x: 1248, y: 240 }],
				['billing-done', { x: 1472, y: 240 }],
			]);
			const getNodeById = (id: string) => {
				const position = positions.get(id);
				return position ? toStoreNode(id, position) : undefined;
			};
			const groupNodes = expandedGroups.map((group) => {
				const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById);
				const frame = computeGroupFrameRects(nodesRect).expanded;
				return createCanvasGraphGroupNode({
					id: group.id,
					nodeIds: [...group.nodeIds],
					isCollapsed: false,
					position: { x: frame.x, y: frame.y },
					nodesRect,
				});
			});
			const nodes = [
				...[...positions].map(([id, position]) => createCanvasGraphNode({ id, position })),
				...groupNodes,
				createCanvasGraphNode({
					id: 'sticky',
					data: { type: STICKY_NODE_TYPE },
					dimensions: { width: stickyBox.width, height: stickyBox.height },
					position: { x: stickyBox.x, y: stickyBox.y },
				}),
			];
			const connections: Array<[string, string]> = [
				['trigger', 'approval-start'],
				['approval-start', 'approval-done'],
				['trigger', 'billing-start'],
				['billing-start', 'billing-done'],
			];

			return createTestSetup(nodes, connections);
		}

		function toPositions(result: CanvasLayoutResult) {
			return new Map(result.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
		}

		function stickyBoxAfter(result: CanvasLayoutResult, width: number, height: number) {
			const sticky = result.nodes.find((n) => n.id === 'sticky');
			assert(sticky);
			return { x: sticky.x, y: sticky.y, width, height };
		}

		test('reserves room for a sticky note that covers a group', () => {
			// Covers the billing frame only; much taller than the frame
			const { layout } = createStickyOverParallelGroupsSetup({
				x: 1072,
				y: -112,
				width: 704,
				height: 688,
			});
			const result = layout('all');
			const positions = toPositions(result);
			const sticky = stickyBoxAfter(result, 704, 688);
			const frames = computeGroupFrames(positions);
			const approval = frames.find((f) => f.name === 'Approval');
			const billing = frames.find((f) => f.name === 'Billing');
			assert(approval);
			assert(billing);

			// The sticky moved rigidly with the group it covers
			expect(checkOverlap(sticky, approval.frame)).toBe(false);
			expect(sticky.x - positions.get('billing-start')!.x).toBe(1072 - 1248);
			expect(sticky.y - positions.get('billing-start')!.y).toBe(-112 - 240);
			expect(matchesGrid(result)).toBe(true);
		});

		test('falls back to following covered nodes when a sticky note spans two groups', () => {
			const { layout } = createStickyOverParallelGroupsSetup({
				x: 400,
				y: -200,
				width: 1400,
				height: 800,
			});
			const result = layout('all');
			const positions = toPositions(result);
			const sticky = stickyBoxAfter(result, 1400, 800);

			for (const id of expandedGroups.flatMap((group) => group.nodeIds)) {
				const position = positions.get(id);
				assert(position);
				expect(
					checkOverlap(sticky, {
						...position,
						width: DEFAULT_NODE_SIZE[0],
						height: DEFAULT_NODE_SIZE[1],
					}),
				).toBe(true);
			}
		});

		test('falls back when a sticky note covers a group and an ungrouped node', () => {
			// Covers the trigger and the approval frame
			const { layout } = createStickyOverParallelGroupsSetup({
				x: 200,
				y: -400,
				width: 800,
				height: 800,
			});
			const result = layout('all');
			const positions = toPositions(result);
			const sticky = stickyBoxAfter(result, 800, 800);

			for (const id of ['trigger', 'approval-start', 'approval-done']) {
				const position = positions.get(id);
				assert(position);
				expect(
					checkOverlap(sticky, {
						...position,
						width: DEFAULT_NODE_SIZE[0],
						height: DEFAULT_NODE_SIZE[1],
					}),
				).toBe(true);
			}
		});

		test.each([
			['without', false],
			['with', true],
		])(
			'keeps a chain through an expanded group on the connection axis %s a covering sticky note',
			(_, withSticky) => {
				const before = createCanvasGraphNode({ id: 'before', position: { x: 0, y: 240 } });
				const m1 = createCanvasGraphNode({ id: 'm1', position: { x: 1248, y: 240 } });
				const m2 = createCanvasGraphNode({ id: 'm2', position: { x: 1472, y: 240 } });
				const after = createCanvasGraphNode({ id: 'after', position: { x: 2000, y: 240 } });
				const nodesRect = computeNodesRectFromStore(['m1', 'm2'], (id) =>
					toStoreNode(id, id === 'm1' ? m1.position : m2.position),
				);
				const frame = computeGroupFrameRects(nodesRect).expanded;
				const group = createCanvasGraphGroupNode({
					id: groupId,
					nodeIds: ['m1', 'm2'],
					isCollapsed: false,
					position: { x: frame.x, y: frame.y },
					nodesRect,
				});
				const nodes = [before, m1, m2, after, group];
				if (withSticky) {
					nodes.push(
						createCanvasGraphNode({
							id: 'sticky',
							data: { type: STICKY_NODE_TYPE },
							dimensions: { width: 704, height: 688 },
							position: { x: 1072, y: -112 },
						}),
					);
				}

				const { layout } = createTestSetup(nodes, [
					['before', 'm1'],
					['m2', 'after'],
				]);
				const result = layout('all');
				const positions = toPositions(result);

				const y = positions.get('before')!.y;
				expect(positions.get('m1')!.y).toBe(y);
				expect(positions.get('m2')!.y).toBe(y);
				expect(positions.get('after')!.y).toBe(y);
			},
		);

		test('keeps an expanded group clustered between its external neighbours', () => {
			const m1 = createCanvasGraphNode({ id: 'm1', position: { x: 1008, y: 1008 } });
			const m2 = createCanvasGraphNode({ id: 'm2', position: { x: 1104, y: 1008 } });
			const before = createCanvasGraphNode({ id: 'before', position: { x: 0, y: 0 } });
			const after = createCanvasGraphNode({ id: 'after', position: { x: 2000, y: 0 } });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['m1', 'm2'],
				isCollapsed: false,
				nodesRect: { x: 1008, y: 1008, width: 192, height: 96 },
				position: { x: 944, y: 908 },
			});

			const nodes = [before, m1, m2, after, group];
			const connections: Array<[string, string]> = [
				['before', 'm1'],
				['m2', 'after'],
			];

			const { layout } = createTestSetup(nodes, connections);
			const result = layout('all');

			const beforeResult = result.nodes.find((n) => n.id === 'before');
			const afterResult = result.nodes.find((n) => n.id === 'after');
			const rm1 = result.nodes.find((n) => n.id === 'm1');
			const rm2 = result.nodes.find((n) => n.id === 'm2');
			assert(beforeResult);
			assert(afterResult);
			assert(rm1);
			assert(rm2);

			expect(beforeResult.x).toBeLessThan(rm1.x);
			expect(afterResult.x).toBeGreaterThan(rm2.x);
			expect(rm2.x - rm1.x).toBe(96);
			expect(rm2.y - rm1.y).toBe(0);
		});

		test('lays out expanded groups without overlapping their frames', () => {
			const { layout } = createExpandedGroupFrameSetup();

			const result = layout('all');
			const positions = new Map(result.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));

			expect(findOverlappingGroupPairs(positions)).toEqual([]);
			expect(
				computeNodeGroupLayoutPushes({
					components: computeGroupLayoutComponents(positions),
					expandedGroupIds: new Set(expandedGroups.map((group) => group.id)),
					expandedGroupIdOrder: expandedGroups.map((group) => group.id),
				}),
			).toEqual([]);
		});

		test('uses the store nodes rect when spacing expanded group frames', () => {
			const source = createCanvasGraphNode({ id: 'source', position: { x: 0, y: 64 } });
			const top = createCanvasGraphNode({ id: 'top', position: { x: 384, y: 0 } });
			const bottom = createCanvasGraphNode({ id: 'bottom', position: { x: 384, y: 128 } });
			const merge = createCanvasGraphNode({ id: 'merge', position: { x: 800, y: 64 } });
			const topNodesRect = { x: 384, y: 0, width: 96, height: 1024 };
			const bottomNodesRect = { x: 384, y: 128, width: 96, height: 1024 };
			const topFrame = computeGroupFrameRects(topNodesRect).expanded;
			const bottomFrame = computeGroupFrameRects(bottomNodesRect).expanded;
			const topGroup = createCanvasGraphGroupNode({
				id: 'top-group',
				nodeIds: ['top'],
				isCollapsed: false,
				nodesRect: topNodesRect,
				position: { x: topFrame.x, y: topFrame.y },
			});
			const bottomGroup = createCanvasGraphGroupNode({
				id: 'bottom-group',
				nodeIds: ['bottom'],
				isCollapsed: false,
				nodesRect: bottomNodesRect,
				position: { x: bottomFrame.x, y: bottomFrame.y },
			});
			const nodes = [source, top, bottom, merge, topGroup, bottomGroup];
			const connections: Array<[string, string]> = [
				['source', 'top'],
				['top', 'merge'],
				['source', 'bottom'],
				['bottom', 'merge'],
			];

			const { layout } = createTestSetup(nodes, connections);
			const result = layout('all');
			const positions = new Map(result.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
			const shiftedFrame = (
				group: GraphNode<CanvasGroupNodeData>,
				member: GraphNode<CanvasNodeData>,
			) => {
				const memberPosition = positions.get(member.id);
				assert(memberPosition);
				const groupData = group.data;
				assert(groupData);
				const delta = {
					x: memberPosition.x - member.position.x,
					y: memberPosition.y - member.position.y,
				};
				return computeGroupFrameRects({
					...groupData.nodesRect,
					x: groupData.nodesRect.x + delta.x,
					y: groupData.nodesRect.y + delta.y,
				}).expanded;
			};

			expect(checkOverlap(shiftedFrame(topGroup, top), shiftedFrame(bottomGroup, bottom))).toBe(
				false,
			);
		});

		test('keeps expanded group members as plain nodes for a partial selection', () => {
			const m1 = createCanvasGraphNode({ id: 'm1' });
			const m2 = createCanvasGraphNode({ id: 'm2' });
			const after = createCanvasGraphNode({ id: 'after' });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['m1', 'm2'],
				isCollapsed: false,
				nodesRect: { x: 96, y: 96, width: 192, height: 96 },
			});

			const nodes = [m1, m2, after, group];
			const connections: Array<[string, string]> = [['m1', 'after']];

			const { layout } = createTestSetup(nodes, connections, ['m1', 'after']);
			const result = layout('selection');
			const ids = result.nodes.map((n) => n.id);

			expect(ids).toContain('m1');
			expect(ids).toContain('after');
			expect(ids).not.toContain('m2');
			expect(ids).not.toContain(chipId);

			const rm1 = result.nodes.find((n) => n.id === 'm1');
			const afterResult = result.nodes.find((n) => n.id === 'after');
			assert(rm1);
			assert(afterResult);
			expect(afterResult.x).toBeGreaterThan(rm1.x);
		});

		test('preserves an AI subtree inside an expanded group as a block', () => {
			const before = createCanvasGraphNode({ id: 'before', position: { x: 0, y: 96 } });
			const aiAgent = createCanvasGraphNode({
				id: 'aiAgent',
				position: { x: 384, y: 96 },
				data: {
					render: {
						type: CanvasNodeRenderType.Default,
						options: { configurable: true },
					},
				},
			});
			const aiTool = createCanvasGraphNode({
				id: 'aiTool',
				position: { x: 384, y: 240 },
				data: {
					render: {
						type: CanvasNodeRenderType.Default,
						options: { configuration: true },
					},
				},
			});
			const after = createCanvasGraphNode({ id: 'after', position: { x: 1000, y: 96 } });
			const group = createCanvasGraphGroupNode({
				id: groupId,
				nodeIds: ['aiAgent', 'aiTool'],
				isCollapsed: false,
				nodesRect: { x: 384, y: 96, width: 96, height: 240 },
				position: { x: 320, y: -4 },
			});

			const nodes = [before, aiAgent, aiTool, after, group];
			const connections: Array<[string, string]> = [
				['before', 'aiAgent'],
				['aiTool', 'aiAgent'],
				['aiAgent', 'after'],
			];

			const { layout } = createTestSetup(nodes, connections);
			const result = layout('all');

			const resultAgent = result.nodes.find((n) => n.id === 'aiAgent');
			const resultTool = result.nodes.find((n) => n.id === 'aiTool');
			assert(resultAgent);
			assert(resultTool);

			expect(resultTool.x - resultAgent.x).toBe(aiTool.position.x - aiAgent.position.x);
			expect(resultTool.y - resultAgent.y).toBe(aiTool.position.y - aiAgent.position.y);
		});

		test('supports collapsed and expanded group units in the same layout', () => {
			const c1 = createCanvasGraphNode({ id: 'c1', position: { x: 1008, y: 1008 } });
			const c2 = createCanvasGraphNode({ id: 'c2', position: { x: 1104, y: 1008 } });
			const e1 = createCanvasGraphNode({ id: 'e1', position: { x: 1600, y: 1008 } });
			const e2 = createCanvasGraphNode({ id: 'e2', position: { x: 1696, y: 1008 } });
			const collapsedGroup = createCanvasGraphGroupNode({
				id: 'collapsed',
				nodeIds: ['c1', 'c2'],
				isCollapsed: true,
				nodesRect: { x: 1008, y: 1008, width: 192, height: 96 },
				position: { x: 944, y: 908 },
			});
			const expandedGroup = createCanvasGraphGroupNode({
				id: 'expanded',
				nodeIds: ['e1', 'e2'],
				isCollapsed: false,
				nodesRect: { x: 1600, y: 1008, width: 192, height: 96 },
				position: { x: 1536, y: 908 },
			});

			const nodes = [c1, c2, e1, e2, collapsedGroup, expandedGroup];
			const connections: Array<[string, string]> = [
				['group:collapsed', 'e1'],
				['e2', 'c1'],
			];

			const { layout } = createTestSetup(nodes, connections);
			const result = layout('all');

			const ids = result.nodes.map((n) => n.id);
			expect(ids).not.toContain('group:collapsed');
			expect(ids).not.toContain('group:expanded');

			const rc1 = result.nodes.find((n) => n.id === 'c1');
			const rc2 = result.nodes.find((n) => n.id === 'c2');
			const re1 = result.nodes.find((n) => n.id === 'e1');
			const re2 = result.nodes.find((n) => n.id === 'e2');
			assert(rc1);
			assert(rc2);
			assert(re1);
			assert(re2);

			expect(rc2.x - rc1.x).toBe(96);
			expect(rc2.y - rc1.y).toBe(0);
			expect(re2.x - re1.x).toBe(96);
			expect(re2.y - re1.y).toBe(0);
		});
	});
});
