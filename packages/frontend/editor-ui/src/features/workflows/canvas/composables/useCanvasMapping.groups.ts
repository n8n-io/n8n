import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { CanvasGroupNode, CanvasGroupViewState } from '../canvas.types';
import { CANVAS_NODE_GROUP_ID_PREFIX, CANVAS_NODE_GROUP_TYPE } from '../canvas.types';
import {
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
} from '../stores/canvasNodeGroups.constants';
import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';
import { STICKY_NODE_TYPE } from '@/app/constants/nodeTypes';

export interface MemberRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Size lookup for nodes that aren't the default size
 * (configurable inputs, config nodes, sticky notes).
 */
export type GetNodeDimensions = (id: string) => { width: number; height: number } | undefined;

// Sticky is the only node type whose dimensions live in parameters today.
// typeof-narrow keeps the read type-safe
function readStickyDimensions(node: INodeUi): { width: number; height: number } | undefined {
	if (node.type !== STICKY_NODE_TYPE) return undefined;
	const { width, height } = node.parameters ?? {};
	if (typeof width !== 'number' || typeof height !== 'number') return undefined;
	return { width, height };
}

/**
 * Bounding rect of a group's members — used to size and position
 * the group's title bar and frame. Reads from workflow store positions (canonical)
 * rather than VueFlow runtime, which can lag or be uninitialized.
 */
export function computeMemberRectFromStore(
	memberIds: string[],
	getNodeById: (id: string) => INodeUi | undefined,
	getNodeDimensions?: GetNodeDimensions,
): MemberRect {
	const members = memberIds
		.map((id) => getNodeById(id))
		.filter((n): n is INodeUi => n !== undefined);

	if (members.length === 0) {
		return { x: 0, y: 0, width: DEFAULT_NODE_SIZE[0], height: DEFAULT_NODE_SIZE[1] };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	// Precedence: caller-supplied → sticky parameters → DEFAULT_NODE_SIZE.
	for (const node of members) {
		const x = node.position[0];
		const y = node.position[1];
		const supplied = getNodeDimensions?.(node.id);
		const sticky = readStickyDimensions(node);
		const width = supplied?.width ?? sticky?.width ?? DEFAULT_NODE_SIZE[0];
		const height = supplied?.height ?? sticky?.height ?? DEFAULT_NODE_SIZE[1];
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
	getNodeDimensions?: GetNodeDimensions;
	autofocusGroupId: string | null;
	readOnly: boolean;
}

/**
 * Map each workflow group to a `canvas-node-group` VueFlow node (title bar + frame).
 * Members are mapped separately by `mappedNodes`.
 */
export function mapGroupsToVueFlowNodes({
	allGroups,
	getNodeById,
	getNodeDimensions,
	autofocusGroupId,
	readOnly,
}: MapGroupsToVueFlowNodesInputs): CanvasGroupNode[] {
	const out: CanvasGroupNode[] = [];
	for (const group of allGroups) {
		// Skip until at least one member resolves — otherwise the rect collapses to
		// (0, 0) and lands the title bar at canvas origin. Re-emits when members arrive.
		const hasMember = group.nodeIds.some((id) => getNodeById(id) !== undefined);
		if (!hasMember) continue;

		const memberRect = computeMemberRectFromStore(group.nodeIds, getNodeById, getNodeDimensions);
		const data: CanvasGroupViewState = {
			group,
			memberRect,
			autofocusTitle: autofocusGroupId === group.id,
		};

		out.push({
			id: `${CANVAS_NODE_GROUP_ID_PREFIX}${group.id}`,
			type: CANVAS_NODE_GROUP_TYPE,
			position: {
				x: memberRect.x - GROUP_PADDING_X,
				y: memberRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
			},
			width: memberRect.width + 2 * GROUP_PADDING_X,
			height: GROUP_HEADER_HEIGHT,
			draggable: !readOnly,
			selectable: false,
			connectable: false,
			// Behind member nodes so the expanded frame doesn't overlap them.
			zIndex: -1,
			data,
		});
	}
	return out;
}
