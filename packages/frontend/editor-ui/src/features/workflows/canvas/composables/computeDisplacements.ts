export interface Offset {
	dx: number;
	dy: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DisplacementCandidate {
	id: string;
	rect: Rect;
	memberIds: string[];
}

function rectsOverlap(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function isInSweepRegion(source: Rect, c: Rect): boolean {
	if (c.y + c.height <= source.y) return false;
	if (c.x + c.width <= source.x) return false;

	const xStripOverlap = c.x < source.x + source.width && c.x + c.width > source.x;
	const yStripOverlap = c.y < source.y + source.height && c.y + c.height > source.y;
	return xStripOverlap || yStripOverlap;
}

export function computeDisplacements(
	sourceRect: Rect,
	candidates: DisplacementCandidate[],
): Map<string, Offset> {
	const inSweep = candidates.filter((c) => isInSweepRegion(sourceRect, c.rect));
	const sorted = [...inSweep].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

	const offsetsByCandidate = new Map<string, Offset>();
	const displacedRects = new Map<string, Rect>();
	const queue: Rect[] = [sourceRect];

	while (queue.length > 0) {
		const r = queue.shift() as Rect;
		for (const candidate of sorted) {
			if (offsetsByCandidate.has(candidate.id)) continue;
			if (!rectsOverlap(r, candidate.rect)) continue;

			const overlapX = r.x + r.width - candidate.rect.x;
			const overlapY = r.y + r.height - candidate.rect.y;
			if (overlapX <= 0 || overlapY <= 0) continue;

			const offset: Offset =
				overlapY <= overlapX ? { dx: 0, dy: overlapY } : { dx: overlapX, dy: 0 };

			offsetsByCandidate.set(candidate.id, offset);
			const newRect: Rect = {
				x: candidate.rect.x + offset.dx,
				y: candidate.rect.y + offset.dy,
				width: candidate.rect.width,
				height: candidate.rect.height,
			};
			displacedRects.set(candidate.id, newRect);
			queue.push(newRect);
		}
	}

	const result = new Map<string, Offset>();
	for (const candidate of sorted) {
		const offset = offsetsByCandidate.get(candidate.id);
		if (!offset) continue;
		for (const memberId of candidate.memberIds) {
			result.set(memberId, offset);
		}
	}
	return result;
}
