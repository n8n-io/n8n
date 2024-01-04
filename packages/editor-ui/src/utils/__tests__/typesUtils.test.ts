import { isEmpty, intersection, isValidDate } from '@/utils/typesUtils';

describe('Types Utils', () => {
	describe('isEmpty', () => {
		test.each([
			[undefined, true],
			[null, true],
			[{}, true],
			[{ a: {} }, true],
			[{ a: { b: [] } }, true],
			[{ a: { b: [1] } }, false],
			[[], true],
			[[{}, {}, {}], true],
			[[{}, null, false], true],
			[[{}, null, false, 1], false],
			[[[], [], []], true],
			['', true],
			['0', false],
			[0, false],
			[1, false],
			[false, true],
			[true, false],
		])('for value %s should return %s', (value, expected) => {
			expect(isEmpty(value)).toBe(expected);
		});
	});

	describe('intersection', () => {
		it('should return the intersection of two arrays', () => {
			expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
		});

		it('should return the intersection of two arrays without duplicates', () => {
			expect(intersection([1, 2, 2, 3], [2, 2, 3, 4])).toEqual([2, 3]);
		});

		it('should return the intersection of four arrays without duplicates', () => {
			expect(
				intersection([1, 2, 2, 3, 4], [2, 3, 3, 4], [2, 1, 5, 4, 4, 1], [2, 4, 5, 5, 6, 7]),
			).toEqual([2, 4]);
		});
	});

	describe('dateTests', () => {
		test.each([
			'04-08-2021',
			'15.11.2022 12:34h',
			'15.11.2022. 12:34h',
			'21-03-1988 12:34h',
			'2022-11-15',
			'11/11/2022',
			1668470400000,
			'2021-1-01',
			'2021-01-1',
			'2021/11/24',
			'2021/04/08',
			'Mar 25 2015',
			'25 Mar 2015',
			'2019-06-11T00:00',
			'2022-11-15T19:21:13.932Z',
			'Tue Jan 01 2019 02:07:00 GMT+0530',
			new Date(),
			'4/08/2021',
			'2021/04/04',
		])('should correctly recognize dates', (input) => {
			expect(isValidDate(input)).toBeTruthy();
		});
	});
});
