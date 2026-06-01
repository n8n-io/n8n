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

export interface MemberRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Per-node dimensions used to size the group member bounding rect.
 * Callers supply this so the rect tracks the actual rendered footprint
 * for node types whose width or height varies (configurable inputs,
 * configuration nodes, sticky notes). Returning `undefined` falls back
 * to `DEFAULT_NODE_SIZE`.
 */
export type GetNodeDimensions = (id: string) => { width: number; height: number } | undefined;

/**
 * Compute the bounding rect of a set of member nodes from canonical store
 * positions.
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
	// Dimension precedence: caller-supplied, then per-node parameters
	// (sticky notes carry their own), then the design-system default.
	for (const node of members) {
		const x = node.position[0];
		const y = node.position[1];
		const supplied = getNodeDimensions?.(node.id);
		const width =
			supplied?.width ?? (node.parameters?.width as number | undefined) ?? DEFAULT_NODE_SIZE[0];
		const height =
			supplied?.height ?? (node.parameters?.height as number | undefined) ?? DEFAULT_NODE_SIZE[1];
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
 * Map every workflow group into a single `canvas-node-group` VueFlow node
 * (the title bar + frame). Members are NOT included here; they are emitted
 * separately by `mappedNodes`.
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
		// Skip groups whose members are all unresolved — the rect would
		// otherwise fall back to (0, 0) and place the title bar at the
		// canvas origin. The group itself stays in the document and will
		// re-emit once a member resolves.
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
