/**
 * n8n-facing adapter for the group collapse/expand layout algorithm.
 *
 * n8n models a group as an overlay (`IWorkflowGroup { id, name, nodeIds }`)
 * around always-present member nodes, whereas the ported algorithm models a
 * group as a node with collapsed/expanded sizes. This adapter bridges the two:
 * it synthesizes a single group node from the overlay's footprint, runs the
 * algorithm over a snapshot of every canvas node, and reads back the position
 * deltas for the non-member nodes that were pushed (expand) or pulled
 * back / resolved (collapse).
 *
 * Anchor convention: the collapsed box and the expanded frame share a
 * top-left corner, so the group's anchor is fixed across collapse/expand
 * (Critical invariant 2 from the prototype).
 */

import type { CanvasNode, ExpandDelta, NodeId } from './types';
import { collapseGroup, expandGroup } from './expand';

export interface LayoutRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface LayoutNode {
	id: string;
	position: { x: number; y: number };
	size: { width: number; height: number };
}

export interface NodeMove {
	id: string;
	position: { x: number; y: number };
}

/**
 * Reversible push record produced by an expand, consumed by the matching
 * collapse. Opaque to callers — store it transiently keyed by group id and
 * hand it back unchanged. Plain object so it round-trips through JSON.
 */
export type GroupExpandDeltas = Record<NodeId, ExpandDelta>;

// Sentinel id for the synthetic group node. Real n8n node ids never collide
// with this.
const SYNTHETIC_GROUP_ID = '__n8n_group_layout__';

function toCanvasNodes(nodes: LayoutNode[]) {
	const map = new Map<NodeId, CanvasNode>();
	for (const node of nodes) {
		map.set(node.id, {
			id: node.id,
			type: 'standard',
			position: { x: node.position.x, y: node.position.y },
			size: { width: node.size.width, height: node.size.height },
		});
	}
	return map;
}

function diffMoves(
	before: LayoutNode[],
	afterNodes: ReadonlyMap<NodeId, CanvasNode>,
	skip: ReadonlySet<NodeId>,
): NodeMove[] {
	const moves: NodeMove[] = [];
	for (const node of before) {
		if (skip.has(node.id)) continue;
		const after = afterNodes.get(node.id);
		if (!after) continue;
		if (after.position.x === node.position.x && after.position.y === node.position.y) continue;
		moves.push({ id: node.id, position: { x: after.position.x, y: after.position.y } });
	}
	return moves;
}

/**
 * Expand a group: the footprint grows from `collapsedRect` to `expandedRect`,
 * pushing any overlapping non-member node clear (with cascade). Members keep
 * their positions — they simply become visible again.
 */
export function computeExpandLayout(input: {
	nodes: LayoutNode[];
	memberIds: string[];
	collapsedRect: LayoutRect;
	expandedRect: LayoutRect;
}): { moves: NodeMove[]; expandDeltas: GroupExpandDeltas } {
	const memberSet = new Set(input.memberIds);
	const nodes = toCanvasNodes(input.nodes);
	nodes.set(SYNTHETIC_GROUP_ID, {
		id: SYNTHETIC_GROUP_ID,
		type: 'group',
		expanded: false,
		position: { x: input.expandedRect.x, y: input.expandedRect.y },
		size: { width: input.collapsedRect.width, height: input.collapsedRect.height },
		collapsedSize: { width: input.collapsedRect.width, height: input.collapsedRect.height },
		childIds: input.memberIds,
	});

	const result = expandGroup({ nodes }, SYNTHETIC_GROUP_ID, {
		expandedSize: { width: input.expandedRect.width, height: input.expandedRect.height },
	});

	const skip = new Set<NodeId>([SYNTHETIC_GROUP_ID, ...memberSet]);
	const moves = diffMoves(input.nodes, result.nodes, skip);

	const groupAfter = result.nodes.get(SYNTHETIC_GROUP_ID);
	const expandDeltas: GroupExpandDeltas = {};
	if (groupAfter && groupAfter.type === 'group' && groupAfter.expandDeltas) {
		for (const [id, delta] of groupAfter.expandDeltas) {
			expandDeltas[id] = delta;
		}
	}

	return { moves, expandDeltas };
}

/**
 * Collapse a group: the footprint shrinks from `expandedRect` to
 * `collapsedRect`. Nodes pushed by the matching expand are pulled back if they
 * are still in their trigger zone, and any node dragged into the returning
 * group's path is resolved out of the way.
 */
export function computeCollapseLayout(input: {
	nodes: LayoutNode[];
	memberIds: string[];
	collapsedRect: LayoutRect;
	expandedRect: LayoutRect;
	expandDeltas?: GroupExpandDeltas;
}): { moves: NodeMove[] } {
	const memberSet = new Set(input.memberIds);
	const nodes = toCanvasNodes(input.nodes);

	const deltaMap = new Map<NodeId, ExpandDelta>();
	if (input.expandDeltas) {
		for (const [id, delta] of Object.entries(input.expandDeltas)) {
			deltaMap.set(id, delta);
		}
	}

	nodes.set(SYNTHETIC_GROUP_ID, {
		id: SYNTHETIC_GROUP_ID,
		type: 'group',
		expanded: true,
		position: { x: input.collapsedRect.x, y: input.collapsedRect.y },
		size: { width: input.expandedRect.width, height: input.expandedRect.height },
		collapsedSize: { width: input.collapsedRect.width, height: input.collapsedRect.height },
		childIds: input.memberIds,
		expandDeltas: deltaMap.size > 0 ? deltaMap : undefined,
	});

	const result = collapseGroup({ nodes }, SYNTHETIC_GROUP_ID);

	const skip = new Set<NodeId>([SYNTHETIC_GROUP_ID, ...memberSet]);
	return { moves: diffMoves(input.nodes, result.nodes, skip) };
}
