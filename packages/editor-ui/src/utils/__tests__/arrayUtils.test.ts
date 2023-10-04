import { findGaps } from '@/utils/arrayUtils';

describe('findGaps', () => {
	test.each([
		[[1, 2, 3], []],
		[[1, 2, 4], [3]],
		[
			[1, 2, 4, 5, 7],
			[3, 6],
		],
		[
			[1, 2, 4, 5, 7, 9],
			[3, 6, 8],
		],
		[
			[5, 1, 2, 4, 7, 9],
			[3, 6, 8],
		],
	])('should find gaps in (%s)', (input, expected) => {
		expect(findGaps(input)).toEqual(expected);
	});
});
