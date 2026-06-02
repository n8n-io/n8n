import type { NodeDragEvent, GraphNode } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import { isCanvasNodeGroup } from '../canvas.types';

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

/**
 * Drag behaviour for group title bars: dragging one (alone or in a selection)
 * moves every member by the same delta. On drop, new member positions are
 * emitted via `onMoveMembers`, and `memberIdsMoved` is returned so the caller
 * can skip per-node emits for those same members.
 */
export function useCanvasNodeGroupDrag(deps: UseCanvasNodeGroupDragDeps) {
	const { updateNode } = useVueFlow(deps.canvasId);

	// Pre-drag positions, one snapshot per group being dragged. Used at drop time
	// to compute final member positions from a single source of truth.
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
		if (!isCanvasNodeGroup(node)) return;
		finalGroupPositions.set(node.id, { x: node.position.x, y: node.position.y });
	}

	function reset() {
		snapshots = new Map();
		finalGroupPositions.clear();
	}

	function onNodeDragStart(event: NodeDragEvent) {
		const node = event.node;
		if (!isCanvasNodeGroup(node)) return;
		reset();
		snapshotGroup(node);
	}

	function onNodeDrag(event: NodeDragEvent) {
		const node = event.node;
		if (!isCanvasNodeGroup(node)) return;
		applyDelta(node);
	}

	/**
	 * `handled` is true when the title bar's drag was processed here — the caller
	 * should not persist its position separately (the title bar isn't INodeUi-backed).
	 */
	function onNodeDragStop(event: NodeDragEvent): {
		handled: boolean;
		memberIdsMoved: Set<string>;
	} {
		if (!isCanvasNodeGroup(event.node) || !snapshots.has(event.node.id)) {
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
			if (isCanvasNodeGroup(node)) snapshotGroup(node);
		}
	}

	function onSelectionDrag(event: NodeDragEvent) {
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) applyDelta(node);
		}
	}

	function onSelectionDragStop(event: NodeDragEvent): { memberIdsMoved: Set<string> } {
		if (snapshots.size === 0) {
			reset();
			return { memberIdsMoved: new Set() };
		}
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) recordFinalPosition(node);
		}
		const { moves, memberIdsMoved } = collectMoves();
		reset();
		if (moves.length > 0) deps.onMoveMembers(moves);
		return { memberIdsMoved };
	}

	return {
		isGroupNode: isCanvasNodeGroup,
		onNodeDragStart,
		onNodeDrag,
		onNodeDragStop,
		onSelectionDragStart,
		onSelectionDrag,
		onSelectionDragStop,
	};
}
