import type { GraphNode, NodeDragEvent } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupViewState, CanvasNodeMoveEvent } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, isCanvasNodeGroup } from '../canvas.types';
import {
	computeMemberRectFromStore,
	titleBarFromMemberRect,
	type GetNodeDimensions,
} from './useCanvasMapping.groups';

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupById: (groupId: string) => { nodeIds: string[] } | undefined;
	getGroupForNode: (nodeId: string) => { id: string; nodeIds: string[] } | undefined;
	getNodeDimensions?: GetNodeDimensions;
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

	// Live push so the title bar tracks the drag — store positions only
	// catch up on drag-stop. Same formula as mapping, with live overrides.
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
			if (!findNode(vfId)) continue; // title bar not yet rendered

			const rect = computeMemberRectFromStore(
				group.nodeIds,
				deps.getNodeById,
				deps.getNodeDimensions,
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

	// VueFlow fires both selectionDrag* and nodeDrag* for multi-select —
	// let selection-drag own the snapshots, skip the per-node path here.
	function onNodeDragStart(event: NodeDragEvent) {
		if (isMultiSelectDrag(event)) return;
		const node = event.node;
		if (!isCanvasNodeGroup(node)) return;
		reset();
		snapshotGroup(node);
	}

	// Per-tick handler shared by single-node and selection drag:
	// Group titles → propagate the delta. Members → batch-sync their groups.
	function handleDragTick(nodes: readonly GraphNode[]) {
		const membersToSync: Array<{ id: string; position: { x: number; y: number } }> = [];
		for (const node of nodes) {
			if (isCanvasNodeGroup(node)) {
				applyDelta(node);
			} else {
				membersToSync.push({ id: node.id, position: { x: node.position.x, y: node.position.y } });
			}
		}
		if (membersToSync.length > 0) syncGroupBoundsFromMembers(membersToSync);
	}

	function onNodeDrag(event: NodeDragEvent) {
		if (isMultiSelectDrag(event)) return;
		handleDragTick([event.node]);
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
		// Snapshot every selected group title bar — applyDelta needs a baseline.
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) snapshotGroup(node);
		}
	}

	function onSelectionDrag(event: NodeDragEvent) {
		handleDragTick(event.nodes ?? []);
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
