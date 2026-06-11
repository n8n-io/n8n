import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupNode, CanvasGroupNodeData } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, CANVAS_NODE_GROUP_TYPE } from '../canvas.types';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
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
 */
export function titleBarFromNodesRect(nodesRect: NodesRect): {
	position: { x: number; y: number };
	width: number;
} {
	const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
	return {
		position: {
			x: snap(nodesRect.x - GROUP_PADDING_X),
			y: snap(nodesRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
		},
		width: nodesRect.width + 2 * GROUP_PADDING_X,
	};
}

/**
 * Bounding rect of a group's nodes — used to size and position
 * the group's title bar and frame. Reads from workflow store positions (canonical)
 * rather than VueFlow runtime, which can lag or be uninitialized.
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
	readOnly,
}: MapGroupsToVueFlowNodesInputs): CanvasGroupNode[] {
	const out: CanvasGroupNode[] = [];
	for (const group of allGroups) {
		// Skip until at least one node resolves — otherwise the rect collapses to
		// (0, 0) and lands the title bar at canvas origin. Re-emits when nodes arrive.
		const hasNode = group.nodeIds.some((id) => getNodeById(id) !== undefined);
		if (!hasNode) continue;

		const nodesRect = computeNodesRectFromStore(group.nodeIds, getNodeById, getNodeDisplaySize);

		const data: CanvasGroupNodeData = {
			group,
			nodesRect,
		};

		const titleBar = titleBarFromNodesRect(nodesRect);
		out.push({
			id: `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`,
			type: CANVAS_NODE_GROUP_TYPE,
			position: titleBar.position,
			width: titleBar.width,
			height: GROUP_HEADER_HEIGHT,
			draggable: !readOnly,
			selectable: false,
			connectable: false,
			// Behind the group's nodes so the expanded frame doesn't overlap them.
			zIndex: -1,
			data,
		});
	}
	return out;
}
