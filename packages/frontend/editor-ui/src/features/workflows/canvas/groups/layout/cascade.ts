import type { CanvasState, NodeId, Position, Rect, Size } from './types';
import { isGroupNode } from './types';
import { collectAllChildIds, nodeRect, rectIntersects } from './overlap';
import { applyPushes, type ComponentPush, type PushDirection } from './push';

const MAX_ITER = 5;

export interface MovedInfo {
	originalPos: Position;
	direction: PushDirection;
	// Bounding rect of whatever triggered this push. For initial-round pushes
	// this is the group's expanded bbox; for cascade rounds it's the
	// obstacle's swept rect. Collapse needs both the far edge (along the push
	// axis) and the perpendicular extent to decide whether the node is still
	// in its trigger's affected zone.
	triggerRect: Rect;
}

// Bounding rect of a node's full trajectory: union of its starting rect
// (originalPos + size) and its current rect (currentPos + size). For
// axis-aligned pushes this becomes a long thin rectangle covering every point
// the node passed through.
function sweepRect(start: Position, end: Position, size: Size): Rect {
	return {
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x) + size.width,
		height: Math.abs(end.y - start.y) + size.height,
	};
}

// Cascade rounds use the SWEPT volume of every previously-moved node
// (start → end bounding box), not just the current rect, so a node that moved
// entirely past an unmoved one still counts as overlapping it. Direction is
// INHERITED from whichever obstacle the unmoved node hit first — no minPush
// call, no per-node direction recomputation. Magnitude is the uniform
// rightDelta / downDelta from the initial expand round, so the whole chain
// shifts rigidly with no growth. Bounded at MAX_ITER iterations as a safety
// net.
export function resolveCascade(
	state: CanvasState,
	groupId: NodeId,
	moved: Map<NodeId, MovedInfo>,
	rightDelta: number,
	downDelta: number,
): CanvasState {
	const seed = state.nodes.get(groupId);
	if (!seed || !isGroupNode(seed)) return state;

	interface SweptObstacle {
		rect: Rect;
		direction: PushDirection;
	}

	let cur = state;
	for (let i = 0; i < MAX_ITER; i++) {
		const allChildren = collectAllChildIds(cur.nodes);

		const obstacles: SweptObstacle[] = [];
		for (const [id, info] of moved) {
			const n = cur.nodes.get(id);
			if (!n) continue;
			obstacles.push({
				rect: sweepRect(info.originalPos, n.position, n.size),
				direction: info.direction,
			});
		}

		const rightIds: NodeId[] = [];
		const downIds: NodeId[] = [];
		const newMoved: Array<[NodeId, MovedInfo]> = [];
		for (const node of cur.nodes.values()) {
			if (node.id === groupId || allChildren.has(node.id) || moved.has(node.id)) continue;
			const r = nodeRect(node);
			let chosenDir: PushDirection | undefined;
			let chosenRect: Rect | undefined;
			for (const obs of obstacles) {
				if (!rectIntersects(r, obs.rect)) continue;
				chosenDir = obs.direction;
				chosenRect = obs.rect;
				break;
			}
			if (!chosenDir || !chosenRect) continue;
			if (chosenDir === 'right') rightIds.push(node.id);
			else downIds.push(node.id);
			newMoved.push([
				node.id,
				{
					originalPos: { x: node.position.x, y: node.position.y },
					direction: chosenDir,
					triggerRect: chosenRect,
				},
			]);
		}

		if (rightIds.length === 0 && downIds.length === 0) return cur;

		const pushes: ComponentPush[] = [];
		if (rightIds.length > 0) {
			pushes.push({ nodes: rightIds, direction: 'right', magnitude: rightDelta });
		}
		if (downIds.length > 0) {
			pushes.push({ nodes: downIds, direction: 'down', magnitude: downDelta });
		}

		cur = applyPushes(cur, pushes);
		for (const [id, info] of newMoved) {
			moved.set(id, info);
		}
	}

	return cur;
}
