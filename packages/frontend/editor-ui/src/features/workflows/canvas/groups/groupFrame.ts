import { getRectOfNodes, type GraphNode } from '@vue-flow/core';

import {
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_HEADER_HEIGHT,
	GROUP_COLLAPSED_WIDTH,
} from '../stores/canvasNodeGroups.constants';

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
	const rect = getRectOfNodes(memberNodes);
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
			height: GROUP_HEADER_HEIGHT,
		},
	};
}
