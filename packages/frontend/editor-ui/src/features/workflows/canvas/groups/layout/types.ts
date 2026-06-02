/**
 * Internal model for the group collapse/expand layout algorithm.
 *
 * Ported from the `n8n-groups-proto` prototype. The algorithm treats a group
 * as a first-class node with a collapsed and a (derived) expanded size; the
 * n8n-facing adapter in `index.ts` maps n8n's overlay-based group model onto
 * this shape. Keeping the prototype's internal model intact lets us reuse its
 * proven invariant tests verbatim.
 */

export interface Position {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Rect extends Position, Size {}

export type NodeId = string;

interface BaseNode {
	id: NodeId;
	position: Position;
	size: Size;
}

export interface StandardNode extends BaseNode {
	type: 'standard';
}

export interface GroupNode extends BaseNode {
	type: 'group';
	expanded: boolean;
	// Collapsed size is fixed by the caller. Expanded size is derived from
	// children via `getExpandedSize` so the group always tight-wraps its
	// contents, unless an explicit size is supplied.
	collapsedSize: Size;
	childIds: NodeId[];
	// Per-node delta applied by the expand algorithm, plus the trigger edge
	// that justifies pulling it back on collapse. Collapse subtracts (dx, dy)
	// from the node's current position ONLY if the node still sits past `edge`
	// along its push axis — otherwise the user has dragged it out of the
	// trigger's affected zone and we leave it.
	expandDeltas?: Map<NodeId, ExpandDelta>;
}

export interface ExpandDelta {
	dx: number;
	dy: number;
	// Bounding rect of whatever triggered this push (the group's expanded bbox
	// for initial-round nodes, the obstacle's swept rect for cascade nodes).
	// Collapse only pulls a node back if it's both past the far edge along its
	// push axis AND still overlaps the trigger's range on the perpendicular
	// axis.
	triggerRect: Rect;
}

export type CanvasNode = StandardNode | GroupNode;

export interface CanvasState {
	nodes: Map<NodeId, CanvasNode>;
}

export function isGroupNode(node: CanvasNode): node is GroupNode {
	return node.type === 'group';
}
