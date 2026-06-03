import { type GraphNode } from '@vue-flow/core';

import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';
import {
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_HEADER_HEIGHT,
	GROUP_COLLAPSED_WIDTH,
	GROUP_COLLAPSED_HEIGHT,
} from '../stores/canvasNodeGroups.constants';

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

// Bounding box of the member nodes. Unlike Vue Flow's getRectOfNodes, a member
// that isn't measured yet (dimensions 0×0 — e.g. a group that loaded collapsed,
// so its members were never rendered) falls back to the default node size, so
// the frame stays sensible instead of collapsing to the members' anchor points.
function getMemberBoundingBox(memberNodes: GraphNode[]): Rect {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const node of memberNodes) {
		const position = node.computedPosition ?? node.position;
		const width = node.dimensions?.width || DEFAULT_NODE_SIZE[0];
		const height = node.dimensions?.height || DEFAULT_NODE_SIZE[1];
		minX = Math.min(minX, position.x);
		minY = Math.min(minY, position.y);
		maxX = Math.max(maxX, position.x + width);
		maxY = Math.max(maxY, position.y + height);
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export interface GroupFrameRects {
	// Top-left anchor, shared by the expanded frame and the collapsed box so
	// the anchor never moves on collapse/expand.
	x: number;
	y: number;
	expanded: {
		width: number;
		height: number;
		// Header height (offset of the dashed frame from the wrapper top).
		frameTop: number;
		frameHeight: number;
	};
	collapsed: {
		width: number;
		height: number;
	};
}

/**
 * Derives the group's expanded frame and collapsed box from its member nodes.
 * Both share a top-left anchor. Returns null for an empty group.
 *
 * Shared by `CanvasNodeGroupOverlay` (rendering) and `CanvasNodeGroupsLayer`
 * (driving the collapse/expand layout algorithm) so they never disagree on the
 * footprint geometry.
 */
export function getGroupFrameRects(memberNodes: GraphNode[]): GroupFrameRects | null {
	if (memberNodes.length === 0) return null;
	const rect = getMemberBoundingBox(memberNodes);
	const x = rect.x - GROUP_PADDING_X;
	const y = rect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT;
	const width = rect.width + 2 * GROUP_PADDING_X;
	const height = GROUP_HEADER_HEIGHT + rect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM;
	return {
		x,
		y,
		expanded: {
			width,
			height,
			frameTop: GROUP_HEADER_HEIGHT,
			frameHeight: rect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		},
		collapsed: {
			width: GROUP_COLLAPSED_WIDTH,
			height: GROUP_COLLAPSED_HEIGHT,
		},
	};
}
