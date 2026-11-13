export interface HeadingPlacement {
	key: string;
	label: string;
	/** Distance from the top of the list, in pixels. */
	top: number;
	/** Row height, in pixels. */
	height: number;
}

/** The heading drawn over the top of the list. */
export interface PinnedHeading {
	key: string;
	label: string;
	/** Row height, in pixels. The clip uses this so the next heading can cover the pin. */
	height: number;
	/** Upward shift, in pixels. Zero keeps the heading against the top edge. */
	offset: number;
}

/**
 * Pick the heading that covers the rows at `scrollTop`.
 * Pass headings in list order.
 * The heading stays unpinned while it still sits at its own place.
 * The next heading shifts this one up once the two meet.
 */
export function pinnedHeading(
	headings: readonly HeadingPlacement[],
	scrollTop: number,
): PinnedHeading | undefined {
	let current: HeadingPlacement | undefined;
	let next: HeadingPlacement | undefined;

	for (const heading of headings) {
		if (heading.top <= scrollTop) {
			current = heading;
			continue;
		}

		next = heading;
		break;
	}

	// A zero height cannot cover the rows, and a heading at its own place
	// would draw a second copy on top of itself.
	if (!current || current.height <= 0 || scrollTop <= current.top) return undefined;

	const gap = next ? next.top - scrollTop - current.height : 0;

	return {
		key: current.key,
		label: current.label,
		height: current.height,
		offset: Math.min(0, gap),
	};
}

/**
 * Scroll offset that places `top` below the heading that covers it.
 * Pass headings in list order.
 * A heading scrolls to its own top.
 * A row with no heading above it scrolls to its own top.
 */
export function scrollTopBelowHeading(
	headings: readonly HeadingPlacement[],
	top: number,
	targetIsHeading: boolean,
): number {
	if (targetIsHeading) return Math.max(0, top);

	let cover = 0;
	for (const heading of headings) {
		if (heading.top >= top) break;
		if (heading.height > 0) cover = heading.height;
	}

	return Math.max(0, top - cover);
}
