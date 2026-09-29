/**
 * Post-layout check for sticky notes whose text does not fit.
 *
 * Runs over the serialized workflow, after layout has settled every position and
 * size. The resolver already grows a note's title band to hold its text, but it
 * cannot always win: a note that wraps a single node is only as wide as that
 * node, and the band stops short of any node the note does not document. The
 * canvas draws the text area with `overflow: hidden`, so whatever is left over is
 * cut off silently.
 *
 * Those leftovers are reported rather than fixed, because the good remedies need
 * judgement the layout does not have: shorten the prose, split one note in two,
 * or give the note an explicit width and height.
 */

import {
	DEFAULT_NODE_SIZE,
	DEFAULT_STICKY_SIZE,
	STICKY_NODE_TYPE,
	STICKY_TEXT_INTERNAL_PADDING,
} from './constants';
import { estimateStickyTextHeight, usableTextHeight } from './sticky-text-sizing';
import type { NodeJSON, WorkflowJSON } from '../types/base';

export interface StickyLayoutWarning {
	code: 'STICKY_TEXT_OVERFLOW';
	/** The sticky note this is about, so the caller can go straight to it. */
	nodeName: string;
	message: string;
}

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Shortfall we ignore before saying a note overflows.
 *
 * The estimator is deliberately pessimistic so that sizing never clips, and
 * measurement against the rendered canvas put that bias at roughly 8-70px. A
 * report wants the opposite bias: a warning the reader cannot see on the canvas
 * teaches them to ignore warnings. One line of body text plus its margin is
 * about the smallest overflow that is visible, so stay quiet below that.
 */
const OVERFLOW_TOLERANCE = 40;

function readSize(value: unknown, fallback: number): number {
	return typeof value === 'number' && value > 0 ? value : fallback;
}

function stickyBox(node: NodeJSON): Box {
	const params = node.parameters ?? {};
	return {
		x: node.position[0],
		y: node.position[1],
		width: readSize(params.width, DEFAULT_STICKY_SIZE[0]),
		height: readSize(params.height, DEFAULT_STICKY_SIZE[1]),
	};
}

function encloses(outer: Box, node: NodeJSON): boolean {
	const [x, y] = node.position;
	const [w, h] = DEFAULT_NODE_SIZE;
	return (
		x >= outer.x &&
		y >= outer.y &&
		x + w <= outer.x + outer.width &&
		y + h <= outer.y + outer.height
	);
}

/**
 * Report every sticky note whose text is taller than the room it has.
 *
 * @param workflow - a workflow that has already been through layout
 */
export function detectStickyLayoutWarnings(workflow: WorkflowJSON): StickyLayoutWarning[] {
	const stickies = workflow.nodes.filter((node) => node.type === STICKY_NODE_TYPE);
	if (stickies.length === 0) return [];

	const plainNodes = workflow.nodes.filter((node) => node.type !== STICKY_NODE_TYPE);
	const warnings: StickyLayoutWarning[] = [];

	for (const sticky of stickies) {
		const content = sticky.parameters?.content;
		if (typeof content !== 'string' || content.length === 0) continue;

		const box = stickyBox(sticky);
		const wrapped = plainNodes.filter((node) => encloses(box, node));

		// A note that wraps nodes shows its text in the band above them. One that
		// wraps nothing has its whole box to play with.
		const available = wrapped.length
			? Math.min(...wrapped.map((node) => node.position[1])) - box.y - STICKY_TEXT_INTERNAL_PADDING
			: usableTextHeight(box.height);

		const needed = estimateStickyTextHeight(content, box.width);
		const shortfall = needed - Math.max(0, available);
		if (shortfall <= OVERFLOW_TOLERANCE) continue;

		const name = sticky.name ?? 'Sticky Note';
		warnings.push({
			code: 'STICKY_TEXT_OVERFLOW',
			nodeName: name,
			message:
				`Sticky note "${name}" has about ${shortfall}px more text than fits in its ` +
				`${box.width}x${box.height} box, and the canvas cuts off what does not fit. ` +
				'Shorten the text, split it into two notes, or give this note a larger width and height.',
		});
	}

	return warnings;
}
