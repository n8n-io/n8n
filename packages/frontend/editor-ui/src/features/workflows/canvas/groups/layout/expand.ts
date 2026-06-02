import type { CanvasState, ExpandDelta, GroupNode, NodeId, Position, Rect, Size } from './types';
import { isGroupNode } from './types';
import { collectAllChildIds, findOverlapping, nodeRect, rectIntersects } from './overlap';
import { applyPushes, minPush, PUSH_OFFSET, type ComponentPush } from './push';
import { resolveCascade, type MovedInfo } from './cascade';
import { getExpandedSize } from './groupSize';

function requireGroup(state: CanvasState, id: NodeId): GroupNode {
	const node = state.nodes.get(id);
	if (!node) throw new Error(`No node with id ${id}`);
	if (!isGroupNode(node)) throw new Error(`Node ${id} is not a group`);
	return node;
}

// 2D zone check: a pushed node is still "in" its trigger's affected zone if it
// sits past the far edge along its push axis AND its rect still overlaps the
// trigger's extent on the perpendicular axis. If the user has dragged the node
// back inside the trigger, or sideways out of the trigger's footprint, this
// returns false and collapse leaves the node alone.
export function stillInTriggerZone(
	node: { position: Position; size: Size },
	info: ExpandDelta,
): boolean {
	const triggerRight = info.triggerRect.x + info.triggerRect.width;
	const triggerBottom = info.triggerRect.y + info.triggerRect.height;
	const nodeRight = node.position.x + node.size.width;
	const nodeBottom = node.position.y + node.size.height;
	if (info.dx > 0) {
		if (node.position.x <= triggerRight) return false;
		if (nodeBottom <= info.triggerRect.y) return false;
		if (node.position.y >= triggerBottom) return false;
		return true;
	}
	if (info.dy > 0) {
		if (node.position.y <= triggerBottom) return false;
		if (nodeRight <= info.triggerRect.x) return false;
		if (node.position.x >= triggerRight) return false;
		return true;
	}
	return false;
}

export interface ExpandOptions {
	// Explicit expanded footprint size. When omitted the size is derived from
	// the group's children via getExpandedSize. The n8n adapter passes the
	// rendered frame size so pushes clear the visible frame, not just the
	// tight child bbox.
	expandedSize?: Size;
}

export function expandGroup(
	state: CanvasState,
	groupId: NodeId,
	options: ExpandOptions = {},
): CanvasState {
	const group = requireGroup(state, groupId);
	if (group.expanded) return state;

	const expandedSize = options.expandedSize ?? getExpandedSize(group, state.nodes);
	const expandedRect: Rect = {
		x: group.position.x,
		y: group.position.y,
		width: expandedSize.width,
		height: expandedSize.height,
	};

	// Exclude every group child (not just this group's) from overlap detection
	// — children move with their containing group, not independently.
	const allChildren = collectAllChildIds(state.nodes);
	const excludeOverlap = new Set<NodeId>([groupId, ...allChildren]);
	const affected = findOverlapping(state.nodes, expandedRect, excludeOverlap);

	let working = state;

	// Direction is chosen per node via the pivot rule. Magnitude is the
	// group's growth on the chosen axis plus PUSH_OFFSET — so every
	// right-pushed node shifts by the same amount and every down-pushed node
	// shifts by the same amount, regardless of how deeply each one overlapped
	// the expansion. Cascade rounds reuse the same deltas so the entire chain
	// stays rigid.
	const widthGrowth = expandedSize.width - group.collapsedSize.width;
	const heightGrowth = expandedSize.height - group.collapsedSize.height;
	const rightDelta = widthGrowth + PUSH_OFFSET;
	const downDelta = heightGrowth + PUSH_OFFSET;

	if (affected.length > 0) {
		const collapsedBR: Position = {
			x: group.position.x + group.collapsedSize.width,
			y: group.position.y + group.collapsedSize.height,
		};
		const rightIds: NodeId[] = [];
		const downIds: NodeId[] = [];
		for (const node of affected) {
			const p = minPush(node, expandedRect, collapsedBR);
			if (p.direction === 'right') rightIds.push(node.id);
			else downIds.push(node.id);
		}
		const pushes: ComponentPush[] = [];
		if (rightIds.length > 0) {
			pushes.push({ nodes: rightIds, direction: 'right', magnitude: rightDelta });
		}
		if (downIds.length > 0) {
			pushes.push({ nodes: downIds, direction: 'down', magnitude: downDelta });
		}
		working = applyPushes(state, pushes);
	}

	// Promote the group. expandDeltas is attached at the end, once cascade has
	// finished and we know each pushed node's final delta.
	const expandedGroup: GroupNode = {
		id: group.id,
		type: 'group',
		position: { x: group.position.x, y: group.position.y },
		size: { ...expandedSize },
		expanded: true,
		collapsedSize: { ...group.collapsedSize },
		childIds: [...group.childIds],
	};
	const nextNodes = new Map(working.nodes);
	nextNodes.set(groupId, expandedGroup);
	working = { nodes: nextNodes };

	// Seed the moved map with initial-round entries — direction and
	// triggerRect known directly from the pivot decision and the group's
	// expanded bbox. Children of any pushed groups inherit those values
	// (applyPushes will translate them by the same delta).
	const moved = new Map<NodeId, MovedInfo>();
	for (const node of affected) {
		const newNode = working.nodes.get(node.id);
		if (!newNode) continue;
		const dx = newNode.position.x - node.position.x;
		const dy = newNode.position.y - node.position.y;
		if (dx === 0 && dy === 0) continue;
		const direction = dx > 0 ? 'right' : 'down';
		moved.set(node.id, {
			originalPos: { x: node.position.x, y: node.position.y },
			direction,
			triggerRect: expandedRect,
		});
		if (isGroupNode(node)) {
			for (const childId of node.childIds) {
				const child = state.nodes.get(childId);
				if (!child) continue;
				moved.set(childId, {
					originalPos: { x: child.position.x, y: child.position.y },
					direction,
					triggerRect: expandedRect,
				});
			}
		}
	}

	const cascaded = resolveCascade(working, groupId, moved, rightDelta, downDelta);

	// Build expandDeltas: only "primary" moved nodes — those the algorithm
	// explicitly pushed — get stored entries. Children of pushed groups are
	// NOT stored individually; they ride with their parent at collapse time.
	const expandDeltas = new Map<NodeId, ExpandDelta>();
	for (const [id, info] of moved) {
		const finalNode = cascaded.nodes.get(id);
		if (!finalNode) continue;
		const dx = finalNode.position.x - info.originalPos.x;
		const dy = finalNode.position.y - info.originalPos.y;
		if (dx === 0 && dy === 0) continue;
		// Skip children of moved groups — they're tied to their parent.
		let parentMoved = false;
		for (const candidate of state.nodes.values()) {
			if (!isGroupNode(candidate)) continue;
			if (!candidate.childIds.includes(id)) continue;
			if (moved.has(candidate.id)) parentMoved = true;
			break;
		}
		if (parentMoved) continue;
		expandDeltas.set(id, { dx, dy, triggerRect: info.triggerRect });
	}

	const groupAfter = cascaded.nodes.get(groupId);
	if (!groupAfter || !isGroupNode(groupAfter)) return cascaded;
	const finalNodes = new Map(cascaded.nodes);
	finalNodes.set(groupId, { ...groupAfter, expandDeltas });
	return { nodes: finalNodes };
}

export function collapseGroup(state: CanvasState, groupId: NodeId): CanvasState {
	const group = requireGroup(state, groupId);
	if (!group.expanded) return state;

	// For each pushed node, pull back ONLY if it's still inside its trigger's
	// affected zone — past the far edge along its push axis AND overlapping the
	// trigger's perpendicular range. See stillInTriggerZone for the 2D check;
	// this means dragging a node either back across the trigger edge OR
	// sideways out of its footprint leaves it alone on collapse.
	const nextNodes = new Map(state.nodes);
	if (group.expandDeltas) {
		for (const [id, info] of group.expandDeltas) {
			const node = nextNodes.get(id);
			if (!node) continue;
			if (!stillInTriggerZone(node, info)) continue;
			// Pull the node back, and if it's a group, slide every child by the
			// same delta so the group stays internally intact.
			nextNodes.set(id, {
				...node,
				position: { x: node.position.x - info.dx, y: node.position.y - info.dy },
			});
			if (isGroupNode(node)) {
				for (const childId of node.childIds) {
					const child = nextNodes.get(childId);
					if (!child) continue;
					nextNodes.set(childId, {
						...child,
						position: { x: child.position.x - info.dx, y: child.position.y - info.dy },
					});
				}
			}
		}
	}

	// Rebuild the group explicitly so expandDeltas is omitted.
	const restored: GroupNode = {
		id: group.id,
		type: 'group',
		position: { x: group.position.x, y: group.position.y },
		size: { ...group.collapsedSize },
		expanded: false,
		collapsedSize: { ...group.collapsedSize },
		childIds: [...group.childIds],
	};
	nextNodes.set(groupId, restored);

	const intermediate: CanvasState = { nodes: nextNodes };
	return resolveCollapseOverlaps(intermediate, groupId, group.expandDeltas);
}

// After pull-back, any node the user dragged into the path of a returning node
// inherits the obstacle's COLLAPSE motion — i.e. the inverse of its expand
// delta. A node moved down 140 on expand moves up 140 on collapse; a node
// sitting in its path follows it up 140 rather than being pushed down by
// minPush. Targets are limited to nodes that don't have an expand-delta entry
// (those were either pulled back or intentionally left at a drag position and
// are treated as fixed). The source group has no collapse delta of its own —
// when a target overlaps it, minPush picks a right/down push as a fallback.
// Bounded by MAX_COLLAPSE_ITER as a safety net.
interface ResolutionObstacle {
	rect: Rect;
	// null = source group; resolved per-target via minPush.
	delta: Position | null;
}

const MAX_COLLAPSE_ITER = 5;
function resolveCollapseOverlaps(
	state: CanvasState,
	groupId: NodeId,
	expandDeltas: Map<NodeId, ExpandDelta> | undefined,
): CanvasState {
	const movedByResolution = new Map<NodeId, Position>();
	let cur = state;
	for (let i = 0; i < MAX_COLLAPSE_ITER; i++) {
		const allChildren = collectAllChildIds(cur.nodes);
		const obstacles: ResolutionObstacle[] = [];
		const groupNode = cur.nodes.get(groupId);
		if (groupNode) obstacles.push({ rect: nodeRect(groupNode), delta: null });
		if (expandDeltas) {
			for (const [id, info] of expandDeltas) {
				if (allChildren.has(id)) continue;
				const n = cur.nodes.get(id);
				if (!n) continue;
				// Collapse delta = inverse of expand delta.
				obstacles.push({ rect: nodeRect(n), delta: { x: -info.dx, y: -info.dy } });
			}
		}
		for (const [id, delta] of movedByResolution) {
			const n = cur.nodes.get(id);
			if (!n) continue;
			obstacles.push({ rect: nodeRect(n), delta });
		}

		const newMoves = new Map<NodeId, Position>();
		for (const node of cur.nodes.values()) {
			if (node.id === groupId) continue;
			if (allChildren.has(node.id)) continue;
			if (expandDeltas?.has(node.id)) continue;
			if (movedByResolution.has(node.id)) continue;
			const r = nodeRect(node);
			let chosenDelta: Position | undefined;
			let chosenScore = -Infinity;
			for (const obs of obstacles) {
				if (!rectIntersects(r, obs.rect)) continue;
				let delta: Position;
				if (obs.delta !== null) {
					delta = obs.delta;
				} else {
					// Source group fallback — pick a right/down push.
					const p = minPush(node, obs.rect);
					delta = p.direction === 'right' ? { x: p.magnitude, y: 0 } : { x: 0, y: p.magnitude };
				}
				const score = Math.abs(delta.x) + Math.abs(delta.y);
				if (score > chosenScore) {
					chosenScore = score;
					chosenDelta = delta;
				}
			}
			if (!chosenDelta) continue;
			newMoves.set(node.id, chosenDelta);
		}

		if (newMoves.size === 0) return cur;

		const nextNodes = new Map(cur.nodes);
		for (const [id, delta] of newMoves) {
			const n = nextNodes.get(id);
			if (!n) continue;
			nextNodes.set(id, {
				...n,
				position: { x: n.position.x + delta.x, y: n.position.y + delta.y },
			});
		}
		cur = { nodes: nextNodes };
		for (const [id, delta] of newMoves) movedByResolution.set(id, delta);
	}
	return cur;
}
