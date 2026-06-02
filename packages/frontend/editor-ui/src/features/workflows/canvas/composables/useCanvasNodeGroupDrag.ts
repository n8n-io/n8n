import type { GraphNode, NodeDragEvent, Rect } from '@vue-flow/core';
import { getRectOfNodes, useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupViewState, CanvasNodeMoveEvent } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, isCanvasNodeGroup } from '../canvas.types';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupById: (groupId: string) => { nodeIds: string[] } | undefined;
	getAllGroups: () => Array<{ id: string; nodeIds: string[] }>;
}

interface GroupDragSnapshot {
	initialGroupPos: { x: number; y: number };
	initialMemberPositions: Map<string, { x: number; y: number }>;
}

/**
 * Translates VueFlow drag events on group title bars into member moves,
 * and keeps the title-bar rect tracking its members during a member drag.
 */
export function useCanvasNodeGroupDrag(deps: UseCanvasNodeGroupDragDeps) {
	const { updateNode, findNode } = useVueFlow(deps.canvasId);

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

	// Mapping derives title-bar position from store positions, which only
	// update on drag-stop. Without this live push the rect would lag the drag.
	function syncGroupBoundsFromMembers(draggedMemberIds: string[]) {
		if (draggedMemberIds.length === 0) return;
		const dragged = new Set(draggedMemberIds);
		for (const group of deps.getAllGroups()) {
			if (!group.nodeIds.some((id) => dragged.has(id))) continue;
			const members = group.nodeIds
				.map((id) => findNode(id))
				.filter((n): n is GraphNode => n !== undefined);
			if (members.length === 0) continue;
			const rect: Rect = getRectOfNodes(members);
			const vfId = `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`;
			updateNode(vfId, (n) => ({
				position: {
					x: rect.x - GROUP_PADDING_X,
					y: rect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
				},
				width: rect.width + 2 * GROUP_PADDING_X,
				data: { ...(n.data as CanvasGroupViewState), memberRect: rect },
			}));
		}
	}

	function isMultiSelectDrag(event: NodeDragEvent): boolean {
		return (event.nodes?.length ?? 0) > 1;
	}

	// Vue-flow emits both selectionDrag* and nodeDrag* for multi-select drags
	// (selection first, then node). The per-node handler would clobber the
	// selection handler's snapshots — skip and let selection-drag own it.
	function onNodeDragStart(event: NodeDragEvent) {
		if (isMultiSelectDrag(event)) return;
		const node = event.node;
		if (!isCanvasNodeGroup(node)) return;
		reset();
		snapshotGroup(node);
	}

	function onNodeDrag(event: NodeDragEvent) {
		if (isMultiSelectDrag(event)) return;
		const node = event.node;
		if (isCanvasNodeGroup(node)) {
			applyDelta(node);
			return;
		}
		syncGroupBoundsFromMembers([node.id]);
	}

	function processNodeDragStop(event: NodeDragEvent): CanvasNodeMoveEvent[] {
		if (isMultiSelectDrag(event)) return [];
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
		const memberIdsToSync: string[] = [];
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) {
				applyDelta(node);
			} else {
				memberIdsToSync.push(node.id);
			}
		}
		if (memberIdsToSync.length > 0) syncGroupBoundsFromMembers(memberIdsToSync);
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
