import type { CanvasNode, CanvasState, NodeId, Position, Rect } from './types';
import { isGroupNode } from './types';

export const PUSH_OFFSET = 20;

export type PushDirection = 'right' | 'down';

export interface SinglePush {
	direction: PushDirection;
	magnitude: number;
}

export interface ComponentPush {
	nodes: NodeId[];
	direction: PushDirection;
	magnitude: number;
}

// Push the node clear of the obstacle's near edge by its own dimension on the
// chosen axis plus PUSH_OFFSET (20px). After the push, the node's near edge
// sits at (obstacle's far edge + node-dimension + PUSH_OFFSET) — i.e. one full
// node away from the obstacle plus a 20px gap. This matches n8n's grid sense
// where consecutive nodes are roughly a node-width apart.
//
// Direction rule:
//   - With a `pivot`: a node whose top-left is above-right of the line from
//     `pivot` to (rect.right, rect.bottom) pushes RIGHT; below-left pushes
//     DOWN. Used during group expansion, where `pivot` is the collapsed
//     group's bottom-right corner.
//   - Without `pivot` (or when pivot coincides with the rect's far corner):
//     falls back to the 45° rule (smaller axis wins). Used by cascade
//     obstacles, which have no "previous size" concept.
//
// Magnitude on each axis: `overlap + node-dimension + PUSH_OFFSET`.
export function minPush(node: CanvasNode, rect: Rect, pivot?: Position): SinglePush {
	const ex = rect.x + rect.width;
	const ey = rect.y + rect.height;
	const px = node.position.x;
	const py = node.position.y;
	const overlapX = ex - px;
	const overlapY = ey - py;
	const dx = overlapX + node.size.width + PUSH_OFFSET;
	const dy = overlapY + node.size.height + PUSH_OFFSET;

	let isRight: boolean;
	if (pivot && (pivot.x !== ex || pivot.y !== ey)) {
		const cross = (py - pivot.y) * (ex - pivot.x) - (px - pivot.x) * (ey - pivot.y);
		isRight = cross <= 0;
	} else {
		isRight = dx <= dy;
	}

	return isRight ? { direction: 'right', magnitude: dx } : { direction: 'down', magnitude: dy };
}

// Aggregates per-node max delta in each direction across the per-node pushes
// from a round. Max aggregation lets group-to-children propagation coexist
// with a child's own (possibly larger) delta.
export function applyPushes(state: CanvasState, pushes: readonly ComponentPush[]): CanvasState {
	if (pushes.length === 0) return state;
	const xDelta = new Map<NodeId, number>();
	const yDelta = new Map<NodeId, number>();
	for (const p of pushes) {
		const bucket = p.direction === 'right' ? xDelta : yDelta;
		for (const id of p.nodes) {
			const cur = bucket.get(id) ?? 0;
			if (p.magnitude > cur) bucket.set(id, p.magnitude);
		}
	}
	// When a group moves, its children move with it — otherwise pushing a group
	// in a multi-group scenario would tear its internal layout apart. Max
	// aggregation means a child's own (larger) delta still wins where it
	// applies, which is what we want for ordinary nodes that happen to sit
	// outside their group's containment.
	for (const node of state.nodes.values()) {
		if (!isGroupNode(node)) continue;
		const gx = xDelta.get(node.id) ?? 0;
		const gy = yDelta.get(node.id) ?? 0;
		if (gx === 0 && gy === 0) continue;
		for (const childId of node.childIds) {
			if (gx > (xDelta.get(childId) ?? 0)) xDelta.set(childId, gx);
			if (gy > (yDelta.get(childId) ?? 0)) yDelta.set(childId, gy);
		}
	}
	const nextNodes = new Map(state.nodes);
	for (const [id, node] of state.nodes) {
		const dx = xDelta.get(id) ?? 0;
		const dy = yDelta.get(id) ?? 0;
		if (dx === 0 && dy === 0) continue;
		nextNodes.set(id, {
			...node,
			position: { x: node.position.x + dx, y: node.position.y + dy },
		});
	}
	return { ...state, nodes: nextNodes };
}
