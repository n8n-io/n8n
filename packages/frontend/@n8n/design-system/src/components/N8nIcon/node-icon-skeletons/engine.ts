/**
 * Draws node icons at any size between 12px and 24px.
 *
 * The icon pack draws each icon by hand at 12px, 16px and 24px. A skeleton
 * keeps each drawing as its parts: centre lines with a stroke width, caps and
 * corner radii. At a size between two drawings, the engine matches the parts
 * of the two drawings and moves each matched part between them. A part with no
 * match switches from one drawing to the other at the midpoint.
 *
 * Skeleton line format: `<slug> <variant><size> <layer>~<layer>…`, where the
 * variant is `o` (outline) or `s` (solid). A layer is `U|<paths>` (union),
 * `S|<paths>|<paths>` (first paths minus the second paths), or a nested
 * `U{…}`, `S{…}` or `I{…}` (intersection) group. Paths are separated by `/`.
 * A path is `<c|o>[f]<width><caps>[profile]:<points>`: closed or open,
 * filled, stroke width, start and end cap (`b` butt, `s` square, `r` round),
 * and an optional width profile for open strokes that taper. A point is
 * `x,y[,radius]` or `c1x,c1y;c2x,c2y;x,y` for a cubic segment, with an
 * optional `@r` or `@b` join.
 */

export type SkeletonVariant = 'outline' | 'solid';

type Cap = 'butt' | 'square' | 'round';
type Join = 'round' | 'bevel';
type ControlPoints = [number, number, number, number];
type ProfileStop = [number, number];

interface SkeletonPoint {
	x: number;
	y: number;
	r: number;
	c?: ControlPoints;
	j?: Join;
}

interface SkeletonPath {
	closed: boolean;
	fill: boolean;
	w: number;
	caps: [Cap, Cap];
	pts: SkeletonPoint[];
	profile?: ProfileStop[];
}

type GroupOp = 'U' | 'S' | 'I';

type SkeletonNode = { op: 'paths'; paths: SkeletonPath[] } | { op: GroupOp; kids: SkeletonNode[] };

interface Shape {
	d: string;
	fill: boolean;
	w: number;
	cap: 'butt' | 'round';
	join: 'miter' | 'round' | 'bevel';
}

type ShapeNode = { op: 'paths'; shapes: Shape[] } | { op: GroupOp; kids: ShapeNode[] };

interface PathPair {
	i: number;
	a: SkeletonPath;
	b: SkeletonPath;
}

type MorphNode =
	| { kind: 'switch'; a: SkeletonNode | null; b: SkeletonNode | null }
	| {
			kind: 'paths';
			group: { morph: PathPair[]; onlyA: SkeletonPath[]; onlyB: SkeletonPath[] };
	  }
	| { kind: 'op'; op: GroupOp; kids: MorphNode[] };

type Point = { x: number; y: number };

const DESIGN_SIZES = [12, 16, 24] as const;
type DesignSize = (typeof DESIGN_SIZES)[number];

export const MIN_SKELETON_SIZE = DESIGN_SIZES[0];
export const MAX_SKELETON_SIZE = DESIGN_SIZES[DESIGN_SIZES.length - 1];

/** Outline stroke width for each drawn size, from the icon design guidelines. */
const OUTLINE_STROKE: Record<DesignSize, number> = { 12: 1.2, 16: 1.5, 24: 1.8 };

const CAPS: Record<string, Cap> = { b: 'butt', s: 'square', r: 'round' };
const JOINS: Record<string, Join> = { r: 'round', b: 'bevel' };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const unit = (x: number, y: number): Point => {
	const len = Math.hypot(x, y) || 1;
	return { x: x / len, y: y / len };
};
const mapControls = (c: ControlPoints, fn: (v: number, i: number) => number): ControlPoints => [
	fn(c[0], 0),
	fn(c[1], 1),
	fn(c[2], 2),
	fn(c[3], 3),
];
const isGroupOp = (op: string): op is GroupOp => op === 'U' || op === 'S' || op === 'I';
const isShapeNode = (node: ShapeNode | null): node is ShapeNode => node !== null;
const reverseControls = (c?: ControlPoints): ControlPoints | undefined =>
	c && [c[2], c[3], c[0], c[1]];

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parsePoint(source: string): SkeletonPoint {
	const [body, joinKey] = source.split('@');
	const join = joinKey ? JOINS[joinKey] : undefined;
	const parts = body.split(';');
	const [x, y, r = 0] = parts[parts.length - 1].split(',').map(Number);
	if (parts.length === 1) return { x, y, r, ...(join && { j: join }) };
	const [c1x, c1y] = parts[0].split(',').map(Number);
	const [c2x, c2y] = parts[1].split(',').map(Number);
	return { x, y, r: 0, c: [c1x, c1y, c2x, c2y], ...(join && { j: join }) };
}

/** A middle point on a straight run adds nothing, so the parser drops it. */
function isStraightMidPoint(pts: SkeletonPoint[], i: number, closed: boolean): boolean {
	if (!closed && (i === 0 || i === pts.length - 1)) return false;
	const prev = pts[(i + pts.length - 1) % pts.length];
	const cur = pts[i];
	const next = pts[(i + 1) % pts.length];
	if (cur.c || next.c) return false;
	const ax = cur.x - prev.x;
	const ay = cur.y - prev.y;
	const bx = next.x - cur.x;
	const by = next.y - cur.y;
	return (
		ax * bx + ay * by > 0 &&
		Math.abs(ax * by - ay * bx) < 0.001 * Math.hypot(ax, ay) * Math.hypot(bx, by)
	);
}

function parsePath(source: string): SkeletonPath {
	const match = /^([co])(f?)([\d.]+)([bsr]{1,2})(?:\[([^\]]*)\])?:(.*)$/.exec(source);
	if (!match) throw new Error(`Bad skeleton path: ${source}`);
	const capKeys = match[4];
	const profile = match[5]
		? match[5].split(',').map((stop) => {
				const [at, width] = stop.split(':').map(Number);
				return [at, width] satisfies ProfileStop;
			})
		: undefined;
	const closed = match[1] === 'c';

	const parsed = match[6].split(' ').map(parsePoint);
	const deduped = parsed.filter((p, i, all) => {
		const prev = all[(i + all.length - 1) % all.length];
		return i === 0 || !!p.c || Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-6;
	});
	const pts = deduped
		.filter((_, i) => !isStraightMidPoint(deduped, i, closed))
		.map((p, i, all) => {
			const isEnd = !closed && (i === 0 || i === all.length - 1);
			// A radius only rounds a corner between two straight segments.
			const touchesCurve =
				p.c ?? (closed || i < all.length - 1 ? all[(i + 1) % all.length].c : undefined);
			return isEnd || touchesCurve ? { ...p, r: 0 } : p;
		});

	return {
		closed,
		fill: match[2] === 'f',
		w: Number(match[3]),
		caps: [CAPS[capKeys[0]], CAPS[capKeys[1] ?? capKeys[0]]],
		pts,
		...(profile && { profile }),
	};
}

/** Direction in which an open path leaves its start (`end` 0) or its end (`end` 1). */
function endDirection(pts: SkeletonPoint[], end: 0 | 1): Point {
	const n = pts.length;
	const tip = end === 0 ? pts[0] : pts[n - 1];
	const handle =
		end === 0
			? pts[1].c && { x: pts[1].c[0], y: pts[1].c[1] }
			: tip.c && { x: tip.c[2], y: tip.c[3] };
	const from =
		handle && Math.hypot(handle.x - tip.x, handle.y - tip.y) > 1e-6
			? handle
			: end === 0
				? pts[1]
				: pts[n - 2];
	const len = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
	return { x: (tip.x - from.x) / len, y: (tip.y - from.y) / len };
}

function capExtensions(caps: [Cap, Cap], w: number): [number, number] {
	return [caps[0] === 'square' ? w / 2 : 0, caps[1] === 'square' ? w / 2 : 0];
}

function bounds(path: SkeletonPath): [number, number, number, number] {
	const half = path.w / 2;
	const xs: number[] = [];
	const ys: number[] = [];
	for (const p of path.pts) {
		xs.push(p.x);
		ys.push(p.y);
		if (p.c) {
			xs.push(p.c[0], p.c[2]);
			ys.push(p.c[1], p.c[3]);
		}
	}
	if (!path.closed && path.pts.length > 1) {
		const [startExt, endExt] = capExtensions(path.caps, path.w);
		const startDir = endDirection(path.pts, 0);
		const endDir = endDirection(path.pts, 1);
		const first = path.pts[0];
		const last = path.pts[path.pts.length - 1];
		xs.push(first.x + startDir.x * startExt, last.x + endDir.x * endExt);
		ys.push(first.y + startDir.y * startExt, last.y + endDir.y * endExt);
	}
	return [
		Math.min(...xs) - half,
		Math.min(...ys) - half,
		Math.max(...xs) + half,
		Math.max(...ys) + half,
	];
}

const parsePaths = (source: string): SkeletonNode => ({
	op: 'paths',
	paths: source ? source.split('/').map(parsePath) : [],
});

/** Drops cut-out paths that do not overlap the base paths, because they remove nothing. */
function subtract(nodes: SkeletonNode[]): SkeletonNode {
	const [base, ...cuts] = nodes;
	if (base.op !== 'paths') return { op: 'S', kids: nodes };
	const baseBounds = base.paths.map(bounds);
	const kept = cuts
		.map((cut): SkeletonNode => {
			if (cut.op !== 'paths') return cut;
			return {
				...cut,
				paths: cut.paths.filter((path) => {
					const b = bounds(path);
					return baseBounds.some(
						(a) =>
							Math.min(b[2], a[2]) - Math.max(b[0], a[0]) > 0.01 &&
							Math.min(b[3], a[3]) - Math.max(b[1], a[1]) > 0.01,
					);
				}),
			};
		})
		.filter((cut) => cut.op !== 'paths' || cut.paths.length);
	return { op: 'S', kids: [base, ...kept] };
}

function parseGroup(source: string): SkeletonNode {
	const match = /^([USI])\{(.*)\}$/.exec(source);
	if (!match) return parsePaths(source);
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	const body = match[2];
	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (ch === '{') depth++;
		else if (ch === '}') depth--;
		else if (ch === '|' && depth === 0) {
			parts.push(body.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(body.slice(start));
	const kids = parts.map(parseGroup);
	const op = match[1];
	if (!isGroupOp(op)) throw new Error(`Bad skeleton group: ${source}`);
	return op === 'S' ? subtract(kids) : { op, kids };
}

function parseLayer(source: string): SkeletonNode {
	if (source.startsWith('U|')) return parsePaths(source.slice(2));
	if (source.startsWith('S|')) {
		const [, base, cut] = source.split('|');
		return subtract([parsePaths(base), parsePaths(cut)]);
	}
	return parseGroup(source);
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export class SkeletonLibrary {
	private readonly sources = new Map<string, string>();

	private readonly parsed = new Map<string, SkeletonNode>();

	private readonly morphs = new Map<string, MorphNode | null>();

	/** Takes skeleton lines in the format in the file comment. */
	constructor(data: string) {
		for (const line of data.trim().split('\n')) {
			const [slug, key] = line.split(' ', 2);
			this.sources.set(`${slug}/${key}`, line.slice(slug.length + key.length + 2));
		}
	}

	has(slug: string): boolean {
		return this.sources.has(`${slug}/o24`);
	}

	private get(slug: string, variant: SkeletonVariant, size: DesignSize): SkeletonNode | undefined {
		const key = `${slug}/${variant[0]}${size}`;
		const cached = this.parsed.get(key);
		if (cached) return cached;
		const source = this.sources.get(key);
		if (source === undefined) return undefined;
		const root: SkeletonNode = { op: 'U', kids: source.split('~').map(parseLayer) };
		this.parsed.set(key, root);
		return root;
	}

	private getMorph(
		slug: string,
		variant: SkeletonVariant,
		sizeA: DesignSize,
		sizeB: DesignSize,
	): MorphNode | null {
		const key = `${slug}/${variant}/${sizeA}`;
		const cached = this.morphs.get(key);
		if (cached !== undefined) return cached;
		const a = this.get(slug, variant, sizeA);
		const b = this.get(slug, variant, sizeB);
		const morph = a && b ? matchNodes(a, b, sizeA, sizeB) : null;
		this.morphs.set(key, morph);
		return morph;
	}

	/**
	 * Returns the SVG body of an icon drawn at `size`, for a viewBox of
	 * `0 0 S S` where S is `size` clamped to 12–24. `idPrefix` keeps mask ids
	 * unique on the page.
	 */
	render(slug: string, variant: SkeletonVariant, size: number, idPrefix: string): string | null {
		const target = clamp(size, MIN_SKELETON_SIZE, MAX_SKELETON_SIZE);
		const [sizeA, sizeB]: [DesignSize, DesignSize] = target <= 16 ? [12, 16] : [16, 24];
		const morph = this.getMorph(slug, variant, sizeA, sizeB);
		if (!morph) return null;
		const tree = renderMorph(morph, target, sizeA, sizeB);
		return tree ? serialize(tree, target, idPrefix) : null;
	}
}

// ---------------------------------------------------------------------------
// Matching the parts of two drawings
// ---------------------------------------------------------------------------

const pathSignature = (p: SkeletonPath) =>
	`${p.closed}/${p.fill}/${p.w > 0}/${p.pts.length}/${p.pts.filter((pt) => pt.c).length}/${p.profile?.length ?? 0}`;

function reversePoints(pts: SkeletonPoint[], closed: boolean): SkeletonPoint[] {
	const n = pts.length;
	// A point's controls describe the segment that ends at it, so they move one point along.
	return closed
		? pts.map((_, i) => ({ ...pts[(n - i) % n], c: reverseControls(pts[(n - i + 1) % n].c) }))
		: pts.map((_, i) => ({
				...pts[n - 1 - i],
				c: i === 0 ? undefined : reverseControls(pts[n - i].c),
			}));
}

/** Finds the order of `b`'s points that lies closest to `a`, with sizes normalised. */
function alignPath(a: SkeletonPath, sizeA: number, b: SkeletonPath, sizeB: number) {
	const n = a.pts.length;
	let best = { cost: Infinity, pts: b.pts, reversed: false };
	const rotations = a.closed ? n : 1;
	const norm = (v: number) => clamp(v, -0.25, 1.25);
	const dist = (x1: number, y1: number, x2: number, y2: number) =>
		Math.hypot(norm(x1 / sizeA) - norm(x2 / sizeB), norm(y1 / sizeA) - norm(y2 / sizeB));

	for (const reversed of [false, true]) {
		const seq = reversed ? reversePoints(b.pts, a.closed) : b.pts;
		for (let rot = 0; rot < rotations; rot++) {
			const candidate = a.pts.map((_, i) => seq[a.closed ? (rot + i) % n : i]);
			if (candidate.some((p, i) => !p.c !== !a.pts[i].c)) continue;
			let cost = 0;
			for (let i = 0; i < n; i++) {
				const pa = a.pts[i];
				const pb = candidate[i];
				cost += dist(pa.x, pa.y, pb.x, pb.y);
				if (pa.c && pb.c) {
					cost +=
						(dist(pa.c[0], pa.c[1], pb.c[0], pb.c[1]) + dist(pa.c[2], pa.c[3], pb.c[2], pb.c[3])) /
						2;
				}
			}
			cost /= n;
			if (cost < best.cost - 1e-9) best = { cost, pts: candidate, reversed };
		}
	}
	return best;
}

function matchPaths(
	pathsA: SkeletonPath[],
	sizeA: number,
	pathsB: SkeletonPath[],
	sizeB: number,
): { morph: PathPair[]; onlyA: SkeletonPath[]; onlyB: SkeletonPath[] } {
	const candidates: Array<{
		i: number;
		j: number;
		cost: number;
		pts: SkeletonPoint[];
		reversed: boolean;
	}> = [];
	pathsA.forEach((a, i) =>
		pathsB.forEach((b, j) => {
			if (pathSignature(a) !== pathSignature(b)) return;
			const { cost, pts, reversed } = alignPath(a, sizeA, b, sizeB);
			if (cost <= 0.3) candidates.push({ i, j, cost, pts, reversed });
		}),
	);
	candidates.sort((x, y) => x.cost - y.cost);

	const usedA = new Set<number>();
	const usedB = new Set<number>();
	const morph: PathPair[] = [];
	for (const m of candidates) {
		if (usedA.has(m.i) || usedB.has(m.j)) continue;
		usedA.add(m.i);
		usedB.add(m.j);
		const b = pathsB[m.j];
		morph.push({
			i: m.i,
			a: pathsA[m.i],
			b: { ...b, pts: m.pts, caps: m.reversed ? [b.caps[1], b.caps[0]] : b.caps },
		});
	}
	morph.sort((x, y) => x.i - y.i);
	return {
		morph,
		onlyA: pathsA.filter((_, i) => !usedA.has(i)),
		onlyB: pathsB.filter((_, j) => !usedB.has(j)),
	};
}

function matchNodes(
	a: SkeletonNode | null,
	b: SkeletonNode | null,
	sizeA: number,
	sizeB: number,
): MorphNode {
	if (!a || !b) return { kind: 'switch', a, b };
	if (a.op === 'paths' && b.op === 'S') a = { op: 'S', kids: [a] };
	if (b.op === 'paths' && a.op === 'S') b = { op: 'S', kids: [b] };
	if (a.op === 'paths' && b.op === 'paths') {
		return { kind: 'paths', group: matchPaths(a.paths, sizeA, b.paths, sizeB) };
	}
	if (
		a.op === 'paths' ||
		b.op === 'paths' ||
		a.op !== b.op ||
		(a.op === 'I' && a.kids.length !== b.kids.length)
	) {
		return { kind: 'switch', a, b };
	}
	const kidsA = a.kids;
	const kidsB = b.kids;
	return {
		kind: 'op',
		op: a.op,
		kids: Array.from({ length: Math.max(kidsA.length, kidsB.length) }, (_, i) =>
			matchNodes(kidsA[i] ?? null, kidsB[i] ?? null, sizeA, sizeB),
		),
	};
}

// ---------------------------------------------------------------------------
// Drawing paths
// ---------------------------------------------------------------------------

const lineCap = (caps: [Cap, Cap]): 'round' | 'butt' =>
	caps[0] === 'round' && caps[1] === 'round' ? 'round' : 'butt';

function dot(center: Point, radius: number): Shape {
	const arc = `A${fmt(radius)} ${fmt(radius)} 0 1 0`;
	return {
		d: `M${fmt(center.x - radius)} ${fmt(center.y)}${arc} ${fmt(center.x + radius)} ${fmt(center.y)}${arc} ${fmt(center.x - radius)} ${fmt(center.y)}Z`,
		fill: true,
		w: 0,
		cap: 'butt',
		join: 'miter',
	};
}

const filledShape = (d: string): Shape => ({ d, fill: true, w: 0, cap: 'butt', join: 'miter' });

function profileEndSlope(profile: ProfileStop[], end: 0 | 1): number {
	const n = profile.length;
	const [[x0, y0], [x1, y1]] =
		end === 0 ? [profile[0], profile[1]] : [profile[n - 2], profile[n - 1]];
	const slope = (y1 - y0) / (x1 - x0 || 1);
	return n > 2 ? 2 * slope : slope;
}

function profileAt(profile: ProfileStop[], at: number): number {
	const n = profile.length;
	let i = 0;
	while (i < n - 2 && at > profile[i + 1][0]) i++;
	const [t0, v0] = profile[i];
	const [t1, v1] = profile[i + 1];
	const a = t1 > t0 ? clamp((at - t0) / (t1 - t0), 0, 1) : 0;
	const hasPrev = i > 0;
	const hasNext = i + 1 < n - 1;
	const eased =
		hasPrev && hasNext ? a * a * (3 - 2 * a) : hasNext ? 1 - (1 - a) ** 2 : hasPrev ? a * a : a;
	return v0 + (v1 - v0) * eased;
}

/** Samples a path with 24 points for each segment, with the distance along the path. */
function samplePath(pts: SkeletonPoint[]) {
	const samples = [{ x: pts[0].x, y: pts[0].y, s: 0 }];
	for (let i = 1; i < pts.length; i++) {
		const from = pts[i - 1];
		const to = pts[i];
		const c = to.c;
		for (let k = 1; k <= 24; k++) {
			const t = k / 24;
			const u = 1 - t;
			const x = c
				? u ** 3 * from.x + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t ** 3 * to.x
				: from.x + (to.x - from.x) * t;
			const y = c
				? u ** 3 * from.y + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t ** 3 * to.y
				: from.y + (to.y - from.y) * t;
			const last = samples[samples.length - 1];
			samples.push({ x, y, s: last.s + Math.hypot(x - last.x, y - last.y) });
		}
	}
	return samples;
}

/** Outlines an open stroke whose width follows a profile along its length. */
function taperedStroke(
	pts: SkeletonPoint[],
	w: number,
	caps: [Cap, Cap],
	profile: ProfileStop[],
): Shape {
	const samples = samplePath(pts);
	const n = samples.length;
	const total = samples[n - 1].s || 1;
	const tangent = (i: number) => {
		const a = samples[Math.max(0, i - 1)];
		const b = samples[Math.min(n - 1, i + 1)];
		return unit(b.x - a.x, b.y - a.y);
	};
	const halfWidth = (i: number) => profileAt(profile, samples[i].s / total) * w;
	const offset = (i: number, side: number): Point => {
		const t = tangent(i);
		const hw = halfWidth(i);
		return { x: samples[i].x - t.y * hw * side, y: samples[i].y + t.x * hw * side };
	};
	const cap = (i: number, dir: number, type: Cap, slope: number): Point[] => {
		const t = tangent(i);
		const p = samples[i];
		const hw = halfWidth(i);
		const along = { x: t.x * dir, y: t.y * dir };
		const across = { x: -t.y, y: t.x };
		if (type === 'square') {
			const reach = hw + slope * hw;
			const tip = { x: p.x + along.x * hw, y: p.y + along.y * hw };
			return [
				{ x: tip.x + across.x * reach, y: tip.y + across.y * reach },
				{ x: tip.x - across.x * reach, y: tip.y - across.y * reach },
			];
		}
		if (type === 'round') {
			return Array.from({ length: 9 }, (_, k) => {
				const angle = (Math.PI * k) / 8;
				return {
					x: p.x + along.x * hw * Math.sin(angle) + across.x * hw * Math.cos(angle),
					y: p.y + along.y * hw * Math.sin(angle) + across.y * hw * Math.cos(angle),
				};
			});
		}
		return [];
	};

	const startSlope = (-profileEndSlope(profile, 0) * w) / total;
	const endSlope = (profileEndSlope(profile, 1) * w) / total;
	const left = samples.map((_, i) => offset(i, 1));
	const right = samples.map((_, i) => offset(i, -1));
	const endCap = cap(n - 1, 1, caps[1], endSlope);
	const startCap = cap(0, -1, caps[0], startSlope).reverse();
	const outline = [...left, ...endCap, ...right.reverse(), ...startCap];
	return filledShape(
		outline.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join('') + 'Z',
	);
}

/**
 * SVG can give a stroke only one line join. When the corners of a path ask for
 * different joins, the path uses bevel joins and the round and miter corners
 * get extra filled shapes.
 */
function cornerJoins(
	pts: SkeletonPoint[],
	closed: boolean,
	w: number,
): { join: Shape['join']; extra: Shape[] } {
	const n = pts.length;
	const at = (i: number) => pts[((i % n) + n) % n];
	const corners = pts
		.map((p, i) => ({ p, i }))
		.filter(({ p, i }) => (closed || (i > 0 && i < n - 1)) && !p.r);
	const joins = new Set(corners.map(({ p }) => p.j ?? 'miter'));
	if (w <= 0 || joins.size <= 1) return { join: joins.values().next().value ?? 'miter', extra: [] };

	const half = w / 2;
	const extra: Shape[] = [];
	for (const { p, i } of corners) {
		if (p.j === 'bevel') continue;
		if (p.j === 'round') {
			extra.push(dot(p, half));
			continue;
		}
		const prev = p.c ? { x: p.c[2], y: p.c[3] } : at(i - 1);
		const nextPoint = at(i + 1);
		const next = nextPoint.c ? { x: nextPoint.c[0], y: nextPoint.c[1] } : nextPoint;
		const inDir = unit(p.x - prev.x, p.y - prev.y);
		const outDir = unit(next.x - p.x, next.y - p.y);
		const cos = inDir.x * outDir.x + inDir.y * outDir.y;
		if (Math.abs(inDir.x * outDir.y - inDir.y * outDir.x) < 1e-6) continue;
		const miter = 1 / Math.sqrt((1 + cos) / 2);
		if (miter > 4) continue;
		const bisector = unit(inDir.x - outDir.x, inDir.y - outDir.y);
		const edge = (dir: Point): Point => {
			const nx = -dir.y;
			const ny = dir.x;
			const sign = nx * bisector.x + ny * bisector.y > 0 ? 1 : -1;
			return { x: p.x + nx * sign * half, y: p.y + ny * sign * half };
		};
		const e1 = edge(inDir);
		const e2 = edge(outDir);
		const tip = { x: p.x + bisector.x * half * miter, y: p.y + bisector.y * half * miter };
		extra.push(
			filledShape(
				`M${fmt(p.x)} ${fmt(p.y)}L${fmt(e1.x)} ${fmt(e1.y)}L${fmt(tip.x)} ${fmt(tip.y)}L${fmt(e2.x)} ${fmt(e2.y)}Z`,
			),
		);
	}
	return { join: 'bevel', extra };
}

/** Builds the `d` of a centre line, with rounded corners and square caps drawn as length. */
function centerLine(pts: SkeletonPoint[], closed: boolean, capExt: [number, number]): string {
	const n = pts.length;
	if (n < 2) return '';
	const at = (i: number) => pts[((i % n) + n) % n];
	const corners = pts.map((p, i) => {
		if (!p.r || (!closed && (i === 0 || i === n - 1))) return null;
		const prev = at(i - 1);
		const next = at(i + 1);
		const lenPrev = Math.hypot(prev.x - p.x, prev.y - p.y);
		const lenNext = Math.hypot(next.x - p.x, next.y - p.y);
		if (lenPrev < 1e-6 || lenNext < 1e-6) return null;
		const u1 = { x: (prev.x - p.x) / lenPrev, y: (prev.y - p.y) / lenPrev };
		const u2 = { x: (next.x - p.x) / lenNext, y: (next.y - p.y) / lenNext };
		const tanHalf = Math.tan(Math.acos(clamp(u1.x * u2.x + u1.y * u2.y, -1, 1)) / 2);
		if (!isFinite(tanHalf) || tanHalf < 1e-6 || tanHalf > 1e6) return null;
		return { u1, u2, tanHalf, want: p.r / tanHalf, cross: -u1.x * u2.y + u1.y * u2.x };
	});
	const want = (i: number) => corners[((i % n) + n) % n]?.want ?? 0;
	// Two rounded corners on one segment share its length.
	const available = (i: number, segStart: number, other: number) => {
		const segLen = Math.hypot(
			at(segStart + 1).x - at(segStart).x,
			at(segStart + 1).y - at(segStart).y,
		);
		const mine = want(i);
		const theirs = want(other);
		return mine + theirs > segLen ? (segLen * mine) / (mine + theirs) : mine;
	};
	const curve = (p: SkeletonPoint, c: ControlPoints) =>
		`C${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])} ${fmt(c[3])} ${fmt(p.x)} ${fmt(p.y)}`;

	let line = pts;
	const extended = (end: 0 | 1): SkeletonPoint => {
		const tip = end === 0 ? line[0] : line[n - 1];
		const dir = endDirection(line, end);
		return { ...tip, x: tip.x + dir.x * capExt[end], y: tip.y + dir.y * capExt[end] };
	};
	const curvedEnds = [!!line[1].c, !!line[n - 1].c];

	let d = '';
	if (!closed && capExt[0] && curvedEnds[0]) {
		const p = extended(0);
		d += `M${fmt(p.x)} ${fmt(p.y)}`;
	}
	if (!closed && capExt[0] && !curvedEnds[0]) line = [extended(0), ...line.slice(1)];
	if (!closed && capExt[1] && !curvedEnds[1]) line = [...line.slice(0, n - 1), extended(1)];

	line.forEach((p, i) => {
		if (i > 0 && p.c) {
			d += curve(p, p.c);
			return;
		}
		const corner = corners[i];
		const cmd = i !== 0 || d ? 'L' : 'M';
		if (!corner) {
			d += `${cmd}${fmt(p.x)} ${fmt(p.y)}`;
			return;
		}
		const cut = Math.min(corner.want, available(i, i - 1, i - 1), available(i, i, i + 1));
		const radius = cut * corner.tanHalf;
		d += `${cmd}${fmt(p.x + corner.u1.x * cut)} ${fmt(p.y + corner.u1.y * cut)}`;
		d += `A${fmt(radius)} ${fmt(radius)} 0 0 ${+(corner.cross > 0)} ${fmt(p.x + corner.u2.x * cut)} ${fmt(p.y + corner.u2.y * cut)}`;
	});

	if (closed) return (line[0].c ? d + curve(line[0], line[0].c) : d) + 'Z';
	if (capExt[1] && curvedEnds[1]) {
		const p = extended(1);
		d += `L${fmt(p.x)} ${fmt(p.y)}`;
	}
	return d;
}

function drawPath(
	pts: SkeletonPoint[],
	closed: boolean,
	fill: boolean,
	w: number,
	caps: [Cap, Cap],
	capExt: [number, number],
	profile: ProfileStop[] | undefined,
): Shape[] {
	if (profile && !closed && w > 0) return [taperedStroke(pts, w, caps, profile)];

	const { join, extra } = cornerJoins(pts, closed, w);
	const cap = lineCap(caps);
	// A path with one round cap and one other cap gets a dot for the round end.
	const roundEnds =
		closed || w <= 0 || pts.length < 2 || cap === 'round'
			? []
			: ([0, 1] as const)
					.filter((end) => caps[end] === 'round')
					.map((end) => dot(end === 0 ? pts[0] : pts[pts.length - 1], w / 2));
	return [{ d: centerLine(pts, closed, capExt), fill, w, cap, join }, ...roundEnds, ...extra];
}

// ---------------------------------------------------------------------------
// Drawing at a size
// ---------------------------------------------------------------------------

function outlineStrokeAt(size: number): number {
	return size <= 16
		? lerp(OUTLINE_STROKE[12], OUTLINE_STROKE[16], (size - 12) / 4)
		: lerp(OUTLINE_STROKE[16], OUTLINE_STROKE[24], (size - 16) / 8);
}

const shapesNode = (shapes: Shape[]): ShapeNode | null =>
	shapes.length ? { op: 'paths', shapes } : null;

function groupNode(op: GroupOp, kids: Array<ShapeNode | null>): ShapeNode | null {
	if (op === 'I') {
		const present = kids.filter(isShapeNode);
		return present.length && present.length === kids.length ? { op, kids: present } : null;
	}
	if (op === 'S') {
		const [base, ...cuts] = kids;
		if (!base) return null;
		const kept = cuts.filter((k): k is ShapeNode => !!k);
		return kept.length ? { op, kids: [base, ...kept] } : base;
	}
	const kept = kids.filter((k): k is ShapeNode => !!k);
	return kept.length ? { op, kids: kept } : null;
}

function renderMorph(
	root: MorphNode,
	size: number,
	sizeA: DesignSize,
	sizeB: DesignSize,
): ShapeNode | null {
	const t = (size - sizeA) / (sizeB - sizeA);
	const nearA = t < 0.5;

	const morphPath = ({ a, b }: PathPair): Shape[] => {
		const pts = a.pts.map((pa, i) => {
			const pb = b.pts[i];
			const controlsB = pb.c;
			const c =
				pa.c && controlsB ? mapControls(pa.c, (v, k) => lerp(v, controlsB[k], t)) : undefined;
			return {
				x: lerp(pa.x, pb.x, t),
				y: lerp(pa.y, pb.y, t),
				r: lerp(pa.r, pb.r, t),
				c,
				j: (nearA ? pa : pb).j,
			};
		});
		const extA = capExtensions(a.caps, a.w);
		const extB = capExtensions(b.caps, b.w);
		const profileB = b.profile;
		const profile =
			a.profile && profileB && a.profile.length === profileB.length
				? a.profile.map(
						([at, v], i): ProfileStop => [lerp(at, profileB[i][0], t), lerp(v, profileB[i][1], t)],
					)
				: nearA
					? a.profile
					: profileB;
		return drawPath(
			pts,
			a.closed,
			a.fill,
			lerp(a.w, b.w, t),
			nearA ? a.caps : b.caps,
			[lerp(extA[0], extB[0], t), lerp(extA[1], extB[1], t)],
			profile,
		);
	};

	// A part with no match keeps its shape and scales from its own drawing.
	const scalePath = (path: SkeletonPath, from: DesignSize): Shape[] => {
		const k = size / from;
		const w = (path.w * outlineStrokeAt(size)) / OUTLINE_STROKE[from];
		return drawPath(
			path.pts.map((p) => ({
				x: p.x * k,
				y: p.y * k,
				r: p.r * k,
				c: p.c && mapControls(p.c, (v) => v * k),
				j: p.j,
			})),
			path.closed,
			path.fill,
			w,
			path.caps,
			capExtensions(path.caps, w),
			path.profile,
		);
	};

	const renderStatic = (node: SkeletonNode, from: DesignSize): ShapeNode | null =>
		node.op === 'paths'
			? shapesNode(node.paths.flatMap((p) => scalePath(p, from)))
			: groupNode(
					node.op,
					node.kids.map((k) => renderStatic(k, from)),
				);

	const walk = (node: MorphNode): ShapeNode | null => {
		if (node.kind === 'paths') {
			const [only, from] = nearA ? [node.group.onlyA, sizeA] : [node.group.onlyB, sizeB];
			return shapesNode([
				...node.group.morph.flatMap(morphPath),
				...only.flatMap((p) => scalePath(p, from)),
			]);
		}
		if (node.kind === 'switch') {
			const pick = nearA ? node.a : node.b;
			return pick && renderStatic(pick, nearA ? sizeA : sizeB);
		}
		return groupNode(node.op, node.kids.map(walk));
	};

	return walk(root);
}

function serialize(tree: ShapeNode, size: number, idPrefix: string): string {
	const s = fmt(size);
	const masks: string[] = [];
	const addMask = (content: string) => {
		const id = `${idPrefix}${masks.length}`;
		masks.push(
			`<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${s}" height="${s}">${content}</mask>`,
		);
		return id;
	};
	const draw = (node: ShapeNode, color: string): string => {
		if (node.op === 'paths') {
			return node.shapes
				.map((shape) => {
					const stroke =
						shape.w > 0
							? ` stroke="${color}" stroke-width="${fmt(shape.w)}" stroke-linecap="${shape.cap}"${shape.join !== 'miter' ? ` stroke-linejoin="${shape.join}"` : ''}`
							: '';
					return `<path d="${shape.d}" fill="${shape.fill ? color : 'none'}"${stroke}/>`;
				})
				.join('');
		}
		if (node.op === 'U') return node.kids.map((k) => draw(k, color)).join('');
		if (node.op === 'S') {
			const id = addMask(
				draw(node.kids[0], '#fff') +
					node.kids
						.slice(1)
						.map((k) => draw(k, '#000'))
						.join(''),
			);
			return `<rect width="${s}" height="${s}" fill="${color}" mask="url(#${id})"/>`;
		}
		return node.kids
			.slice(1)
			.reduce(
				(acc, k) => `<g mask="url(#${addMask(draw(k, '#fff'))})">${acc}</g>`,
				draw(node.kids[0], color),
			);
	};
	const body = draw(tree, 'currentColor');
	return (masks.length ? `<defs>${masks.join('')}</defs>` : '') + body;
}
