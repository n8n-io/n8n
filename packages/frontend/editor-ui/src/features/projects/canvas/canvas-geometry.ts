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
 * referenced only by tool edges sits in its caller's column, below it; order within a
 * column by barycenter of already-placed neighbours. Units with no edges go into a grid
 * below the connected graph.
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
	const col = new Map<string, number>();
	let frontier = connected.filter((id) => !triggerIn.has(id));
	frontier.forEach((id) => col.set(id, 0));
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
	// Tool targets with no trigger column sit in their caller's column (they hang below)
	for (const edge of relevantEdges.filter((e) => e.type === 'uses-as-tool')) {
		if (!col.has(edge.target)) col.set(edge.target, col.get(edge.source) ?? 0);
	}
	for (const id of connected) if (!col.has(id)) col.set(id, 0);

	// Rows: per column, order by barycenter of already-placed neighbours
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
		const inCol = connected.filter((id) => col.get(id) === c);
		const bary = (id: string) => {
			const placed = (preds.get(id) ?? []).filter((p) => y.has(p));
			return placed.length > 0
				? placed.reduce((sum, p) => sum + (y.get(p) ?? 0), 0) / placed.length
				: Number.MAX_SAFE_INTEGER;
		};
		inCol.sort((a, b) => bary(a) - bary(b));
		let cursor = 0;
		for (const id of inCol) {
			const placed = (preds.get(id) ?? []).filter((p) => y.has(p));
			const want =
				placed.length > 0
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

export type DropOutcome =
	| { kind: 'file'; folderId: string }
	| { kind: 'move-to-root' }
	| { kind: 'reposition' };

/**
 * What happens when a lifted workflow is released. `target` is the drop folder (null when
 * over its own folder or empty canvas), `raw` the folder under the cursor regardless of
 * ownership. Dropping a workflow that lives in a folder onto empty canvas moves it to the
 * project root at the drop point; anything else that isn't a valid folder drop is a manual
 * reposition — the card stays where it was dropped.
 */
export function resolveDropOutcome(options: {
	target: string | null;
	raw: string | null;
	currentFolderId: string | null;
}): DropOutcome {
	if (options.target) return { kind: 'file', folderId: options.target };
	if (options.raw === null && options.currentFolderId) return { kind: 'move-to-root' };
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
