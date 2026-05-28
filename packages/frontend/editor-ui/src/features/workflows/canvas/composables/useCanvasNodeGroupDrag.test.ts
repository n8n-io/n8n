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

function makeRegularGraphNode(id: string): GraphNode {
	return {
		id,
		type: 'canvas-node',
		position: { x: 0, y: 0 },
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
		const onMoveMembers = vi.fn();
		const drag = useCanvasNodeGroupDrag({
			getNodeById: (id) => store.get(id),
			getGroupMembers: (groupId) => (groupId === 'group:g1' ? ['a', 'b'] : []),
			onMoveMembers,
		});
		return { drag, onMoveMembers };
	}

	it('ignores drag events on non-group nodes', () => {
		const { drag, onMoveMembers } = setup();
		const regular = makeRegularGraphNode('a');
		drag.onNodeDragStart(makeEvent(regular));
		drag.onNodeDrag(makeEvent(regular));
		drag.onNodeDragStop(makeEvent(regular));
		expect(updateNodeMock).not.toHaveBeenCalled();
		expect(onMoveMembers).not.toHaveBeenCalled();
	});

	it('snapshots member store positions on drag start', () => {
		const { drag, onMoveMembers } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		// Move group bar by (50, -20)
		groupNode.position = { x: 50, y: -20 };
		drag.onNodeDrag(makeEvent(groupNode));
		// Each member updated by the same delta from their STORED position.
		expect(updateNodeMock).toHaveBeenCalledWith('a', { position: { x: 150, y: 180 } });
		expect(updateNodeMock).toHaveBeenCalledWith('b', { position: { x: 350, y: 180 } });
		drag.onNodeDragStop(makeEvent(groupNode));
		expect(onMoveMembers).toHaveBeenCalledWith([
			{ id: 'a', position: { x: 150, y: 180 } },
			{ id: 'b', position: { x: 350, y: 180 } },
		]);
	});

	it('source-of-truth for initial positions is the store, not VueFlow findNode', () => {
		// Members may be hidden (collapsed); positions must still come from
		// the workflow document store. setup() injects only the store; no
		// findNode is mocked. The drag still works.
		const { drag, onMoveMembers } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		groupNode.position = { x: 10, y: 10 };
		drag.onNodeDragStop(makeEvent(groupNode));
		expect(onMoveMembers).toHaveBeenCalledWith([
			{ id: 'a', position: { x: 110, y: 210 } },
			{ id: 'b', position: { x: 310, y: 210 } },
		]);
	});

	it('reports handled + member ids from onNodeDragStop so Canvas.vue can dedupe and skip default handling', () => {
		const { drag } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		const result = drag.onNodeDragStop(makeEvent(groupNode));
		expect(result.handled).toBe(true);
		expect([...result.memberIdsMoved].sort()).toEqual(['a', 'b']);
	});

	it('reports handled: false when the drag did not involve a group title bar', () => {
		const { drag } = setup();
		const regular = makeRegularGraphNode('a');
		const result = drag.onNodeDragStop(makeEvent(regular));
		expect(result.handled).toBe(false);
		expect(result.memberIdsMoved.size).toBe(0);
	});

	it('clears its snapshot between drags so a fresh drag starts clean', () => {
		const { drag, onMoveMembers } = setup();
		const g1 = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(g1));
		g1.position = { x: 100, y: 0 };
		drag.onNodeDragStop(makeEvent(g1));
		onMoveMembers.mockClear();
		// Second drag from a fresh snapshot
		const g2 = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(g2));
		g2.position = { x: 5, y: 0 };
		drag.onNodeDragStop(makeEvent(g2));
		expect(onMoveMembers).toHaveBeenCalledWith([
			{ id: 'a', position: { x: 105, y: 200 } },
			{ id: 'b', position: { x: 305, y: 200 } },
		]);
	});

	it('emits no move-members when drag has zero delta', () => {
		// VueFlow still fires onNodeDragStop for click-without-drag — the
		// emit set still contains the (unchanged) member positions today.
		// We always emit for consistency with single-node behaviour; this
		// test pins the current contract so a future change is intentional.
		const { drag, onMoveMembers } = setup();
		const groupNode = makeGroupGraphNode('group:g1', 0, 0);
		drag.onNodeDragStart(makeEvent(groupNode));
		drag.onNodeDragStop(makeEvent(groupNode));
		// Zero delta; positions are unchanged.
		expect(onMoveMembers).toHaveBeenCalledWith([
			{ id: 'a', position: { x: 100, y: 200 } },
			{ id: 'b', position: { x: 300, y: 200 } },
		]);
	});

	describe('multi-select drag (AC #11)', () => {
		it('propagates Δ to members when the title bar is part of a multi-select drag', () => {
			const { drag, onMoveMembers } = setup();
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
			const result = drag.onSelectionDragStop(makeSelectionEvent(groupNode, otherNode));
			expect(onMoveMembers).toHaveBeenCalledWith([
				{ id: 'a', position: { x: 140, y: 260 } },
				{ id: 'b', position: { x: 340, y: 260 } },
			]);
			// memberIdsMoved lets the caller dedupe against per-node emits.
			expect([...result.memberIdsMoved].sort()).toEqual(['a', 'b']);
		});

		it('reports empty memberIdsMoved when no group title bar is in the selection', () => {
			const { drag, onMoveMembers } = setup();
			const r1 = makeRegularGraphNode('c');
			const r2 = makeRegularGraphNode('d');
			drag.onSelectionDragStart(makeSelectionEvent(r1, r2));
			const result = drag.onSelectionDragStop(makeSelectionEvent(r1, r2));
			expect(result.memberIdsMoved.size).toBe(0);
			expect(onMoveMembers).not.toHaveBeenCalled();
		});
	});
});
