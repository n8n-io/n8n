import { expandWithIterations, partitionRoundRobin } from '../cli/lanes';

describe('partitionRoundRobin', () => {
	it('splits 9 items into 3 lanes by index modulo', () => {
		const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
		expect(partitionRoundRobin(items, 3)).toEqual([
			['a', 'd', 'g'],
			['b', 'e', 'h'],
			['c', 'f', 'i'],
		]);
	});

	it('returns a single bucket containing every item when laneCount is 1', () => {
		const items = [1, 2, 3, 4, 5];
		expect(partitionRoundRobin(items, 1)).toEqual([[1, 2, 3, 4, 5]]);
	});

	it('returns empty buckets for lanes that get no items when laneCount > items.length', () => {
		const items = ['only'];
		expect(partitionRoundRobin(items, 3)).toEqual([['only'], [], []]);
	});

	it('returns laneCount empty buckets when items is empty', () => {
		expect(partitionRoundRobin([], 3)).toEqual([[], [], []]);
	});

	it('preserves item identity (no clone)', () => {
		const a = { id: 'a' };
		const b = { id: 'b' };
		const buckets = partitionRoundRobin([a, b], 2);
		expect(buckets[0][0]).toBe(a);
		expect(buckets[1][0]).toBe(b);
	});

	it('throws when laneCount < 1', () => {
		expect(() => partitionRoundRobin([1, 2], 0)).toThrow(/laneCount must be >= 1/);
		expect(() => partitionRoundRobin([1, 2], -1)).toThrow(/laneCount must be >= 1/);
	});

	it('reconstructs source order when re-sorted by an embedded original index', () => {
		// Mirrors runDirectLoop's flow: tag each item with its origIdx, partition
		// across lanes, flatten lane outputs, sort back by origIdx.
		const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
		const indexed = items.map((value, origIdx) => ({ value, origIdx }));
		const buckets = partitionRoundRobin(indexed, 3);
		const flat = buckets.flat();
		flat.sort((x, y) => x.origIdx - y.origIdx);
		expect(flat.map((x) => x.value)).toEqual(items);
	});
});

describe('expandWithIterations', () => {
	type Item = { file: string; scen: string; iter?: number };
	const tag = (item: Item, iter: number): Item => ({ ...item, iter });
	const getFile = (item: Item): string => item.file;

	it('round-robins across files in the first round', () => {
		const items: Item[] = [
			{ file: 'A', scen: '1' },
			{ file: 'A', scen: '2' },
			{ file: 'B', scen: '1' },
			{ file: 'C', scen: '1' },
		];
		const out = [...expandWithIterations(items, getFile, 1, tag)];
		// Round 1 yields one scenario per file in insertion order, then round 2 picks up A's second scenario.
		expect(out.map((x) => `${x.file}.${x.scen}`)).toEqual(['A.1', 'B.1', 'C.1', 'A.2']);
	});

	it('iter-interleaves per scenario before moving on', () => {
		const items: Item[] = [
			{ file: 'A', scen: '1' },
			{ file: 'B', scen: '1' },
		];
		const out = [...expandWithIterations(items, getFile, 3, tag)];
		expect(out.map((x) => `${x.file}.${x.scen}.${String(x.iter)}`)).toEqual([
			'A.1.0',
			'A.1.1',
			'A.1.2',
			'B.1.0',
			'B.1.1',
			'B.1.2',
		]);
	});

	it('skips files that ran out of scenarios in later rounds', () => {
		const items: Item[] = [
			{ file: 'A', scen: '1' },
			{ file: 'A', scen: '2' },
			{ file: 'B', scen: '1' },
		];
		const out = [...expandWithIterations(items, getFile, 1, tag)];
		// Round 1: A.1, B.1. Round 2: A.2 (B has no second scenario, skipped).
		expect(out.map((x) => `${x.file}.${x.scen}`)).toEqual(['A.1', 'B.1', 'A.2']);
	});

	it('yields nothing for empty input', () => {
		expect([...expandWithIterations<Item>([], getFile, 3, tag)]).toEqual([]);
	});

	it('yields nothing when iterations is 0', () => {
		const items: Item[] = [{ file: 'A', scen: '1' }];
		expect([...expandWithIterations(items, getFile, 0, tag)]).toEqual([]);
	});

	it('first wave covers all files after enough items pulled', () => {
		const items: Item[] = [];
		for (const f of ['A', 'B', 'C', 'D', 'E']) {
			for (const s of ['1', '2', '3']) items.push({ file: f, scen: s });
		}
		const out = [...expandWithIterations(items, getFile, 3, tag)];
		// Total: 5 files × 3 scenarios × 3 iters = 45 yielded items.
		expect(out).toHaveLength(45);
		// First 5×3 = 15 items cover one scenario per file × all 3 iterations.
		const firstWave = out.slice(0, 15).map((x) => x.file);
		expect(new Set(firstWave)).toEqual(new Set(['A', 'B', 'C', 'D', 'E']));
	});
});
