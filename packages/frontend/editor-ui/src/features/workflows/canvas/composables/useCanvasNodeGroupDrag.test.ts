import { describe, expect, it, vi } from 'vitest';
import type { GraphNode, NodeDragEvent } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import { useCanvasNodeGroupDrag } from './useCanvasNodeGroupDrag';
import { CANVAS_NODE_GROUP_TYPE } from '../canvas.types';

const updateNodeMock = vi.fn();
vi.mock('@vue-flow/core', () => ({
	useVueFlow: () => ({ updateNode: updateNodeMock }),
}));

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
	function setup() {
		updateNodeMock.mockClear();
		const store = new Map<string, INodeUi>([
			['a', makeStoredNode('a', 100, 200)],
			['b', makeStoredNode('b', 300, 200)],
		]);
		const drag = useCanvasNodeGroupDrag({
			getNodeById: (id) => store.get(id),
			getGroupById: (id) => (id === 'g1' ? { nodeIds: ['a', 'b'] } : undefined),
		});
		return { drag };
	}

	it('ignores drag events on non-group nodes', () => {
		const { drag } = setup();
		const regular = makeRegularGraphNode('a');
		drag.onNodeDragStart(makeEvent(regular));
		drag.onNodeDrag(makeEvent(regular));
		drag.processNodeDragStop(makeEvent(regular));
		expect(updateNodeMock).not.toHaveBeenCalled();
	});

	it('snapshots member store positions on drag start', () => {
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		// Move group bar by (50, -20)
		groupNode.position = { x: 50, y: -20 };
		drag.onNodeDrag(makeEvent(groupNode));
		// Each member updated by the same delta from their STORED position.
		expect(updateNodeMock).toHaveBeenCalledWith('a', { position: { x: 150, y: 180 } });
		expect(updateNodeMock).toHaveBeenCalledWith('b', { position: { x: 350, y: 180 } });
		const moves = drag.processNodeDragStop(makeEvent(groupNode));
		expect(moves).toEqual([
			{ id: 'a', position: { x: 150, y: 180 } },
			{ id: 'b', position: { x: 350, y: 180 } },
		]);
	});

	it('source-of-truth for initial positions is the store, not VueFlow findNode', () => {
		// Members may be hidden (collapsed); positions must still come from
		// the workflow document store. setup() injects only the store; no
		// findNode is mocked. The drag still works.
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
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		// Title bar nodes must never appear in the returned moves —
		// they have no INodeUi-backed position to persist.
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
		// VueFlow still fires drag-stop for click-without-drag — the emit
		// set still contains the (unchanged) member positions today. We
		// always emit for consistency with single-node behaviour; this
		// test pins the current contract so a future change is intentional.
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
		it('propagates Δ to members when the title bar is part of a multi-select drag', () => {
			const { drag } = setup();
			const groupNode = makeGroupGraphNode('group:g1', 0, 0);
			const otherNode = makeRegularGraphNode('c');
			drag.onSelectionDragStart(makeSelectionEvent(groupNode, otherNode));
			// Move the entire selection by (40, 60)
			groupNode.position = { x: 40, y: 60 };
			otherNode.position = { x: 40, y: 60 };
			drag.onSelectionDrag(makeSelectionEvent(groupNode, otherNode));
			// Members get updateNode calls with the group's delta applied
			// to their stored positions.
			expect(updateNodeMock).toHaveBeenCalledWith('a', { position: { x: 140, y: 260 } });
			expect(updateNodeMock).toHaveBeenCalledWith('b', { position: { x: 340, y: 260 } });
			const moves = drag.processSelectionDragStop(makeSelectionEvent(groupNode, otherNode));
			// Member moves come from the group's delta; the ordinary node
			// 'c' comes from event.nodes; the title bar is filtered out.
			expect(moves).toEqual([
				{ id: 'a', position: { x: 140, y: 260 } },
				{ id: 'b', position: { x: 340, y: 260 } },
				{ id: 'c', position: { x: 40, y: 60 } },
			]);
		});

		it('dedupes members that also appear directly in event.nodes', () => {
			// If a member is in event.nodes (e.g. selected) and was already
			// moved via the group's delta, it should appear once — using the
			// group-derived position, not the event.nodes position.
			const { drag } = setup();
			const groupNode = makeGroupGraphNode('group:g1', 0, 0);
			const memberDirect = makeRegularGraphNode('a', 999, 999);
			drag.onSelectionDragStart(makeSelectionEvent(groupNode, memberDirect));
			groupNode.position = { x: 10, y: 10 };
			const moves = drag.processSelectionDragStop(makeSelectionEvent(groupNode, memberDirect));
			const aMoves = moves.filter((m) => m.id === 'a');
			expect(aMoves).toHaveLength(1);
			expect(aMoves[0].position).toEqual({ x: 110, y: 210 });
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
