import type { CanvasNode, NodeId, Rect } from './types';
import { isGroupNode } from './types';

export function rectIntersects(a: Rect, b: Rect): boolean {
	return !(
		a.x + a.width <= b.x ||
		b.x + b.width <= a.x ||
		a.y + a.height <= b.y ||
		b.y + b.height <= a.y
	);
}

export function nodeRect(node: CanvasNode): Rect {
	return {
		x: node.position.x,
		y: node.position.y,
		width: node.size.width,
		height: node.size.height,
	};
}

export function findOverlapping(
	nodes: Map<NodeId, CanvasNode>,
	rect: Rect,
	exclude: ReadonlySet<NodeId>,
): CanvasNode[] {
	const out: CanvasNode[] = [];
	for (const node of nodes.values()) {
		if (exclude.has(node.id)) continue;
		if (rectIntersects(nodeRect(node), rect)) out.push(node);
	}
	return out;
}

// Every node that lives inside some group. These are not overlap candidates —
// they move with their containing group rather than being pushed
// independently. Used to build the exclude set for findOverlapping.
export function collectAllChildIds(nodes: Map<NodeId, CanvasNode>): Set<NodeId> {
	const out = new Set<NodeId>();
	for (const node of nodes.values()) {
		if (!isGroupNode(node)) continue;
		for (const id of node.childIds) out.add(id);
	}
	return out;
}
