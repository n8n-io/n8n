import type dagre from '@dagrejs/dagre';

import { GRID_SIZE } from './constants';

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CollapsedGroup {
	/** Id this group occupies in the parent graph while its members are folded away. */
	graphId: string;
	/** Internal left-to-right layout of the members, so expanding the group looks tidy. */
	graph: dagre.graphlib.Graph;
}

/**
 * The canvas derives a group's title bar from its members' bounding rect and snaps
 * it to the grid (titleBarFromNodesRect), so placing the bar takes working backwards
 * from the members. Neither GROUP_PADDING_X nor GROUP_HEADER_TO_MEMBERS_Y is a
 * multiple of GRID_SIZE, so pick whichever grid-aligned member origin round-trips
 * closest to where the layout put the group.
 */
export function memberOriginFor(
	headerCoordinate: number,
	padding: number,
	snapToGrid: (value: number) => number,
): number {
	const base = snapToGrid(headerCoordinate + padding);
	let best = base;
	let bestError = Infinity;

	for (const candidate of [base - GRID_SIZE, base, base + GRID_SIZE]) {
		const error = Math.abs(snapToGrid(candidate - padding) - headerCoordinate);
		if (error < bestError) {
			bestError = error;
			best = candidate;
		}
	}

	return best;
}
