import { describe, it, expect } from 'vitest';
import { computeDisplacements } from './computeDisplacements';

const source = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const candidate = (id: string, x: number, y: number, width: number, height: number) => ({
	id,
	rect: { x, y, width, height },
	memberIds: [id],
});

describe('computeDisplacements', () => {
	it('returns empty map when there are no candidates', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), []);
		expect(result.size).toBe(0);
	});

	it('returns empty map when no candidate overlaps the source', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 200, 200, 50, 50)]);
		expect(result.size).toBe(0);
	});

	it('does not displace a candidate that only touches the source on the right edge', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 100, 0, 50, 50)]);
		expect(result.size).toBe(0);
	});

	it('does not displace a candidate that only touches the source on the bottom edge', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 0, 100, 50, 50)]);
		expect(result.size).toBe(0);
	});

	it('pushes a candidate directly below the source down by the overlap', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 10, 80, 50, 50)]);
		expect(result.get('a')).toEqual({ dx: 0, dy: 20 });
	});

	it('pushes a candidate directly right of the source right by the overlap', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 80, 10, 50, 50)]);
		expect(result.get('a')).toEqual({ dx: 20, dy: 0 });
	});

	it('prefers downward displacement when both axes have equal overlap', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 70, 70, 50, 50)]);
		expect(result.get('a')).toEqual({ dx: 0, dy: 30 });
	});

	it('cascades displacement when a displaced rect overlaps a further candidate', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [
			candidate('a', 10, 80, 50, 50),
			candidate('b', 10, 140, 50, 50),
		]);
		expect(result.get('a')).toEqual({ dx: 0, dy: 20 });
		expect(result.get('b')).toEqual({ dx: 0, dy: 10 });
	});

	it('terminates the cascade when a gap separates the next candidate', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [
			candidate('a', 10, 80, 50, 50),
			candidate('b', 10, 200, 50, 50),
		]);
		expect(result.get('a')).toEqual({ dx: 0, dy: 20 });
		expect(result.has('b')).toBe(false);
	});

	it('does not displace a candidate entirely above the source', () => {
		const result = computeDisplacements(source(0, 100, 100, 100), [candidate('a', 10, 0, 50, 50)]);
		expect(result.size).toBe(0);
	});

	it('does not displace a candidate entirely to the left of the source', () => {
		const result = computeDisplacements(source(100, 0, 100, 100), [candidate('a', 0, 10, 50, 50)]);
		expect(result.size).toBe(0);
	});

	it('broadcasts the offset to every member of a displaced group candidate', () => {
		const result = computeDisplacements(source(0, 0, 100, 100), [
			{
				id: 'group1',
				rect: { x: 10, y: 80, width: 50, height: 50 },
				memberIds: ['m1', 'm2', 'm3'],
			},
		]);
		expect(result.get('m1')).toEqual({ dx: 0, dy: 20 });
		expect(result.get('m2')).toEqual({ dx: 0, dy: 20 });
		expect(result.get('m3')).toEqual({ dx: 0, dy: 20 });
		expect(result.has('group1')).toBe(false);
	});

	it('handles two independent cascade chains in the same source projection', () => {
		const result = computeDisplacements(source(0, 0, 200, 100), [
			// Chain 1: below-left, single overlap.
			candidate('a', 20, 90, 30, 30),
			// Chain 2: below-right, single overlap.
			candidate('b', 150, 95, 30, 30),
		]);
		expect(result.get('a')).toEqual({ dx: 0, dy: 10 });
		expect(result.get('b')).toEqual({ dx: 0, dy: 5 });
	});

	it('does not double-displace a candidate already moved', () => {
		// Source projects onto A; A's new rect would also overlap A again if checked.
		// The "not yet displaced" guard prevents repeated displacement.
		const result = computeDisplacements(source(0, 0, 100, 100), [candidate('a', 10, 50, 50, 50)]);
		// overlapY = 50, overlapX = 90 → push down by 50. A → (10, 100, 50, 50). No further overlap with source.
		expect(result.get('a')).toEqual({ dx: 0, dy: 50 });
	});

	it('keeps each candidate isolated when sweep filter excludes upper-left candidate', () => {
		// Candidate at the upper-left of source should be ignored even if rects technically overlap.
		// (A node fully above the source's top edge.)
		const result = computeDisplacements(source(50, 50, 100, 100), [
			candidate('above', 60, 0, 30, 30),
		]);
		expect(result.size).toBe(0);
	});
});
