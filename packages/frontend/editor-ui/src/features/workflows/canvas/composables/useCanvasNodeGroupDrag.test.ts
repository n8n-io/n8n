import { describe, expect, it, vi } from 'vitest';
import type { GraphNode, NodeDragEvent } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import { useCanvasNodeGroupDrag } from './useCanvasNodeGroupDrag';
import { CANVAS_NODE_GROUP_TYPE } from '../canvas.types';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';

const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

const updateNodeMock = vi.fn();
const findNodeMock = vi.fn();
vi.mock('@vue-flow/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@vue-flow/core')>();
	return {
		...actual,
		useVueFlow: () => ({ updateNode: updateNodeMock, findNode: findNodeMock }),
	};
});

function makeGroupGraphNode(id: string, x: number, y: number): GraphNode {
	return {
		id,
		type: CANVAS_NODE_GROUP_TYPE,
		position: { x, y },
	} as unknown as GraphNode;
}

function makeRegularGraphNode(id: string, x = 0, y = 0): GraphNode {
	return {
		id,
		type: 'canvas-node',
		position: { x, y },
	} as unknown as GraphNode;
}

function makeStoredNode(id: string, x: number, y: number): INodeUi {
	return {
		id,
		name: id,
		type: 'n8n-nodes-base.noop',
		typeVersion: 1,
		position: [x, y] as [number, number],
		parameters: {},
		disabled: false,
	} as INodeUi;
}

function makeEvent(node: GraphNode): NodeDragEvent {
	return { node, nodes: [node] } as unknown as NodeDragEvent;
}

function makeSelectionEvent(...nodes: GraphNode[]): NodeDragEvent {
	return { node: nodes[0], nodes } as unknown as NodeDragEvent;
}

describe('useCanvasNodeGroupDrag', () => {
	function setup(opts?: {
		getNodeDimensions?: (id: string) => { width: number; height: number } | undefined;
	}) {
		updateNodeMock.mockClear();
		findNodeMock.mockReset();
		const store = new Map<string, INodeUi>([
			['a', makeStoredNode('a', 100, 200)],
			['b', makeStoredNode('b', 300, 200)],
			['c', makeStoredNode('c', 500, 500)],
			['d', makeStoredNode('d', 700, 500)],
		]);
		const groups = [
			{ id: 'g1', nodeIds: ['a', 'b'] },
			{ id: 'g2', nodeIds: ['c', 'd'] },
		];
		const drag = useCanvasNodeGroupDrag({
			getNodeById: (id) => store.get(id),
			getGroupById: (id) => groups.find((g) => g.id === id),
			getGroupForNode: (id) => groups.find((g) => g.nodeIds.includes(id)),
			getNodeDimensions: opts?.getNodeDimensions,
		});
		return { drag };
	}

	it('ignores drag events on nodes that are not in any group', () => {
		const { drag } = setup();
		const unrelated = makeRegularGraphNode('unrelated');
		drag.onNodeDragStart(makeEvent(unrelated));
		drag.onNodeDrag(makeEvent(unrelated));
		drag.processNodeDragStop(makeEvent(unrelated));
		expect(updateNodeMock).not.toHaveBeenCalled();
	});

	it("snapshots group nodes' store positions on drag start", () => {
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		// Move group bar by (50, -20)
		groupNode.position = { x: 50, y: -20 };
		drag.onNodeDrag(makeEvent(groupNode));
		// Each group node updated by the same delta from their STORED position.
		expect(updateNodeMock).toHaveBeenCalledWith('a', { position: { x: 150, y: 180 } });
		expect(updateNodeMock).toHaveBeenCalledWith('b', { position: { x: 350, y: 180 } });
		const moves = drag.processNodeDragStop(makeEvent(groupNode));
		expect(moves).toEqual([
			{ id: 'a', position: { x: 150, y: 180 } },
			{ id: 'b', position: { x: 350, y: 180 } },
		]);
	});

	it('source-of-truth for initial positions is the store, not VueFlow findNode', () => {
		// Hidden (collapsed) nodes have no VueFlow node — drag must still work.
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		groupNode.position = { x: 10, y: 10 };
		const moves = drag.processNodeDragStop(makeEvent(groupNode));
		expect(moves).toEqual([
			{ id: 'a', position: { x: 110, y: 210 } },
			{ id: 'b', position: { x: 310, y: 210 } },
		]);
	});

	it('processNodeDragStop strips group title bars from the move list', () => {
		// Title bars have no INodeUi-backed position to persist.
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		const moves = drag.processNodeDragStop(makeEvent(groupNode));
		expect(moves.find((m) => m.id === 'group:g1')).toBeUndefined();
	});

	it('processNodeDragStop returns ordinary-node moves when no group is involved', () => {
		const { drag } = setup();
		const regular = makeRegularGraphNode('a', 42, 84);
		const moves = drag.processNodeDragStop(makeEvent(regular));
		expect(moves).toEqual([{ id: 'a', position: { x: 42, y: 84 } }]);
	});

	it('clears its snapshot between drags so a fresh drag starts clean', () => {
		const { drag } = setup();
		const g1 = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(g1));
		g1.position = { x: 100, y: 0 };
		drag.processNodeDragStop(makeEvent(g1));
		// Second drag from a fresh snapshot
		const g2 = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(g2));
		g2.position = { x: 5, y: 0 };
		const moves = drag.processNodeDragStop(makeEvent(g2));
		expect(moves).toEqual([
			{ id: 'a', position: { x: 105, y: 200 } },
			{ id: 'b', position: { x: 305, y: 200 } },
		]);
	});

	it('emits moves when drag has zero delta', () => {
		// VueFlow fires drag-stop for click-without-drag — emit unchanged
		// positions for consistency with single-node behaviour.
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		const moves = drag.processNodeDragStop(makeEvent(groupNode));
		// Zero delta; positions are unchanged.
		expect(moves).toEqual([
			{ id: 'a', position: { x: 100, y: 200 } },
			{ id: 'b', position: { x: 300, y: 200 } },
		]);
	});

	describe('multi-select drag (AC #11)', () => {
		it('propagates Δ to the group nodes when the title bar is part of a multi-select drag', () => {
			const { drag } = setup();
			const groupNode = makeGroupGraphNode('group:g1', 0, 0);
			const otherNode = makeRegularGraphNode('c');
			drag.onSelectionDragStart(makeSelectionEvent(groupNode, otherNode));
			// Move the entire selection by (40, 60)
			groupNode.position = { x: 40, y: 60 };
			otherNode.position = { x: 40, y: 60 };
			drag.onSelectionDrag(makeSelectionEvent(groupNode, otherNode));
			expect(updateNodeMock).toHaveBeenCalledWith('a', { position: { x: 140, y: 260 } });
			expect(updateNodeMock).toHaveBeenCalledWith('b', { position: { x: 340, y: 260 } });
			const moves = drag.processSelectionDragStop(makeSelectionEvent(groupNode, otherNode));
			// Group nodes from the group's delta + ordinary 'c' from event.nodes;
			// title bar filtered out.
			expect(moves).toEqual([
				{ id: 'a', position: { x: 140, y: 260 } },
				{ id: 'b', position: { x: 340, y: 260 } },
				{ id: 'c', position: { x: 40, y: 60 } },
			]);
		});

		it('dedupes group nodes that also appear directly in event.nodes', () => {
			// A selected group node appears once, with the group-derived position.
			const { drag } = setup();
			const groupNode = makeGroupGraphNode('group:g1', 0, 0);
			const nodeDirect = makeRegularGraphNode('a', 999, 999);
			drag.onSelectionDragStart(makeSelectionEvent(groupNode, nodeDirect));
			groupNode.position = { x: 10, y: 10 };
			const moves = drag.processSelectionDragStop(makeSelectionEvent(groupNode, nodeDirect));
			const aMoves = moves.filter((m) => m.id === 'a');
			expect(aMoves).toHaveLength(1);
			expect(aMoves[0].position).toEqual({ x: 110, y: 210 });
		});

		it('moves both groups when dragging a multi-selection of two title bars', () => {
			// Repro: VueFlow fires both selectionDragStart and nodeDragStart on
			// multi-select — the per-node handler must not clobber the selection
			// snapshots (otherwise the non-clicked group "bounces back" on stop).
			const { drag } = setup();
			const groupA = makeGroupGraphNode('group:g1', 0, 0);
			const groupB = makeGroupGraphNode('group:g2', 0, 0);
			const selEvent = makeSelectionEvent(groupA, groupB);

			// Replay both events VueFlow emits for the clicked node.
			drag.onSelectionDragStart(selEvent);
			drag.onNodeDragStart({ ...selEvent, node: groupA });

			// Move the selection by (10, 20).
			groupA.position = { x: 10, y: 20 };
			groupB.position = { x: 10, y: 20 };
			drag.onSelectionDrag(selEvent);
			drag.onNodeDrag({ ...selEvent, node: groupA });

			expect(updateNodeMock).toHaveBeenCalledWith('a', { position: { x: 110, y: 220 } });
			expect(updateNodeMock).toHaveBeenCalledWith('b', { position: { x: 310, y: 220 } });
			expect(updateNodeMock).toHaveBeenCalledWith('c', { position: { x: 510, y: 520 } });
			expect(updateNodeMock).toHaveBeenCalledWith('d', { position: { x: 710, y: 520 } });

			const moves = drag.processSelectionDragStop(selEvent);
			expect(moves).toEqual(
				expect.arrayContaining([
					{ id: 'a', position: { x: 110, y: 220 } },
					{ id: 'b', position: { x: 310, y: 220 } },
					{ id: 'c', position: { x: 510, y: 520 } },
					{ id: 'd', position: { x: 710, y: 520 } },
				]),
			);
		});

		it('syncs the owning group title bar from live node positions when a group node is dragged', () => {
			// Title bar must track the live cursor — store positions only
			// catch up on drag-stop.
			const nodeDimensions: Record<string, { width: number; height: number }> = {
				a: { width: 100, height: 80 },
				b: { width: 100, height: 80 },
			};
			const { drag } = setup({ getNodeDimensions: (id) => nodeDimensions[id] });
			findNodeMock.mockImplementation((id: string) => (id === 'group:g1' ? { id } : undefined));
			const node = makeRegularGraphNode('a', 120, 220);
			drag.onNodeDrag(makeEvent(node));
			expect(updateNodeMock).toHaveBeenCalledWith('group:g1', expect.any(Function));
			const updater = updateNodeMock.mock.calls.find((call) => call[0] === 'group:g1')![1];
			const patch = updater({ data: { foo: 'bar' } });
			// Live nodes rect: x=[120..400], y=[200..300].
			expect(patch.position).toEqual({
				x: snapToGrid(120 - GROUP_PADDING_X),
				y: snapToGrid(200 - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
			});
			expect(patch.width).toBe(280 + 2 * GROUP_PADDING_X);
			expect(patch.data.foo).toBe('bar'); // preserves other data fields
			expect(patch.data.nodesRect).toEqual({ x: 120, y: 200, width: 280, height: 100 });
		});

		it("title bar rect tracks the group's nodes at their mapping-time size", () => {
			// Even if VueFlow's offsetWidth/offsetHeight reports a different
			// size (e.g. CSS border included), the rect stays at mapping-time.
			const nodeDimensions: Record<string, { width: number; height: number }> = {
				a: { width: 100, height: 80 },
				b: { width: 100, height: 80 },
			};
			const { drag } = setup({ getNodeDimensions: (id) => nodeDimensions[id] });
			findNodeMock.mockImplementation((id: string) => (id === 'group:g1' ? { id } : undefined));

			const node = makeRegularGraphNode('a', 100, 200);
			drag.onNodeDrag(makeEvent(node));

			const updater = updateNodeMock.mock.calls.find((call) => call[0] === 'group:g1')![1];
			const patch = updater({ data: {} });

			// Rect at mapping-time dimensions: x=[100..400], y=[200..280].
			expect(patch.data.nodesRect).toEqual({ x: 100, y: 200, width: 300, height: 80 });
			expect(patch.width).toBe(300 + 2 * GROUP_PADDING_X);
		});

		it('returns only ordinary-node moves when no group title bar is in the selection', () => {
			const { drag } = setup();
			const r1 = makeRegularGraphNode('c', 1, 2);
			const r2 = makeRegularGraphNode('d', 3, 4);
			drag.onSelectionDragStart(makeSelectionEvent(r1, r2));
			const moves = drag.processSelectionDragStop(makeSelectionEvent(r1, r2));
			expect(moves).toEqual([
				{ id: 'c', position: { x: 1, y: 2 } },
				{ id: 'd', position: { x: 3, y: 4 } },
			]);
		});
	});
});
