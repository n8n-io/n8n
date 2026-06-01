import type { NodeDragEvent, GraphNode } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import { CANVAS_NODE_GROUP_TYPE } from '../canvas.types';

export interface GroupMoveEvent {
	id: string;
	position: { x: number; y: number };
}

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupMembers: (groupVueFlowNodeId: string) => string[];
	onMoveMembers: (moves: GroupMoveEvent[]) => void;
}

interface GroupDragSnapshot {
	initialGroupPos: { x: number; y: number };
	initialMemberPositions: Map<string, { x: number; y: number }>;
}

export function isCanvasNodeGroupNode(node: { type?: string }): boolean {
	return node.type === CANVAS_NODE_GROUP_TYPE;
}

/**
 * Drag behaviour for the group title bar: dragging it (alone or as part
 * of a selection) moves every member of its group by the same delta. On
 * drop, the new member positions are emitted through `onMoveMembers`.
 *
 * `onNodeDragStop` and `onSelectionDragStop` return the set of member ids
 * that were displaced via a group's delta so the caller can dedupe those
 * against any per-node positions it would otherwise emit.
 */
export function useCanvasNodeGroupDrag(deps: UseCanvasNodeGroupDragDeps) {
	const { updateNode } = useVueFlow(deps.canvasId);

	// One snapshot per group title bar currently being dragged, keyed by
	// its node id. Records pre-drag positions so the drop emit can compute
	// final member positions from a single source of truth.
	let snapshots = new Map<string, GroupDragSnapshot>();

	function snapshotGroup(groupVfNode: GraphNode) {
		const memberIds = deps.getGroupMembers(groupVfNode.id);
		if (memberIds.length === 0) return;
		const initialMemberPositions = new Map<string, { x: number; y: number }>();
		for (const id of memberIds) {
			const member = deps.getNodeById(id);
			if (member) {
				initialMemberPositions.set(id, { x: member.position[0], y: member.position[1] });
			}
		}
		snapshots.set(groupVfNode.id, {
			initialGroupPos: { x: groupVfNode.position.x, y: groupVfNode.position.y },
			initialMemberPositions,
		});
	}

	function applyDelta(groupVfNode: GraphNode) {
		const snap = snapshots.get(groupVfNode.id);
		if (!snap) return;
		const dx = groupVfNode.position.x - snap.initialGroupPos.x;
		const dy = groupVfNode.position.y - snap.initialGroupPos.y;
		for (const [id, p] of snap.initialMemberPositions) {
			updateNode(id, { position: { x: p.x + dx, y: p.y + dy } });
		}
	}

	function collectMoves(): { moves: GroupMoveEvent[]; memberIdsMoved: Set<string> } {
		const moves: GroupMoveEvent[] = [];
		const memberIdsMoved = new Set<string>();
		for (const [groupVfId, snap] of snapshots) {
			// Drop emits use the final position handed back by the drag
			// stop event, recorded into `finalGroupPositions` immediately
			// before this runs.
			const finalPos = finalGroupPositions.get(groupVfId);
			if (!finalPos) continue;
			const dx = finalPos.x - snap.initialGroupPos.x;
			const dy = finalPos.y - snap.initialGroupPos.y;
			for (const [id, p] of snap.initialMemberPositions) {
				moves.push({ id, position: { x: p.x + dx, y: p.y + dy } });
				memberIdsMoved.add(id);
			}
		}
		return { moves, memberIdsMoved };
	}

	const finalGroupPositions = new Map<string, { x: number; y: number }>();

	function recordFinalPosition(node: GraphNode) {
		if (!isCanvasNodeGroupNode(node)) return;
		finalGroupPositions.set(node.id, { x: node.position.x, y: node.position.y });
	}

	function reset() {
		snapshots = new Map();
		finalGroupPositions.clear();
	}

	function onNodeDragStart(event: NodeDragEvent) {
		const node = event.node;
		if (!isCanvasNodeGroupNode(node)) return;
		reset();
		snapshotGroup(node);
	}

	function onNodeDrag(event: NodeDragEvent) {
		const node = event.node;
		if (!isCanvasNodeGroupNode(node)) return;
		applyDelta(node);
	}

	/**
	 * `handled` is true when a group title bar's drag was processed here
	 * and the title-bar's own position should not be persisted separately.
	 * `memberIdsMoved` carries the member ids displaced via group delta,
	 * so the caller can dedupe against any per-node positions it would
	 * otherwise emit.
	 */
	function onNodeDragStop(event: NodeDragEvent): {
		handled: boolean;
		memberIdsMoved: Set<string>;
	} {
		if (!isCanvasNodeGroupNode(event.node) || !snapshots.has(event.node.id)) {
			reset();
			return { handled: false, memberIdsMoved: new Set() };
		}
		recordFinalPosition(event.node);
		const { moves, memberIdsMoved } = collectMoves();
		reset();
		if (moves.length > 0) deps.onMoveMembers(moves);
		return { handled: true, memberIdsMoved };
	}

	function onSelectionDragStart(event: NodeDragEvent) {
		reset();
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroupNode(node)) snapshotGroup(node);
		}
	}

	function onSelectionDrag(event: NodeDragEvent) {
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroupNode(node)) applyDelta(node);
		}
	}

	/**
	 * Emits member moves for every group included in the selection drop.
	 * `memberIdsMoved` carries the displaced member ids so the caller can
	 * dedupe against any per-node positions from the same drag.
	 */
	function onSelectionDragStop(event: NodeDragEvent): { memberIdsMoved: Set<string> } {
		if (snapshots.size === 0) {
			reset();
			return { memberIdsMoved: new Set() };
		}
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroupNode(node)) recordFinalPosition(node);
		}
		const { moves, memberIdsMoved } = collectMoves();
		reset();
		if (moves.length > 0) deps.onMoveMembers(moves);
		return { memberIdsMoved };
	}

	return {
		isGroupNode: isCanvasNodeGroupNode,
		onNodeDragStart,
		onNodeDrag,
		onNodeDragStop,
		onSelectionDragStart,
		onSelectionDrag,
		onSelectionDragStop,
	};
}
