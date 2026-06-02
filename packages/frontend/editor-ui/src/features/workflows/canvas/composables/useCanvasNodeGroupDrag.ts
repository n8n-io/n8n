import type { NodeDragEvent, GraphNode } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { CanvasNodeMoveEvent } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, isCanvasNodeGroup } from '../canvas.types';

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupById: (groupId: string) => { nodeIds: string[] } | undefined;
}

interface GroupDragSnapshot {
	initialGroupPos: { x: number; y: number };
	initialMemberPositions: Map<string, { x: number; y: number }>;
}

/**
 * Drag behaviour for group title bars: dragging one (alone or in a selection)
 * moves every member by the same delta. `processNodeDragStop` and
 * `processSelectionDragStop` return the consolidated move list Canvas.vue
 * should persist — member moves merged with ordinary-node moves, title-bar
 * nodes (which have no INodeUi) filtered out, and members deduped against
 * any ordinary-node entries that point at the same id.
 */
export function useCanvasNodeGroupDrag(deps: UseCanvasNodeGroupDragDeps) {
	const { updateNode } = useVueFlow(deps.canvasId);

	// Pre-drag positions, one snapshot per group being dragged. Used at drop time
	// to compute final member positions from a single source of truth.
	let snapshots = new Map<string, GroupDragSnapshot>();
	const finalGroupPositions = new Map<string, { x: number; y: number }>();

	function getGroupMembers(groupVfId: string): string[] {
		if (!groupVfId.startsWith(CANVAS_NODE_GROUP_ID_PREFIX)) return [];
		const groupId = groupVfId.slice(CANVAS_NODE_GROUP_ID_PREFIX.length);
		return deps.getGroupById(groupId)?.nodeIds ?? [];
	}

	function snapshotGroup(groupVfNode: GraphNode) {
		const memberIds = getGroupMembers(groupVfNode.id);
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

	function collectMemberMoves(): {
		moves: CanvasNodeMoveEvent[];
		memberIdsMoved: Set<string>;
	} {
		const moves: CanvasNodeMoveEvent[] = [];
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

	function recordFinalPosition(node: GraphNode) {
		if (!isCanvasNodeGroup(node)) return;
		finalGroupPositions.set(node.id, { x: node.position.x, y: node.position.y });
	}

	function reset() {
		snapshots = new Map();
		finalGroupPositions.clear();
	}

	function nonGroupMoves(eventNodes: GraphNode[], skip: Set<string>): CanvasNodeMoveEvent[] {
		const out: CanvasNodeMoveEvent[] = [];
		for (const node of eventNodes) {
			if (isCanvasNodeGroup(node) || skip.has(node.id)) continue;
			out.push({ id: node.id, position: { x: node.position.x, y: node.position.y } });
		}
		return out;
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

	function processNodeDragStop(event: NodeDragEvent): CanvasNodeMoveEvent[] {
		if (!isCanvasNodeGroup(event.node) || !snapshots.has(event.node.id)) {
			reset();
			return nonGroupMoves(event.nodes ?? [], new Set());
		}
		recordFinalPosition(event.node);
		const { moves: memberMoves, memberIdsMoved } = collectMemberMoves();
		reset();
		return [...memberMoves, ...nonGroupMoves(event.nodes ?? [], memberIdsMoved)];
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

	function processSelectionDragStop(event: NodeDragEvent): CanvasNodeMoveEvent[] {
		if (snapshots.size === 0) {
			reset();
			return nonGroupMoves(event.nodes ?? [], new Set());
		}
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) recordFinalPosition(node);
		}
		const { moves: memberMoves, memberIdsMoved } = collectMemberMoves();
		reset();
		return [...memberMoves, ...nonGroupMoves(event.nodes ?? [], memberIdsMoved)];
	}

	return {
		onNodeDragStart,
		onNodeDrag,
		processNodeDragStop,
		onSelectionDragStart,
		onSelectionDrag,
		processSelectionDragStop,
	};
}
