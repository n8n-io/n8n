import { mapArray } from './map-array';

describe('mapArray', () => {
	it('should return a new array with the mapped items when an item changes', () => {
		const first = { id: 1 };
		const second = { id: 2 };
		const items = [first, second];

		const result = mapArray(items, (item) => (item.id === 2 ? { id: 3 } : item));

		expect(result).not.toBe(items);
		expect(result).toEqual([{ id: 1 }, { id: 3 }]);
		expect(result[0]).toBe(first);
		expect(items).toEqual([{ id: 1 }, { id: 2 }]);
	});

	it('should return the same array when no item changes', () => {
		const items = [{ id: 1 }, { id: 2 }];

		expect(mapArray(items, (item) => item)).toBe(items);
	});

	it('should return the same array when it is empty', () => {
		const items: number[] = [];

		expect(mapArray(items, (item) => item + 1)).toBe(items);
	});
});
