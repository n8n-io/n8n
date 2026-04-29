import { partitionRoundRobin } from '../cli/lanes';

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
