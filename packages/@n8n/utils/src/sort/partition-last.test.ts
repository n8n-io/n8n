import { partitionLast } from './partition-last';

describe('partitionLast', () => {
	it('moves matching items to the end and keeps the order inside both groups', () => {
		const items = ['a', 'B', 'c', 'D', 'e'];

		expect(partitionLast(items, (item) => item === item.toUpperCase())).toEqual([
			'a',
			'c',
			'e',
			'B',
			'D',
		]);
	});

	it('returns the same array when nothing matches', () => {
		const items = [1, 2, 3];

		expect(partitionLast(items, () => false)).toBe(items);
	});

	it('returns a new array when at least one item matches', () => {
		const items = [1, 2, 3];
		const result = partitionLast(items, (item) => item === 1);

		expect(result).not.toBe(items);
		expect(result).toEqual([2, 3, 1]);
		expect(items).toEqual([1, 2, 3]);
	});

	it('handles an empty array', () => {
		const items: number[] = [];

		expect(partitionLast(items, () => true)).toBe(items);
	});
});
