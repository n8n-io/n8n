import {
	CASE_DIFFICULTIES,
	CASE_INPUT_FLAVORS,
	GENERAL_CAPABILITY,
	sampleDimensionTuples,
} from '../dimensions';

describe('sampleDimensionTuples', () => {
	const key = (t: { capability: string; difficulty: string; flavor: string }) =>
		`${t.capability}|${t.difficulty}|${t.flavor}`;

	it('returns exactly `count` tuples', () => {
		expect(sampleDimensionTuples(['a', 'b'], 6)).toHaveLength(6);
		expect(sampleDimensionTuples([], 3)).toHaveLength(3);
	});

	it('returns nothing for a non-positive count', () => {
		expect(sampleDimensionTuples(['a'], 0)).toEqual([]);
		expect(sampleDimensionTuples(['a'], -2)).toEqual([]);
	});

	it('falls back to the general capability when none are supplied', () => {
		const tuples = sampleDimensionTuples([], 4);
		expect(tuples.every((t) => t.capability === GENERAL_CAPABILITY)).toBe(true);
	});

	it('is deterministic for identical inputs', () => {
		expect(sampleDimensionTuples(['x', 'y'], 5)).toEqual(sampleDimensionTuples(['x', 'y'], 5));
	});

	it('produces only valid difficulties and flavors', () => {
		for (const tuple of sampleDimensionTuples(['a', 'b', 'c'], 12)) {
			expect(CASE_DIFFICULTIES).toContain(tuple.difficulty);
			expect(CASE_INPUT_FLAVORS).toContain(tuple.flavor);
		}
	});

	it('spreads across the grid without duplicates when count < grid size', () => {
		// grid = 1 cap × 2 difficulties × 4 flavors = 8; ask for 6 distinct.
		const tuples = sampleDimensionTuples([GENERAL_CAPABILITY], 6);
		expect(new Set(tuples.map(key)).size).toBe(6);
		// A small sample should still touch every flavor.
		expect(new Set(tuples.map((t) => t.flavor)).size).toBe(CASE_INPUT_FLAVORS.length);
	});

	it('spreads across every capability', () => {
		const caps = ['tool-a', 'tool-b', 'tool-c'];
		const tuples = sampleDimensionTuples(caps, caps.length * 2);
		expect(new Set(tuples.map((t) => t.capability))).toEqual(new Set(caps));
	});

	it('varies difficulty within each capability (difficulty decorrelated from capability)', () => {
		// With 2 capabilities and 2 difficulties, naive `i % n` indexing would lock
		// each capability to a single difficulty; assert both appear per capability.
		const caps = ['a', 'b'];
		const tuples = sampleDimensionTuples(caps, 8);
		for (const cap of caps) {
			const diffs = new Set(tuples.filter((t) => t.capability === cap).map((t) => t.difficulty));
			expect(diffs).toEqual(new Set(CASE_DIFFICULTIES));
		}
	});

	it('cycles the grid when count exceeds the grid size', () => {
		// grid = 8; ask for 10 → still 10, cycling back through the grid.
		const tuples = sampleDimensionTuples([GENERAL_CAPABILITY], 10);
		expect(tuples).toHaveLength(10);
		expect(tuples[8]).toEqual(tuples[0]);
	});
});
