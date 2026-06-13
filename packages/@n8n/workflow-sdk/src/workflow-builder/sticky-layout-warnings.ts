/**
 * Post-layout sanity checks for sticky notes.
 *
 * Runs against the serialized WorkflowJSON, after dagre has assigned final
 * positions and sticky dimensions have been computed. Warnings surface
 * problems the SDK cannot fix automatically — overlapping stickies, content
 * that pushed a sticky off the canvas — so the caller (the AI builder
 * agent, or a human reading validate_workflow output) can decide what to do.
 */

import { STICKY_NODE_TYPE } from './constants';
import type { WorkflowJSON, NodeJSON } from '../types/base';

export interface StickyLayoutWarning {
	code: 'STICKY_OVERLAP' | 'STICKY_WRAPS_SHARED_NODE';
	message: string;
	/** Name of the primary sticky involved (so the agent can locate it). */
	nodeName?: string;
}

interface StickyBox {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface NodeAnchor {
	name: string;
	x: number;
	y: number;
}

/** n8n's default sticky dimensions when parameters.width/height aren't set. */
const FALLBACK_STICKY_WIDTH = 240;
const FALLBACK_STICKY_HEIGHT = 160;

/**
 * Smallest overlap (in either axis) that we consider worth flagging. Below
 * this the stickies are essentially adjacent and the visual seam reads as
 * intentional. One grid step keeps the signal-to-noise ratio high.
 */
const MIN_OVERLAP_PX = 16;

function readPositiveNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && value > 0 ? value : fallback;
}

function getStickyBox(node: NodeJSON): StickyBox | null {
	if (node.type !== STICKY_NODE_TYPE) return null;
	if (!node.position || node.name === undefined) return null;
	const params = node.parameters;
	return {
		name: node.name,
		x: node.position[0],
		y: node.position[1],
		width: readPositiveNumber(params?.width, FALLBACK_STICKY_WIDTH),
		height: readPositiveNumber(params?.height, FALLBACK_STICKY_HEIGHT),
	};
}

function overlapExtents(a: StickyBox, b: StickyBox): { x: number; y: number } {
	const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	return { x, y };
}

function nodeInsideSticky(node: NodeAnchor, sticky: StickyBox): boolean {
	return (
		node.x >= sticky.x &&
		node.x <= sticky.x + sticky.width &&
		node.y >= sticky.y &&
		node.y <= sticky.y + sticky.height
	);
}

function getNodesInsideSticky(sticky: StickyBox, nodes: NodeAnchor[]): string[] {
	return nodes.filter((n) => nodeInsideSticky(n, sticky)).map((n) => n.name);
}

/**
 * Walk the serialized workflow and return any sticky-layout warnings.
 *
 * Currently detects:
 * - Two stickies whose rendered boxes overlap by more than a few pixels.
 *   Distinguishes "both contain the same non-sticky node" (the doc-over-group
 *   pattern, usually intentional) from accidental overlap of unrelated
 *   stickies (almost always a bug).
 */
export function detectStickyLayoutWarnings(workflow: WorkflowJSON): StickyLayoutWarning[] {
	const stickies: StickyBox[] = [];
	const nonStickies: NodeAnchor[] = [];

	for (const node of workflow.nodes) {
		if (node.type === STICKY_NODE_TYPE) {
			const box = getStickyBox(node);
			if (box) stickies.push(box);
		} else if (node.position && node.name !== undefined) {
			nonStickies.push({ name: node.name, x: node.position[0], y: node.position[1] });
		}
	}

	const warnings: StickyLayoutWarning[] = [];

	for (let i = 0; i < stickies.length; i++) {
		for (let j = i + 1; j < stickies.length; j++) {
			const a = stickies[i];
			const b = stickies[j];
			const { x: overlapX, y: overlapY } = overlapExtents(a, b);
			if (overlapX <= MIN_OVERLAP_PX || overlapY <= MIN_OVERLAP_PX) continue;

			const sharedNodes = getNodesInsideSticky(a, nonStickies).filter((name) =>
				getNodesInsideSticky(b, nonStickies).includes(name),
			);

			if (sharedNodes.length > 0) {
				warnings.push({
					code: 'STICKY_WRAPS_SHARED_NODE',
					message:
						`Stickies '${a.name}' and '${b.name}' both contain ` +
						`${sharedNodes.map((n) => `'${n}'`).join(', ')} and overlap on the canvas. ` +
						'Consider merging them into one sticky, or pin one with an explicit position.',
					nodeName: a.name,
				});
			} else {
				warnings.push({
					code: 'STICKY_OVERLAP',
					message:
						`Sticky '${a.name}' overlaps sticky '${b.name}' by ${overlapX}x${overlapY}px. ` +
						"Consider setting an explicit position on one of them, shortening the wider sticky's heading, " +
						'or grouping the affected nodes under a single sticky.',
					nodeName: a.name,
				});
			}
		}
	}

	return warnings;
}
