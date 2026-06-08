import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type {
	CanvasConnection,
	CanvasConnectionData,
	CanvasGroupNode,
	CanvasGroupNodeData,
} from '../canvas.types';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CANVAS_NODE_GROUP_ID_PREFIX,
	CANVAS_NODE_GROUP_TYPE,
} from '../canvas.types';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import { createCanvasConnectionId } from '../canvas.utils';
import { DEFAULT_NODE_SIZE, GRID_SIZE } from '@/app/utils/nodeViewUtils';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';

export interface NodesRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Size lookup for nodes that aren't the default size
 * (configurable inputs, config nodes, sticky notes).
 */
export type GetNodeDisplaySize = (id: string) => { width: number; height: number } | undefined;

// Sticky is the only node type whose dimensions live in parameters today.
// typeof-narrow keeps the read type-safe
function readStickyDimensions(node: INodeUi): { width: number; height: number } | undefined {
	if (node.type !== STICKY_NODE_TYPE) return undefined;
	const { width, height } = node.parameters ?? {};
	if (typeof width !== 'number' || typeof height !== 'number') return undefined;
	return { width, height };
}

// Precedence: caller-supplied → sticky parameters → DEFAULT_NODE_SIZE.
function resolveNodeDimensions(
	node: INodeUi,
	getNodeDisplaySize?: GetNodeDisplaySize,
): { width: number; height: number } {
	const supplied = getNodeDisplaySize?.(node.id);
	const sticky = readStickyDimensions(node);
	return {
		width: supplied?.width ?? sticky?.width ?? DEFAULT_NODE_SIZE[0],
		height: supplied?.height ?? sticky?.height ?? DEFAULT_NODE_SIZE[1],
	};
}

/**
 * Title bar position + width derived from the group's nodes-bounding rect.
 * Snaps the position to the canvas grid; if it didn't, VueFlow's
 * `snap-to-grid` would shift the title bar on the first drag.
 *
 * Width is at least {@link GROUP_HEADER_WIDTH_COLLAPSED} so expanding a
 * tight cluster never shrinks the header below the collapsed chip size.
 */
export function titleBarFromNodesRect(nodesRect: NodesRect): {
	position: { x: number; y: number };
	width: number;
} {
	const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
	const contentWidth = nodesRect.width + 2 * GROUP_PADDING_X;
	return {
		position: {
			x: snap(nodesRect.x - GROUP_PADDING_X),
			y: snap(nodesRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
		},
		width: Math.max(contentWidth, GROUP_HEADER_WIDTH_COLLAPSED),
	};
}

/**
 * Bounding rect of a group's nodes — used to size and position the title
 * bar and frame. Reads from workflow store positions (canonical) rather than
 * VueFlow runtime, which can lag, be uninitialized, or be hidden when the
 * owning group is collapsed.
 *
 * `positionOverrides` lets the drag-time sync substitute live positions for
 * dragged nodes (whose store position lags until drag-stop).
 */
export function computeNodesRectFromStore(
	nodeIds: string[],
	getNodeById: (id: string) => INodeUi | undefined,
	getNodeDisplaySize?: GetNodeDisplaySize,
	positionOverrides?: Map<string, { x: number; y: number }>,
): NodesRect {
	const nodes = nodeIds.map((id) => getNodeById(id)).filter((n): n is INodeUi => n !== undefined);

	if (nodes.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const node of nodes) {
		const override = positionOverrides?.get(node.id);
		const x = override?.x ?? node.position[0];
		const y = override?.y ?? node.position[1];
		const { width, height } = resolveNodeDimensions(node, getNodeDisplaySize);
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x + width > maxX) maxX = x + width;
		if (y + height > maxY) maxY = y + height;
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

export interface MapGroupsToVueFlowNodesInputs {
	allGroups: IWorkflowGroup[];
	getNodeById: (id: string) => INodeUi | undefined;
	getNodeDisplaySize?: GetNodeDisplaySize;
	isGroupCollapsed: (id: string) => boolean;
	readOnly: boolean;
}

/**
 * Map each workflow group to a `canvas-node-group` VueFlow node (title bar + frame).
 * Group nodes themselves are mapped separately by `mappedNodes`.
 */
export function mapGroupsToVueFlowNodes({
	allGroups,
	getNodeById,
	getNodeDisplaySize,
	isGroupCollapsed,
	readOnly,
}: MapGroupsToVueFlowNodesInputs): CanvasGroupNode[] {
	const out: CanvasGroupNode[] = [];
	for (const group of allGroups) {
		// Skip until at least one node resolves — otherwise the rect collapses to
		// (0, 0) and lands the title bar at canvas origin. Re-emits when nodes arrive.
		const hasNode = group.nodeIds.some((id) => getNodeById(id) !== undefined);
		if (!hasNode) continue;

		const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById, getNodeDisplaySize);
		const collapsed = isGroupCollapsed(group.id);
		const data: CanvasGroupNodeData = {
			group,
			nodesRect,
			isCollapsed: collapsed,
		};

		const titleBar = titleBarFromNodesRect(nodesRect);
		out.push({
			id: `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`,
			type: CANVAS_NODE_GROUP_TYPE,
			position: titleBar.position,
			width: collapsed ? GROUP_HEADER_WIDTH_COLLAPSED : titleBar.width,
			height: GROUP_HEADER_HEIGHT,
			draggable: !readOnly,
			// Selectable only when the title bar represents
			// the whole group as a single visual surface
			selectable: !readOnly && collapsed,
			connectable: false,
			// Behind the group's nodes so the expanded frame doesn't overlap them.
			zIndex: -1,
			data,
		});
	}
	return out;
}

/**
 * Build a Map<nodeId, IWorkflowGroup> for nodes inside a collapsed group.
 * Used to look up "is this endpoint of an edge currently hidden inside a
 * collapsed group, and if so, which group does it belong to?".
 */
export function buildCollapsedGroupByNodeId(
	allGroups: IWorkflowGroup[],
	isGroupCollapsed: (id: string) => boolean,
): Map<string, IWorkflowGroup> {
	const result = new Map<string, IWorkflowGroup>();
	for (const group of allGroups) {
		if (!isGroupCollapsed(group.id)) continue;
		for (const nodeId of group.nodeIds) {
			result.set(nodeId, group);
		}
	}
	return result;
}

/**
 * Re-anchor connections crossing a collapsed group's boundary onto the
 * group's title bar (left / right handles). Edges fully inside a collapsed
 * group are dropped. Edges that converge on the same external endpoint
 * (same node + same handle) collapse into a single rendered line and are
 * marked `merged` so the renderer drops their label.
 */
export interface CanvasConnectionWithMergeFlag extends CanvasConnection {
	data?: CanvasConnectionData & { merged?: boolean };
}

export function reanchorCollapsedConnections(
	connections: CanvasConnection[],
	collapsedGroupByNodeId: Map<string, IWorkflowGroup>,
): CanvasConnectionWithMergeFlag[] {
	if (collapsedGroupByNodeId.size === 0) return connections as CanvasConnectionWithMergeFlag[];

	const byKey = new Map<string, CanvasConnectionWithMergeFlag>();
	const result: CanvasConnectionWithMergeFlag[] = [];

	for (const conn of connections) {
		const sourceGroup = collapsedGroupByNodeId.get(conn.source);
		const targetGroup = collapsedGroupByNodeId.get(conn.target);

		// Both endpoints inside the same collapsed group → drop entirely.
		if (sourceGroup && targetGroup && sourceGroup.id === targetGroup.id) {
			continue;
		}

		if (!sourceGroup && !targetGroup) {
			// External-only edge — keep as-is.
			result.push(conn);
			continue;
		}

		const sourceId = sourceGroup ? `${CANVAS_NODE_GROUP_ID_PREFIX}${sourceGroup.id}` : conn.source;
		const targetId = targetGroup ? `${CANVAS_NODE_GROUP_ID_PREFIX}${targetGroup.id}` : conn.target;
		const sourceHandle = sourceGroup ? CANVAS_NODE_GROUP_HANDLE_RIGHT : conn.sourceHandle;
		const targetHandle = targetGroup ? CANVAS_NODE_GROUP_HANDLE_LEFT : conn.targetHandle;

		const dedupeKey = `${sourceId}|${sourceHandle}|${targetId}|${targetHandle}`;
		const existing = byKey.get(dedupeKey);

		if (existing) {
			// Mark the first-seen edge as merged so the renderer drops its label.
			existing.data = {
				...(existing.data as CanvasConnectionData),
				merged: true,
			};
			continue;
		}

		const rewritten: CanvasConnectionWithMergeFlag = {
			...conn,
			id: createCanvasConnectionId({
				source: sourceId,
				sourceHandle,
				target: targetId,
				targetHandle,
			}),
			source: sourceId,
			target: targetId,
			sourceHandle,
			targetHandle,
		};

		byKey.set(dedupeKey, rewritten);
		result.push(rewritten);
	}

	return result;
}
