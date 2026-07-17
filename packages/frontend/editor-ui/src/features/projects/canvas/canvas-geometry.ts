import type { VisibleEdge } from './graph-model';

export interface XY {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Card size shared by workflow and collapsed-folder nodes. */
export const NODE = { w: 216, h: 80 };
/** Expanded folder container paddings and child grid. */
export const C_PAD = 18;
export const C_HEAD = 40;
export const C_GAPX = 64;
export const C_GAPY = 28;
export const C_WRAP = 4;
/** Initial auto-layout gaps. */
const COL_GAP = 170;
const ROW_GAP = 84;
/** Minimum distance kept between units by overlap resolution. */
export const CLEARANCE = 40;

/**
 * Initial automatic layout over root-level units only, using the folder-aggregated edge
 * set. Columns = longest path along trigger ('calls-workflow') edges left→right; a node
 * referenced only by tool edges always hangs directly below its caller, in the caller's
 * column; other nodes are ordered within a column by barycenter of already-placed
 * neighbours. Units with no edges go into a grid below the connected graph.
 */
export function autoLayout(units: string[], edges: VisibleEdge[]): Map<string, XY> {
	const positions = new Map<string, XY>();
	const unitSet = new Set(units);
	const relevantEdges = edges.filter((e) => unitSet.has(e.source) && unitSet.has(e.target));

	const hasEdge = new Set<string>();
	for (const edge of relevantEdges) {
		hasEdge.add(edge.source);
		hasEdge.add(edge.target);
	}
	const connected = units.filter((id) => hasEdge.has(id));
	const isolated = units.filter((id) => !hasEdge.has(id));

	// Columns: longest path over trigger edges
	const triggerAdj = new Map<string, string[]>();
	const triggerIn = new Map<string, number>();
	for (const edge of relevantEdges.filter((e) => e.type === 'calls-workflow')) {
		const list = triggerAdj.get(edge.source) ?? [];
		list.push(edge.target);
		triggerAdj.set(edge.source, list);
		triggerIn.set(edge.target, (triggerIn.get(edge.target) ?? 0) + 1);
	}
	const toolCallers = new Map<string, string[]>();
	for (const edge of relevantEdges.filter((e) => e.type === 'uses-as-tool')) {
		const callers = toolCallers.get(edge.target) ?? [];
		callers.push(edge.source);
		toolCallers.set(edge.target, callers);
	}

	const col = new Map<string, number>();
	const propagateTriggerColumns = (start: string[]) => {
		let frontier = start;
		let guard = 0;
		while (frontier.length > 0 && guard++ < 60) {
			const next: string[] = [];
			for (const id of frontier) {
				for (const target of triggerAdj.get(id) ?? []) {
					const candidate = (col.get(id) ?? 0) + 1;
					if ((col.get(target) ?? -1) < candidate) {
						col.set(target, candidate);
						next.push(target);
					}
				}
			}
			frontier = next;
		}
	};
	// Column roots: nodes with no incoming trigger edges that are not tool targets — tool
	// targets never anchor a column, they hang below their caller instead.
	const roots = connected.filter((id) => !triggerIn.has(id) && !toolCallers.has(id));
	roots.forEach((id) => col.set(id, 0));
	propagateTriggerColumns(roots);

	// Tool targets with no trigger column hang directly below their caller. Resolve each
	// one's primary caller (callers may themselves be hanging tools, so iterate until
	// every chain is anchored) and give it the caller's column.
	const hangingTools = new Set([...toolCallers.keys()].filter((id) => !col.has(id)));
	const primaryCaller = new Map<string, string>();
	let resolvedSomething = true;
	while (resolvedSomething) {
		resolvedSomething = false;
		for (const id of hangingTools) {
			if (col.has(id)) continue;
			const caller = (toolCallers.get(id) ?? []).find((c) => col.has(c));
			if (caller === undefined) continue;
			primaryCaller.set(id, caller);
			col.set(id, col.get(caller) ?? 0);
			resolvedSomething = true;
		}
	}
	// a hanging tool may itself trigger other workflows — give those columns too
	propagateTriggerColumns([...hangingTools].filter((id) => col.has(id)));
	for (const id of connected) if (!col.has(id)) col.set(id, 0);

	const toolsByCaller = new Map<string, string[]>();
	for (const id of hangingTools) {
		const caller = primaryCaller.get(id);
		if (caller === undefined) continue;
		const list = toolsByCaller.get(caller) ?? [];
		list.push(id);
		toolsByCaller.set(caller, list);
	}
	// a node followed by its hanging tools, depth-first (tools of tools hang below too)
	const withHangingTools = (id: string): string[] => {
		const result = [id];
		for (const tool of toolsByCaller.get(id) ?? []) result.push(...withHangingTools(tool));
		return result;
	};

	// Rows: per column, flow nodes ordered by barycenter of already-placed neighbours,
	// each immediately followed by the tools hanging below it
	const preds = new Map<string, string[]>();
	for (const edge of relevantEdges) {
		const list = preds.get(edge.target) ?? [];
		list.push(edge.source);
		preds.set(edge.target, list);
	}
	const maxCol = Math.max(0, ...connected.map((id) => col.get(id) ?? 0));
	const y = new Map<string, number>();
	let bottomOfConnected = 0;
	for (let c = 0; c <= maxCol; c++) {
		const flowInCol = connected.filter((id) => col.get(id) === c && !hangingTools.has(id));
		const bary = (id: string) => {
			const placed = (preds.get(id) ?? []).filter((p) => y.has(p));
			return placed.length > 0
				? placed.reduce((sum, p) => sum + (y.get(p) ?? 0), 0) / placed.length
				: Number.MAX_SAFE_INTEGER;
		};
		flowInCol.sort((a, b) => bary(a) - bary(b));
		const order = flowInCol.flatMap(withHangingTools);
		// hanging tools whose caller chain never anchored (cycles) fall back to column 0
		const ordered = new Set(order);
		for (const id of connected) {
			if (col.get(id) === c && !ordered.has(id)) order.push(id);
		}
		let cursor = 0;
		for (const id of order) {
			const placed = (preds.get(id) ?? []).filter((p) => y.has(p));
			// hanging tools sit snug under the entry above them (their caller or a
			// preceding sibling tool); flow nodes aim for their barycenter
			const want = hangingTools.has(id)
				? cursor
				: placed.length > 0
					? placed.reduce((sum, p) => sum + (y.get(p) ?? 0), 0) / placed.length
					: cursor;
			y.set(id, Math.max(cursor, want));
			cursor = (y.get(id) ?? 0) + NODE.h + ROW_GAP;
		}
		bottomOfConnected = Math.max(bottomOfConnected, cursor);
	}
	for (const id of connected) {
		positions.set(id, {
			x: 60 + (col.get(id) ?? 0) * (NODE.w + COL_GAP),
			y: 60 + (y.get(id) ?? 0),
		});
	}

	// Isolated units: grid below the connected graph
	const gridTop = 60 + bottomOfConnected + 120;
	isolated.forEach((id, i) => {
		positions.set(id, {
			x: 60 + (i % 5) * (NODE.w + 60),
			y: gridTop + Math.floor(i / 5) * (NODE.h + 48),
		});
	});

	return positions;
}

/* ---- force-driven auto-layout ---- */

const FORCE_TICKS = 300;
/** Inverse-square pair repulsion, active within the cutoff radius. */
const FORCE_REPULSION = 900_000;
const FORCE_REPULSION_CUTOFF = 700;
/** Spring along every edge towards this rest length. */
const FORCE_SPRING = 0.02;
const FORCE_SPRING_REST = 380;
/** Directional constraints: trigger targets right of sources, tools below callers. */
const FORCE_TRIGGER_GAP_X = NODE.w + 150;
const FORCE_TOOL_GAP_Y = NODE.h + 100;
/** Credential/resource directional: resources right of workflows, credentials right of resources. */
const FORCE_CRED_GAP_X = NODE.w + 120;
const FORCE_DIRECTIONAL = 0.06;
const FORCE_ALIGN = 0.02;
const FORCE_MAX_STEP = 30;
const LAYOUT_MARGIN = 60;

/**
 * Force-driven initial layout: inverse-square repulsion between all units, springs along
 * edges, and directional constraint forces — trigger ('calls-workflow') targets are pushed
 * right of their sources, tool targets below their callers (with horizontal alignment).
 * Deterministic: seeded from a golden-angle spiral, fixed tick count, no randomness.
 * Finished with hard passes that remove overlaps and re-assert tool-below-caller ordering.
 * Units with no edges go into a grid below the connected graph.
 */
export function forceLayout(units: string[], edges: VisibleEdge[]): Map<string, XY> {
	const positions = new Map<string, XY>();
	const unitSet = new Set(units);
	const relevantEdges = edges.filter(
		(e) => unitSet.has(e.source) && unitSet.has(e.target) && e.source !== e.target,
	);

	const hasEdge = new Set<string>();
	for (const edge of relevantEdges) {
		hasEdge.add(edge.source);
		hasEdge.add(edge.target);
	}
	const connected = units.filter((id) => hasEdge.has(id));
	const isolated = units.filter((id) => !hasEdge.has(id));

	const index = new Map(connected.map((id, i) => [id, i]));
	const n = connected.length;
	// node centers, seeded on a deterministic golden-angle spiral
	const x = new Array<number>(n);
	const y = new Array<number>(n);
	for (let i = 0; i < n; i++) {
		const angle = i * 2.399963229728653;
		const radius = 90 * Math.sqrt(i + 1);
		x[i] = Math.cos(angle) * radius;
		y[i] = Math.sin(angle) * radius;
	}

	const springs = relevantEdges.map((e) => ({
		s: index.get(e.source)!,
		t: index.get(e.target)!,
		type: e.type,
	}));

	for (let tick = 0; tick < FORCE_TICKS; tick++) {
		const alpha = 1 - tick / FORCE_TICKS;
		const fx = new Array<number>(n).fill(0);
		const fy = new Array<number>(n).fill(0);

		// pairwise repulsion
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const dx = x[i] - x[j];
				const dy = y[i] - y[j];
				const dist2 = dx * dx + dy * dy;
				if (dist2 > FORCE_REPULSION_CUTOFF * FORCE_REPULSION_CUTOFF) continue;
				const dist = Math.sqrt(dist2) || 1;
				const f = FORCE_REPULSION / Math.max(dist2, 400);
				fx[i] += (f * dx) / dist;
				fy[i] += (f * dy) / dist;
				fx[j] -= (f * dx) / dist;
				fy[j] -= (f * dy) / dist;
			}
		}

		for (const spring of springs) {
			const { s, t } = spring;
			const dx = x[t] - x[s];
			const dy = y[t] - y[s];
			const dist = Math.hypot(dx, dy) || 1;
			// spring towards rest length
			const f = FORCE_SPRING * (dist - FORCE_SPRING_REST);
			fx[s] += (f * dx) / dist;
			fy[s] += (f * dy) / dist;
			fx[t] -= (f * dx) / dist;
			fy[t] -= (f * dy) / dist;

			if (spring.type === 'uses-as-tool') {
				// tools hang below their caller, roughly aligned horizontally
				const deficit = FORCE_TOOL_GAP_Y - (y[t] - y[s]);
				if (deficit > 0) {
					fy[s] -= deficit * FORCE_DIRECTIONAL;
					fy[t] += deficit * FORCE_DIRECTIONAL;
				}
				const misalign = x[s] - x[t];
				fx[t] += misalign * FORCE_ALIGN * 2;
				fx[s] -= misalign * FORCE_ALIGN * 2;
			} else if (spring.type === 'uses-credential' || spring.type === 'accesses-resource') {
				// credentials/resources flow left → right, same as trigger edges but with
				// a shorter gap so they cluster near their using workflows
				const gap = FORCE_CRED_GAP_X;
				const deficit = gap - (x[t] - x[s]);
				if (deficit > 0) {
					fx[s] -= deficit * FORCE_DIRECTIONAL;
					fx[t] += deficit * FORCE_DIRECTIONAL;
				}
				const misalign = y[s] - y[t];
				fy[t] += misalign * FORCE_ALIGN;
				fy[s] -= misalign * FORCE_ALIGN;
			} else {
				// trigger flow runs left → right, roughly aligned vertically
				const deficit = FORCE_TRIGGER_GAP_X - (x[t] - x[s]);
				if (deficit > 0) {
					fx[s] -= deficit * FORCE_DIRECTIONAL;
					fx[t] += deficit * FORCE_DIRECTIONAL;
				}
				const misalign = y[s] - y[t];
				fy[t] += misalign * FORCE_ALIGN;
				fy[s] -= misalign * FORCE_ALIGN;
			}
		}

		const maxStep = FORCE_MAX_STEP * alpha + 2;
		for (let i = 0; i < n; i++) {
			x[i] += Math.max(-maxStep, Math.min(maxStep, fx[i]));
			y[i] += Math.max(-maxStep, Math.min(maxStep, fy[i]));
		}
	}

	// centers → top-left rects
	const rects = new Map<string, Rect>();
	for (const id of connected) {
		const i = index.get(id)!;
		rects.set(id, { x: x[i] - NODE.w / 2, y: y[i] - NODE.h / 2, w: NODE.w, h: NODE.h });
	}

	// hard passes: no overlaps, and tools strictly below their callers
	const toolSprings = relevantEdges.filter((e) => e.type === 'uses-as-tool');
	for (let round = 0; round < 12; round++) {
		let changed = false;
		for (const edge of toolSprings) {
			const s = rects.get(edge.source)!;
			const t = rects.get(edge.target)!;
			const minY = s.y + NODE.h + CLEARANCE;
			if (t.y < minY) {
				t.y = minY;
				changed = true;
			}
		}
		const ids = [...rects.keys()];
		for (let i = 0; i < ids.length; i++) {
			for (let j = i + 1; j < ids.length; j++) {
				const a = rects.get(ids[i])!;
				const b = rects.get(ids[j])!;
				if (!rectsOverlap(a, b, CLEARANCE / 2)) continue;
				const v = separationVector(a, b);
				b.x += v.x / 2;
				b.y += v.y / 2;
				a.x -= v.x / 2;
				a.y -= v.y / 2;
				changed = true;
			}
		}
		if (!changed) break;
	}

	// normalize into positive coordinates
	let minX = Infinity;
	let minY = Infinity;
	let maxBottom = 0;
	for (const r of rects.values()) {
		minX = Math.min(minX, r.x);
		minY = Math.min(minY, r.y);
	}
	if (!isFinite(minX)) {
		minX = 0;
		minY = 0;
	}
	for (const [id, r] of rects) {
		const p = { x: r.x - minX + LAYOUT_MARGIN, y: r.y - minY + LAYOUT_MARGIN };
		positions.set(id, p);
		maxBottom = Math.max(maxBottom, p.y + NODE.h);
	}

	// isolated units: grid below the connected graph
	const gridTop = maxBottom + 120;
	isolated.forEach((id, i) => {
		positions.set(id, {
			x: LAYOUT_MARGIN + (i % 5) * (NODE.w + 60),
			y: gridTop + Math.floor(i / 5) * (NODE.h + 48),
		});
	});

	return positions;
}

/**
 * Partial force layout: positions new nodes while keeping existing ones fixed.
 * Seeds each new node at the centroid of its already-placed neighbours, then runs
 * a short force simulation (repulsion + springs) that only moves the new nodes.
 * Finished with overlap resolution against fixed nodes.
 */
export function forceLayoutPartial(
	newUnits: string[],
	edges: VisibleEdge[],
	fixedPositions: Map<string, XY>,
): Map<string, XY> {
	const positions = new Map<string, XY>();
	if (newUnits.length === 0) return positions;

	const newSet = new Set(newUnits);

	// Seed: centroid of already-placed neighbours
	for (const id of newUnits) {
		const neighbours = edges
			.filter((e) => (e.source === id || e.target === id) && e.source !== e.target)
			.map((e) => (e.source === id ? e.target : e.source));
		const placed = neighbours
			.filter((n) => fixedPositions.has(n) || positions.has(n))
			.map((n) => fixedPositions.get(n) ?? positions.get(n)!)
			.filter((p): p is XY => p !== undefined);
		if (placed.length > 0) {
			positions.set(id, {
				x: placed.reduce((s, p) => s + p.x, 0) / placed.length + 80,
				y: placed.reduce((s, p) => s + p.y, 0) / placed.length + 40,
			});
		} else {
			// no neighbours — place below the fixed content
			let bottom = 0;
			for (const p of fixedPositions.values()) bottom = Math.max(bottom, p.y + NODE.h);
			positions.set(id, { x: 60 + (newUnits.indexOf(id) % 5) * (NODE.w + 60), y: bottom + 120 });
		}
	}

	// Combined position lookup: fixed + new
	const posOf = (id: string): XY | undefined => fixedPositions.get(id) ?? positions.get(id);

	// Relevant edges involving new units
	const relevantEdges = edges.filter((e) => newSet.has(e.source) || newSet.has(e.target));

	const TICKS = 200;
	for (let tick = 0; tick < TICKS; tick++) {
		const alpha = 1 - tick / TICKS;
		const fx = new Map<string, number>(newUnits.map((id) => [id, 0]));
		const fy = new Map<string, number>(newUnits.map((id) => [id, 0]));

		// Repulsion: new nodes vs all nodes (fixed + new)
		for (const id of newUnits) {
			const p = positions.get(id)!;
			// vs fixed nodes
			for (const [, fp] of fixedPositions) {
				const dx = p.x - fp.x;
				const dy = p.y - fp.y;
				const dist2 = dx * dx + dy * dy;
				if (dist2 > FORCE_REPULSION_CUTOFF * FORCE_REPULSION_CUTOFF) continue;
				const dist = Math.sqrt(dist2) || 1;
				const f = (FORCE_REPULSION / Math.max(dist2, 400)) * alpha;
				fx.set(id, (fx.get(id) ?? 0) + (f * dx) / dist);
				fy.set(id, (fy.get(id) ?? 0) + (f * dy) / dist);
			}
			// vs other new nodes
			for (const otherId of newUnits) {
				if (otherId === id) continue;
				const op = positions.get(otherId)!;
				const dx = p.x - op.x;
				const dy = p.y - op.y;
				const dist2 = dx * dx + dy * dy;
				if (dist2 > FORCE_REPULSION_CUTOFF * FORCE_REPULSION_CUTOFF) continue;
				const dist = Math.sqrt(dist2) || 1;
				const f = (FORCE_REPULSION / Math.max(dist2, 400)) * alpha;
				fx.set(id, (fx.get(id) ?? 0) + (f * dx) / dist);
				fy.set(id, (fy.get(id) ?? 0) + (f * dy) / dist);
			}
		}

		// Springs along edges
		for (const edge of relevantEdges) {
			const sPos = posOf(edge.source);
			const tPos = posOf(edge.target);
			if (!sPos || !tPos) continue;
			const isNewSource = newSet.has(edge.source);
			const isNewTarget = newSet.has(edge.target);
			if (!isNewSource && !isNewTarget) continue;

			const dx = tPos.x - sPos.x;
			const dy = tPos.y - sPos.y;
			const dist = Math.hypot(dx, dy) || 1;
			const rest = FORCE_SPRING_REST;
			const f = FORCE_SPRING * (dist - rest) * alpha;
			const fxForce = (f * dx) / dist;
			const fyForce = (f * dy) / dist;

			if (isNewSource) {
				fx.set(edge.source, (fx.get(edge.source) ?? 0) + fxForce);
				fy.set(edge.source, (fy.get(edge.source) ?? 0) + fyForce);
			}
			if (isNewTarget) {
				fx.set(edge.target, (fx.get(edge.target) ?? 0) - fxForce);
				fy.set(edge.target, (fy.get(edge.target) ?? 0) - fyForce);
			}

			// Directional constraint: push credentials/resources right of their source
			if (edge.type === 'uses-credential' || edge.type === 'accesses-resource') {
				const gap = FORCE_CRED_GAP_X;
				if (isNewTarget) {
					const deficit = gap - (tPos.x - sPos.x);
					if (deficit > 0) {
						fx.set(edge.target, (fx.get(edge.target) ?? 0) + deficit * FORCE_DIRECTIONAL * alpha);
					}
				}
				if (isNewSource) {
					const deficit = gap - (tPos.x - sPos.x);
					if (deficit > 0) {
						fx.set(edge.source, (fx.get(edge.source) ?? 0) - deficit * FORCE_DIRECTIONAL * alpha);
					}
				}
			}
		}

		// Apply forces to new nodes only
		const maxStep = FORCE_MAX_STEP * alpha + 2;
		for (const id of newUnits) {
			const p = positions.get(id)!;
			p.x += Math.max(-maxStep, Math.min(maxStep, fx.get(id) ?? 0));
			p.y += Math.max(-maxStep, Math.min(maxStep, fy.get(id) ?? 0));
		}
	}

	// Overlap resolution: push new nodes clear of fixed nodes and each other
	const allRects = new Map<string, Rect>();
	for (const [id, p] of fixedPositions) {
		allRects.set(id, { x: p.x, y: p.y, w: NODE.w, h: NODE.h });
	}
	for (const id of newUnits) {
		const p = positions.get(id)!;
		allRects.set(id, { x: p.x, y: p.y, w: NODE.w, h: NODE.h });
	}

	for (let round = 0; round < 12; round++) {
		let changed = false;
		for (const id of newUnits) {
			const r = allRects.get(id)!;
			for (const [otherId, other] of allRects) {
				if (otherId === id) continue;
				if (!rectsOverlap(r, other, CLEARANCE / 2)) continue;
				const v = separationVector(other, r);
				r.x += v.x;
				r.y += v.y;
				changed = true;
			}
		}
		if (!changed) break;
	}

	// Copy resolved positions back
	for (const id of newUnits) {
		const r = allRects.get(id)!;
		positions.set(id, { x: r.x, y: r.y });
	}

	return positions;
}

/** Grid slots for a folder's children inside its expanded container. */
export function childSlots(
	anchor: XY,
	childIds: string[],
): Array<{ id: string; x: number; y: number }> {
	return childIds.map((id, i) => ({
		id,
		x: anchor.x + C_PAD + (i % C_WRAP) * (NODE.w + C_GAPX),
		y: anchor.y + C_HEAD + C_PAD * 0.4 + Math.floor(i / C_WRAP) * (NODE.h + C_GAPY),
	}));
}

/** Container rect that will enclose the given child slots. */
export function containerRectForSlots(anchor: XY, slots: Array<{ x: number; y: number }>): Rect {
	if (slots.length === 0) {
		return {
			x: anchor.x - C_PAD,
			y: anchor.y - C_HEAD,
			w: NODE.w + C_PAD * 2,
			h: NODE.h + C_HEAD + C_PAD,
		};
	}
	const xs = slots.map((s) => s.x);
	const ys = slots.map((s) => s.y);
	return {
		x: Math.min(...xs) - C_PAD,
		y: Math.min(...ys) - C_HEAD,
		w: Math.max(...xs) - Math.min(...xs) + NODE.w + C_PAD * 2,
		h: Math.max(...ys) - Math.min(...ys) + NODE.h + C_HEAD + C_PAD,
	};
}

export function rectsOverlap(a: Rect, b: Rect, margin: number): boolean {
	return (
		a.x < b.x + b.w + margin &&
		b.x < a.x + a.w + margin &&
		a.y < b.y + b.h + margin &&
		b.y < a.y + a.h + margin
	);
}

/** Minimal vector that moves rect `b` clear of rect `a` (plus clearance). */
export function separationVector(a: Rect, b: Rect): XY {
	const options: Array<{ dx: number; dy: number }> = [
		{ dx: a.x + a.w + CLEARANCE - b.x, dy: 0 },
		{ dx: -(b.x + b.w + CLEARANCE - a.x), dy: 0 },
		{ dx: 0, dy: a.y + a.h + CLEARANCE - b.y },
		{ dx: 0, dy: -(b.y + b.h + CLEARANCE - a.y) },
	];
	let best = options[0];
	for (const option of options) {
		if (Math.abs(option.dx + option.dy) < Math.abs(best.dx + best.dy)) best = option;
	}
	return { x: best.dx, y: best.dy };
}

export interface DropCandidate {
	id: string;
	expanded: boolean;
	visible: boolean;
	depth: number;
	rect: Rect;
}

/**
 * Folder under the point: collapsed folder cards take priority, otherwise the deepest
 * expanded container wins.
 */
export function resolveDropTarget(point: XY, folders: DropCandidate[]): string | null {
	const inside = (r: Rect) =>
		point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h;

	for (const folder of folders) {
		if (!folder.expanded && folder.visible && inside(folder.rect)) return folder.id;
	}
	let best: string | null = null;
	let bestDepth = -1;
	for (const folder of folders) {
		if (!folder.expanded || !folder.visible || !inside(folder.rect)) continue;
		if (folder.depth > bestDepth) {
			best = folder.id;
			bestDepth = folder.depth;
		}
	}
	return best;
}

export type DropOutcome = { kind: 'file'; folderId: string } | { kind: 'reposition' };

/**
 * What happens when a lifted workflow is released. `target` is the drop folder (null when
 * over its own folder or empty canvas). Anything that isn't a drop onto another folder is
 * a manual reposition: the card stays where it was dropped and keeps its folder — its
 * container stretches around it. Moving a workflow to the project root is an explicit
 * context-menu action, not a drag gesture.
 */
export function resolveDropOutcome(options: { target: string | null }): DropOutcome {
	if (options.target) return { kind: 'file', folderId: options.target };
	return { kind: 'reposition' };
}

export interface UnitDisplacement {
	id: string;
	dx: number;
	dy: number;
}

/**
 * Push every movable unit clear of the fixed rect (and of each other), along the axis of
 * minimal displacement. Iterates to convergence (capped), clearing overlaps with the
 * fixed rect first each pass, then separating movable pairs by splitting the push;
 * finishes with a guaranteed sweep so nothing remains under the fixed rect.
 */
export function resolveLevel(
	fixedRect: Rect,
	movableUnits: Array<{ id: string; rect: Rect }>,
): UnitDisplacement[] {
	const units = movableUnits.map((u) => ({ id: u.id, orig: u.rect, rect: { ...u.rect } }));

	for (let pass = 0; pass < 40; pass++) {
		let moved = false;
		// clear the fixed rect first — it never moves
		for (const unit of units) {
			if (!rectsOverlap(fixedRect, unit.rect, CLEARANCE)) continue;
			const v = separationVector(fixedRect, unit.rect);
			unit.rect.x += v.x;
			unit.rect.y += v.y;
			moved = true;
		}
		// then separate movable units from each other, splitting the push
		for (let i = 0; i < units.length; i++) {
			for (let j = i + 1; j < units.length; j++) {
				const a = units[i];
				const b = units[j];
				if (!rectsOverlap(a.rect, b.rect, CLEARANCE)) continue;
				const v = separationVector(a.rect, b.rect);
				b.rect.x += v.x / 2;
				b.rect.y += v.y / 2;
				a.rect.x -= v.x / 2;
				a.rect.y -= v.y / 2;
				moved = true;
			}
		}
		if (!moved) break;
	}
	// hard guarantee: nothing may sit under the fixed rect
	for (const unit of units) {
		if (!rectsOverlap(fixedRect, unit.rect, CLEARANCE)) continue;
		const v = separationVector(fixedRect, unit.rect);
		unit.rect.x += v.x;
		unit.rect.y += v.y;
	}

	const displacements: UnitDisplacement[] = [];
	for (const unit of units) {
		const dx = unit.rect.x - unit.orig.x;
		const dy = unit.rect.y - unit.orig.y;
		if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
		displacements.push({ id: unit.id, dx, dy });
	}
	return displacements;
}
