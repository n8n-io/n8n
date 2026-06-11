import type { GraphNode, NodeDragEvent } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupNodeData, CanvasNodeMoveEvent } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, isCanvasGroupNode } from '../canvas.types';
import {
	computeNodesRectFromStore,
	titleBarFromNodesRect,
	type GetNodeDisplaySize,
} from './useCanvasMapping.groups';

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupById: (groupId: string) => { nodeIds: string[] } | undefined;
	getGroupForNode: (nodeId: string) => { id: string; nodeIds: string[] } | undefined;
	isNodeInGroup: (nodeId: string) => boolean;
	getNodeDisplaySize?: GetNodeDisplaySize;
}

interface GroupDragSnapshot {
	initialGroupPos: { x: number; y: number };
	initialNodePositions: Map<string, { x: number; y: number }>;
}

/**
 * Translates VueFlow drag events on group title bars into moves of the group's nodes,
 * and keeps the title-bar rect tracking those nodes during a per-node drag.
 */
export function useCanvasNodeGroupDrag(deps: UseCanvasNodeGroupDragDeps) {
	const { updateNode, findNode } = useVueFlow(deps.canvasId);

	let snapshots = new Map<string, GroupDragSnapshot>();
	const finalGroupPositions = new Map<string, { x: number; y: number }>();
	let isSelectionBoxDragInProgress = false;
	let skipPairedNodeDragStop = false;

	function getGroupNodeIds(groupVueFlowId: string): string[] {
		if (!groupVueFlowId.startsWith(CANVAS_NODE_GROUP_ID_PREFIX)) return [];
		const groupId = groupVueFlowId.slice(CANVAS_NODE_GROUP_ID_PREFIX.length);
		return deps.getGroupById(groupId)?.nodeIds ?? [];
	}

	function snapshotGroup(groupVueFlowNode: GraphNode) {
		const nodeIds = getGroupNodeIds(groupVueFlowNode.id);
		if (nodeIds.length === 0) return;
		const initialNodePositions = new Map<string, { x: number; y: number }>();
		for (const id of nodeIds) {
			const node = deps.getNodeById(id);
			if (node) {
				initialNodePositions.set(id, { x: node.position[0], y: node.position[1] });
			}
		}
		snapshots.set(groupVueFlowNode.id, {
			initialGroupPos: { x: groupVueFlowNode.position.x, y: groupVueFlowNode.position.y },
			initialNodePositions,
		});
	}

	function applyGroupTitleBarDeltaToNodes(groupVueFlowNode: GraphNode) {
		const snap = snapshots.get(groupVueFlowNode.id);
		if (!snap) return;
		const dx = groupVueFlowNode.position.x - snap.initialGroupPos.x;
		const dy = groupVueFlowNode.position.y - snap.initialGroupPos.y;
		for (const [id, p] of snap.initialNodePositions) {
			updateNode(id, { position: { x: p.x + dx, y: p.y + dy } });
		}
	}

	function collectMemberMoves(): {
		moves: CanvasNodeMoveEvent[];
		movedNodeIds: Set<string>;
	} {
		const moves: CanvasNodeMoveEvent[] = [];
		const movedNodeIds = new Set<string>();
		for (const [groupVueFlowId, snap] of snapshots) {
			const finalPos = finalGroupPositions.get(groupVueFlowId);
			if (!finalPos) continue;
			const dx = finalPos.x - snap.initialGroupPos.x;
			const dy = finalPos.y - snap.initialGroupPos.y;
			for (const [id, p] of snap.initialNodePositions) {
				moves.push({ id, position: { x: p.x + dx, y: p.y + dy } });
				movedNodeIds.add(id);
			}
		}
		return { moves, movedNodeIds };
	}

	function recordFinalPosition(node: GraphNode) {
		if (!isCanvasGroupNode(node)) return;
		finalGroupPositions.set(node.id, { x: node.position.x, y: node.position.y });
	}

	function reset() {
		snapshots = new Map();
		finalGroupPositions.clear();
	}

	function nonGroupMoves(eventNodes: GraphNode[], skip: Set<string>): CanvasNodeMoveEvent[] {
		const out: CanvasNodeMoveEvent[] = [];
		for (const node of eventNodes) {
			if (isCanvasGroupNode(node) || skip.has(node.id)) continue;
			out.push({ id: node.id, position: { x: node.position.x, y: node.position.y } });
		}
		return out;
	}

	// Live push so the title bar tracks the drag — store positions only
	// catch up on drag-stop. Same formula as mapping, with live overrides.
	function syncGroupBoundsFromNodes(
		draggedNodes: Array<{ id: string; position: { x: number; y: number } }>,
	) {
		if (draggedNodes.length === 0) return;

		let groupedDraggedNodes: typeof draggedNodes | undefined;
		for (const node of draggedNodes) {
			if (!deps.isNodeInGroup(node.id)) continue;
			groupedDraggedNodes ??= [];
			groupedDraggedNodes.push(node);
		}
		if (!groupedDraggedNodes) return;

		const groupsToSync = new Map<string, { id: string; nodeIds: string[] }>();
		const positionOverrides = new Map<string, { x: number; y: number }>();
		for (const n of groupedDraggedNodes) {
			positionOverrides.set(n.id, n.position);
			const group = deps.getGroupForNode(n.id);
			if (group && !groupsToSync.has(group.id)) {
				groupsToSync.set(group.id, group);
			}
		}
		if (groupsToSync.size === 0) return;

		for (const group of groupsToSync.values()) {
			const groupVueFlowId = `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`;
			if (!findNode(groupVueFlowId)) continue; // title bar not yet rendered

			const rect = computeNodesRectFromStore(
				group.nodeIds,
				deps.getNodeById,
				deps.getNodeDisplaySize,
				positionOverrides,
			);
			const titleBar = titleBarFromNodesRect(rect);
			updateNode(groupVueFlowId, (n) => ({
				position: titleBar.position,
				width: titleBar.width,
				data: { ...(n.data as CanvasGroupNodeData), nodesRect: rect },
			}));
		}
	}

	function isMultiSelectDrag(event: NodeDragEvent): boolean {
		return (event.nodes?.length ?? 0) > 1;
	}

	// VueFlow emits both selectionDrag* and nodeDrag* when dragging the
	// selection rectangle. Dragging one selected node in a multi-selection only
	// emits nodeDrag*, so that path still needs to sync group bounds.
	function onNodeDragStart(event: NodeDragEvent) {
		if (isSelectionBoxDragInProgress) return;
		skipPairedNodeDragStop = false;
		if (isMultiSelectDrag(event)) {
			reset();
			for (const node of event.nodes ?? []) {
				if (isCanvasGroupNode(node)) snapshotGroup(node);
			}
			return;
		}
		const node = event.node;
		reset();
		if (!isCanvasGroupNode(node)) return;
		snapshotGroup(node);
	}

	// Per-tick handler shared by single-node and selection drag:
	// Group titles → propagate the delta. Group nodes → batch-sync their groups.
	function handleDragTick(nodes: readonly GraphNode[]) {
		const nodesToSync: Array<{ id: string; position: { x: number; y: number } }> = [];
		for (const node of nodes) {
			if (isCanvasGroupNode(node)) {
				applyGroupTitleBarDeltaToNodes(node);
			} else {
				nodesToSync.push({ id: node.id, position: { x: node.position.x, y: node.position.y } });
			}
		}
		if (nodesToSync.length > 0) syncGroupBoundsFromNodes(nodesToSync);
	}

	function onNodeDrag(event: NodeDragEvent) {
		if (isSelectionBoxDragInProgress) return;
		if (isMultiSelectDrag(event)) {
			handleDragTick(event.nodes ?? []);
			return;
		}
		handleDragTick([event.node]);
	}

	function processNodeDragStop(event: NodeDragEvent): CanvasNodeMoveEvent[] {
		if (skipPairedNodeDragStop) {
			skipPairedNodeDragStop = false;
			return [];
		}
		if (isMultiSelectDrag(event)) {
			for (const node of event.nodes ?? []) {
				if (isCanvasGroupNode(node)) recordFinalPosition(node);
			}
			const { moves: memberMoves, movedNodeIds } = collectMemberMoves();
			reset();
			return [...memberMoves, ...nonGroupMoves(event.nodes ?? [], movedNodeIds)];
		}
		if (!isCanvasGroupNode(event.node) || !snapshots.has(event.node.id)) {
			reset();
			return nonGroupMoves(event.nodes ?? [], new Set());
		}
		recordFinalPosition(event.node);
		const { moves: memberMoves, movedNodeIds } = collectMemberMoves();
		reset();
		return [...memberMoves, ...nonGroupMoves(event.nodes ?? [], movedNodeIds)];
	}

	function onSelectionDragStart(event: NodeDragEvent) {
		isSelectionBoxDragInProgress = true;
		skipPairedNodeDragStop = false;
		reset();
		// Snapshot every selected group title bar — applyGroupTitleBarDeltaToNodes needs a baseline.
		for (const node of event.nodes ?? []) {
			if (isCanvasGroupNode(node)) snapshotGroup(node);
		}
	}

	function onSelectionDrag(event: NodeDragEvent) {
		handleDragTick(event.nodes ?? []);
	}

	function processSelectionDragStop(event: NodeDragEvent): CanvasNodeMoveEvent[] {
		if (snapshots.size === 0) {
			reset();
			isSelectionBoxDragInProgress = false;
			skipPairedNodeDragStop = true;
			return nonGroupMoves(event.nodes ?? [], new Set());
		}
		for (const node of event.nodes ?? []) {
			if (isCanvasGroupNode(node)) recordFinalPosition(node);
		}
		const { moves: memberMoves, movedNodeIds } = collectMemberMoves();
		reset();
		isSelectionBoxDragInProgress = false;
		skipPairedNodeDragStop = true;
		return [...memberMoves, ...nonGroupMoves(event.nodes ?? [], movedNodeIds)];
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
