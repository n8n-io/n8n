import type { AgentVisualizationNode } from './AgentVisualization.types';

export interface VisualizationPosition {
	key: string;
	parentKey: string;
	node: AgentVisualizationNode;
	x: number;
	y: number;
	incoming: boolean;
	add: boolean;
	spoke?: { x: number; y: number };
}
export interface VisualizationNodeSize {
	width: number;
	height: number;
	labelWidth: number;
	labelHeight: number;
}
export const VISUALIZATION_ROOT = 'agent';
const COLUMN_GAP = 240;
const CLEARANCE = 24;

export function visualizationNodeBounds(
	item: VisualizationPosition,
	sizes: ReadonlyMap<string, VisualizationNodeSize> = new Map(),
) {
	const size = sizes.get(item.key) ?? {
		width: item.add ? 48 : 96,
		height: item.add ? 48 : 96,
		labelWidth: item.add ? 0 : 192,
		labelHeight: item.add ? 0 : 42,
	};
	const halfWidth = Math.max(size.width, size.labelWidth) / 2;
	return {
		left: item.x - halfWidth,
		right: item.x + halfWidth,
		top: item.y - size.height / 2,
		bottom: item.y + size.height / 2 + (size.labelHeight ? 8 + size.labelHeight : 0),
	};
}

/** Pack only rectangles that share space. A subtree does not reserve empty columns. */
export function layoutAgentVisualization(
	root: AgentVisualizationNode,
	expanded: ReadonlySet<string>,
	canEdit: boolean,
	addLabel: string,
	sizes: ReadonlyMap<string, VisualizationNodeSize> = new Map(),
): VisualizationPosition[] {
	function children(node: AgentVisualizationNode) {
		const items = (node.children ?? []).map((child) => ({ node: child, add: false }));
		if (canEdit && node.addActions?.length)
			items.push({
				node: { id: '__add__', label: addLabel, icon: 'plus', addActions: node.addActions },
				add: true,
			});
		return items;
	}
	function pack(trees: VisualizationPosition[][]): VisualizationPosition[] {
		const placed: VisualizationPosition[] = [];
		for (const tree of trees) {
			let shift = 0;
			for (const item of tree) {
				const box = visualizationNodeBounds(item, sizes);
				for (const earlier of placed) {
					const other = visualizationNodeBounds(earlier, sizes);
					if (box.left < other.right + CLEARANCE && box.right > other.left - CLEARANCE) {
						shift = Math.max(shift, other.bottom + CLEARANCE - box.top);
					}
				}
			}
			placed.push(...tree.map((item) => ({ ...item, y: item.y + shift })));
		}
		return placed;
	}
	function branch(position: VisualizationPosition): VisualizationPosition[] {
		if (position.add || !expanded.has(position.key)) return [position];
		const items = children(position.node);
		const childTrees = items.map((item, index) =>
			branch({
				key: `${position.key}/${item.node.id}`,
				parentKey: position.key,
				node: item.node,
				x:
					position.x +
					(position.incoming ? -1 : 1) *
						COLUMN_GAP *
						Math.cos(items.length <= 1 ? 0 : (index / (items.length - 1) - 0.5) * Math.PI * 0.55),
				y: 0,
				incoming: position.incoming,
				add: item.add,
			}),
		);
		const packed = pack(childTrees);
		const roots = packed.filter((item) => item.parentKey === position.key);
		const middle = ((roots[0]?.y ?? 0) + (roots.at(-1)?.y ?? 0)) / 2;
		return [position, ...packed.map((item) => ({ ...item, y: item.y - middle + position.y }))];
	}
	const result: VisualizationPosition[] = [];
	for (const incoming of [true, false]) {
		const side = children(root).filter((item) => (item.node.id === 'invocation') === incoming);
		const bases = pack(
			side.map((item, index) => {
				const angle =
					side.length <= 1 ? 0 : -Math.PI * 0.42 + (index / (side.length - 1)) * Math.PI * 0.84;
				return [
					{
						key: `${VISUALIZATION_ROOT}/${item.node.id}`,
						parentKey: VISUALIZATION_ROOT,
						node: item.node,
						x: incoming ? -260 : Math.cos(angle) * 340,
						y: incoming ? 0 : Math.sin(angle) * 320,
						incoming,
						add: item.add,
					},
				];
			}),
		);
		const middle = ((bases[0]?.y ?? 0) + (bases.at(-1)?.y ?? 0)) / 2;
		for (const item of bases) {
			item.y -= middle;
			if (!incoming) item.spoke = { x: item.x, y: item.y };
		}
		if (incoming || !bases.some((item) => expanded.has(item.key))) {
			result.push(...bases.flatMap((item) => branch(item)));
			continue;
		}
		// Keep the resting spokes. Make a pocket outside them for each open fan.
		const tucked = bases
			.filter((item) => !expanded.has(item.key))
			.map((item) => ({ ...item, x: item.x * 0.9 }));
		const outerEdge = Math.max(
			160,
			...tucked.map((item) => visualizationNodeBounds(item, sizes).right),
		);
		const opened = bases.filter((item) => expanded.has(item.key));
		const openTrees = opened.map((item) => {
			const box = visualizationNodeBounds(item, sizes);
			return branch({
				...item,
				spoke: { x: item.x, y: item.y },
				x: Math.max(item.x + 96, outerEdge + CLEARANCE + (box.right - box.left) / 2),
			});
		});
		const packed = pack(openTrees);
		const parents = packed.filter((item) => item.parentKey === VISUALIZATION_ROOT);
		const offset =
			parents.reduce((sum, item, index) => sum + item.y - opened[index].y, 0) / parents.length;
		for (const base of bases) {
			if (expanded.has(base.key))
				result.push(
					...packed
						.filter((item) => item.key === base.key || item.key.startsWith(`${base.key}/`))
						.map((item) => ({ ...item, y: item.y - offset })),
				);
			else result.push(tucked.find((item) => item.key === base.key) ?? base);
		}
	}
	return result;
}

export function visualizationBounds(
	positions: VisualizationPosition[],
	sizes: ReadonlyMap<string, VisualizationNodeSize> = new Map(),
) {
	const boxes = positions.map((item) => visualizationNodeBounds(item, sizes));
	return {
		left: Math.min(-64, ...boxes.map((box) => box.left - 16)),
		right: Math.max(64, ...boxes.map((box) => box.right + 16)),
		top: Math.min(-64, ...boxes.map((box) => box.top - 16)),
		bottom: Math.max(64, ...boxes.map((box) => box.bottom + 16)),
	};
}

type LinkPoint = { x: number; y: number };
export type LinkCurve = [LinkPoint, LinkPoint, LinkPoint, LinkPoint];
export interface LinkObstacle {
	left: number;
	right: number;
	top: number;
	bottom: number;
	/** The side to pass on: 1 follows the chord normal (clockwise of the chord), -1 the other way. */
	side: 1 | -1;
}

function curvePoint([p0, p1, p2, p3]: LinkCurve, t: number): LinkPoint {
	const u = 1 - t;
	return {
		x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
		y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
	};
}

/**
 * Moves the two handles of a link so the curve passes beside nodes, not under them. Each obstacle
 * has a fixed side, and the push grows with the overlap, so the link eases around a drifting node
 * and does not jump. The curve stays one cubic, so it stays smooth.
 */
export function routeLinkAroundNodes(
	curve: LinkCurve,
	obstacles: readonly LinkObstacle[],
	margin = 12,
): LinkCurve {
	const [source, , , target] = curve;
	const chordX = target.x - source.x;
	const chordY = target.y - source.y;
	const chord = Math.hypot(chordX, chordY) || 1;
	const normal = { x: -chordY / chord, y: chordX / chord };
	const boxes = obstacles
		.map((box) => ({
			left: box.left - margin,
			right: box.right + margin,
			top: box.top - margin,
			bottom: box.bottom + margin,
			side: box.side,
		}))
		.filter(
			(box) =>
				![source, target].some(
					(point) =>
						point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom,
				),
		);
	if (!boxes.length) return curve;
	const [, start1, start2] = curve;
	let [, c1, c2] = curve;
	// Cap how far a handle can travel so a crowded layout cannot fling the link away.
	const limit = chord * 1.2;
	const clamp = (point: LinkPoint, start: LinkPoint) => {
		const dx = point.x - start.x;
		const dy = point.y - start.y;
		const length = Math.hypot(dx, dy);
		return length <= limit
			? point
			: { x: start.x + (dx / length) * limit, y: start.y + (dy / length) * limit };
	};
	for (let pass = 0; pass < 6; pass++) {
		const move1 = { x: 0, y: 0 };
		const move2 = { x: 0, y: 0 };
		for (const box of boxes) {
			const push = { x: normal.x * box.side, y: normal.y * box.side };
			let need1 = 0;
			let need2 = 0;
			for (let step = 3; step <= 17; step++) {
				const t = step / 20;
				const point = curvePoint([source, c1, c2, target], t);
				if (
					point.x <= box.left ||
					point.x >= box.right ||
					point.y <= box.top ||
					point.y >= box.bottom
				)
					continue;
				// Distance to leave the box along the push direction.
				const exitX =
					Math.abs(push.x) < 1e-6
						? Infinity
						: (push.x > 0 ? box.right - point.x : point.x - box.left) / Math.abs(push.x);
				const exitY =
					Math.abs(push.y) < 1e-6
						? Infinity
						: (push.y > 0 ? box.bottom - point.y : point.y - box.top) / Math.abs(push.y);
				const depth = Math.min(exitX, exitY);
				const w1 = 3 * (1 - t) ** 2 * t;
				const w2 = 3 * (1 - t) * t ** 2;
				const norm = w1 ** 2 + w2 ** 2;
				need1 = Math.max(need1, (depth * w1) / norm);
				need2 = Math.max(need2, (depth * w2) / norm);
			}
			move1.x += push.x * need1;
			move1.y += push.y * need1;
			move2.x += push.x * need2;
			move2.y += push.y * need2;
		}
		if (!move1.x && !move1.y && !move2.x && !move2.y) break;
		// Damp each pass so overlapping obstacles do not overshoot.
		c1 = clamp({ x: c1.x + move1.x * 0.6, y: c1.y + move1.y * 0.6 }, start1);
		c2 = clamp({ x: c2.x + move2.x * 0.6, y: c2.y + move2.y * 0.6 }, start2);
	}
	return [source, c1, c2, target];
}
