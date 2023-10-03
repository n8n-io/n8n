import { range } from '@/utils/arrayUtils';

describe('range', () => {
	it('should return an array of numbers from start to end', () => {
		expect(range(1, 5)).toEqual([1, 2, 3, 4]);
		expect(range(3, 7)).toEqual([3, 4, 5, 6]);
		expect(range(4, 2)).toEqual([]);
	});
});
