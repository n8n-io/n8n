import type { GraphNode, NodeDragEvent } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupViewState, CanvasNodeMoveEvent } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, isCanvasNodeGroup } from '../canvas.types';
import {
	computeNodesRectFromStore,
	titleBarFromNodesRect,
	type GetNodeDimensions,
} from './useCanvasMapping.groups';

export interface UseCanvasNodeGroupDragDeps {
	canvasId?: string;
	getNodeById: (id: string) => INodeUi | undefined;
	getGroupById: (groupId: string) => { nodeIds: string[] } | undefined;
	getGroupForNode: (nodeId: string) => { id: string; nodeIds: string[] } | undefined;
	isNodeInGroup: (nodeId: string) => boolean;
	getNodeDimensions?: GetNodeDimensions;
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

	function getGroupNodeIds(groupVfId: string): string[] {
		if (!groupVfId.startsWith(CANVAS_NODE_GROUP_ID_PREFIX)) return [];
		const groupId = groupVfId.slice(CANVAS_NODE_GROUP_ID_PREFIX.length);
		return deps.getGroupById(groupId)?.nodeIds ?? [];
	}

	function snapshotGroup(groupVfNode: GraphNode) {
		const nodeIds = getGroupNodeIds(groupVfNode.id);
		if (nodeIds.length === 0) return;
		const initialNodePositions = new Map<string, { x: number; y: number }>();
		for (const id of nodeIds) {
			const node = deps.getNodeById(id);
			if (node) {
				initialNodePositions.set(id, { x: node.position[0], y: node.position[1] });
			}
		}
		snapshots.set(groupVfNode.id, {
			initialGroupPos: { x: groupVfNode.position.x, y: groupVfNode.position.y },
			initialNodePositions,
		});
	}

	function applyDelta(groupVfNode: GraphNode) {
		const snap = snapshots.get(groupVfNode.id);
		if (!snap) return;
		const dx = groupVfNode.position.x - snap.initialGroupPos.x;
		const dy = groupVfNode.position.y - snap.initialGroupPos.y;
		for (const [id, p] of snap.initialNodePositions) {
			updateNode(id, { position: { x: p.x + dx, y: p.y + dy } });
		}
	}

	function collectNodeMoves(): {
		moves: CanvasNodeMoveEvent[];
		nodeIdsMoved: Set<string>;
	} {
		const moves: CanvasNodeMoveEvent[] = [];
		const nodeIdsMoved = new Set<string>();
		for (const [groupVfId, snap] of snapshots) {
			const finalPos = finalGroupPositions.get(groupVfId);
			if (!finalPos) continue;
			const dx = finalPos.x - snap.initialGroupPos.x;
			const dy = finalPos.y - snap.initialGroupPos.y;
			for (const [id, p] of snap.initialNodePositions) {
				moves.push({ id, position: { x: p.x + dx, y: p.y + dy } });
				nodeIdsMoved.add(id);
			}
		}
		return { moves, nodeIdsMoved };
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

		// Only grouped dragged nodes need bounds recomputation.
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
			const vfId = `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`;
			if (!findNode(vfId)) continue; // title bar not yet rendered

			const rect = computeNodesRectFromStore(
				group.nodeIds,
				deps.getNodeById,
				deps.getNodeDimensions,
				positionOverrides,
			);
			const titleBar = titleBarFromNodesRect(rect);
			updateNode(vfId, (n) => ({
				position: titleBar.position,
				width: titleBar.width,
				data: { ...(n.data as CanvasGroupViewState), nodesRect: rect },
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
				if (isCanvasNodeGroup(node)) snapshotGroup(node);
			}
			return;
		}
		const node = event.node;
		if (!isCanvasNodeGroup(node)) return;
		reset();
		snapshotGroup(node);
	}

	// Per-tick handler shared by single-node and selection drag:
	// Group titles → propagate the delta. Group nodes → batch-sync their groups.
	function handleDragTick(nodes: readonly GraphNode[]) {
		const nodesToSync: Array<{ id: string; position: { x: number; y: number } }> = [];
		for (const node of nodes) {
			if (isCanvasNodeGroup(node)) {
				applyDelta(node);
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
				if (isCanvasNodeGroup(node)) recordFinalPosition(node);
			}
			const { moves: groupNodeMoves, nodeIdsMoved } = collectNodeMoves();
			reset();
			return [...groupNodeMoves, ...nonGroupMoves(event.nodes ?? [], nodeIdsMoved)];
		}
		if (!isCanvasNodeGroup(event.node) || !snapshots.has(event.node.id)) {
			reset();
			return nonGroupMoves(event.nodes ?? [], new Set());
		}
		recordFinalPosition(event.node);
		const { moves: groupNodeMoves, nodeIdsMoved } = collectNodeMoves();
		reset();
		return [...groupNodeMoves, ...nonGroupMoves(event.nodes ?? [], nodeIdsMoved)];
	}

	function onSelectionDragStart(event: NodeDragEvent) {
		isSelectionBoxDragInProgress = true;
		skipPairedNodeDragStop = false;
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
			isSelectionBoxDragInProgress = false;
			skipPairedNodeDragStop = true;
			return nonGroupMoves(event.nodes ?? [], new Set());
		}
		for (const node of event.nodes ?? []) {
			if (isCanvasNodeGroup(node)) recordFinalPosition(node);
		}
		const { moves: groupNodeMoves, nodeIdsMoved } = collectNodeMoves();
		reset();
		isSelectionBoxDragInProgress = false;
		skipPairedNodeDragStop = true;
		return [...groupNodeMoves, ...nonGroupMoves(event.nodes ?? [], nodeIdsMoved)];
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
