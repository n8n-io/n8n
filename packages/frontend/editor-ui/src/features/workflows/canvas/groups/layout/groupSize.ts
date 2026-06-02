import type { CanvasNode, GroupNode, NodeId, Size } from './types';

// Computes a group's expanded size dynamically: it extends from the anchor
// (group.position) right and down to wrap every child, with `padding` past the
// rightmost child's right edge and the lowest child's bottom edge.
//
// The anchor never moves on expand/collapse, so only the right and bottom
// edges flex. If a sub-node is dragged farther right or down, the group grows;
// if dragged back, it shrinks.
export function getExpandedSize(
	group: GroupNode,
	nodes: ReadonlyMap<NodeId, CanvasNode>,
	padding = 20,
): Size {
	let maxRight = group.position.x + padding;
	let maxBottom = group.position.y + padding;
	for (const childId of group.childIds) {
		const child = nodes.get(childId);
		if (!child) continue;
		const right = child.position.x + child.size.width + padding;
		const bottom = child.position.y + child.size.height + padding;
		if (right > maxRight) maxRight = right;
		if (bottom > maxBottom) maxBottom = bottom;
	}
	return {
		width: maxRight - group.position.x,
		height: maxBottom - group.position.y,
	};
}
