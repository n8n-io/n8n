import type { GraphNode, NodeDragEvent } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupViewState, CanvasNodeMoveEvent } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, isCanvasNodeGroup } from '../canvas.types';
import { computeMemberRectFromStore, titleBarFromMemberRect } from './useCanvasMapping.groups';

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupById: (groupId: string) => { nodeIds: string[] } | undefined;
	getGroupForNode: (nodeId: string) => { id: string; nodeIds: string[] } | undefined;
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

	// Clears only the group-keyed maps below; non-group nodes are never tracked
	// here, so this is a no-op for them.
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
	// Reuses computeMemberRectFromStore with the dragged members' live
	// positions as overrides, so the rect formula stays identical to mount
	// — no shift the first time the title bar re-derives.
	function syncGroupBoundsFromMembers(
		draggedMembers: Array<{ id: string; position: { x: number; y: number } }>,
	) {
		if (draggedMembers.length === 0) return;

		// O(1) per-node lookup so a non-member drag tick does no work
		const groupsToSync = new Map<string, { id: string; nodeIds: string[] }>();
		const positionOverrides = new Map<string, { x: number; y: number }>();
		for (const m of draggedMembers) {
			positionOverrides.set(m.id, m.position);
			const group = deps.getGroupForNode(m.id);
			if (group && !groupsToSync.has(group.id)) {
				groupsToSync.set(group.id, group);
			}
		}
		if (groupsToSync.size === 0) return;

		for (const group of groupsToSync.values()) {
			const vfId = `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`;
			const groupVfNode = findNode(vfId);
			if (!groupVfNode) continue; // title bar not yet rendered

			const stashedDimensions =
				(groupVfNode.data as CanvasGroupViewState | undefined)?.memberDimensions ?? {};

			const rect = computeMemberRectFromStore(
				group.nodeIds,
				deps.getNodeById,
				(id) => stashedDimensions[id],
				positionOverrides,
			);
			const titleBar = titleBarFromMemberRect(rect);
			updateNode(vfId, (n) => ({
				position: titleBar.position,
				width: titleBar.width,
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

		// Group title bar: push the drag delta to its members
		if (isCanvasNodeGroup(node)) {
			applyDelta(node);
			return;
		}

		// Regular node: if it's a member of some group, keep that group's
		// title bar tracking the live rect
		syncGroupBoundsFromMembers([
			{ id: node.id, position: { x: node.position.x, y: node.position.y } },
		]);
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

		// Snapshot each group title bar in the selection so applyDelta can
		// compute member moves from a fixed baseline on every drag tick.
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) snapshotGroup(node);
		}
	}

	function onSelectionDrag(event: NodeDragEvent) {
		const membersToSync: Array<{ id: string; position: { x: number; y: number } }> = [];

		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) {
				// Group title bar: push the drag delta to its members
				applyDelta(node);
			} else {
				// Regular node: collect for the post-loop sync below
				membersToSync.push({ id: node.id, position: { x: node.position.x, y: node.position.y } });
			}
		}

		// Keep any group whose members were dragged tracking the live rect
		if (membersToSync.length > 0) {
			syncGroupBoundsFromMembers(membersToSync);
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
