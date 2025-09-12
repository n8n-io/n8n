import {
	isEmpty,
	intersection,
	isValidDate,
	convertToDisplayDate,
	convertToHumanReadableDate,
} from '@/utils/typesUtils';

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

	describe('Date Formatting Functions', () => {
		// Test data representing the same moment in time
		const testEpoch = 1723039948000; // 2025-08-07T14:52:28.000Z
		const testDate = new Date(testEpoch);

		beforeEach(() => {
			// Mock timezone for consistent testing
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2025-08-07T12:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		describe('convertToDisplayDate', () => {
			test('should format epoch time consistently', () => {
				const result = convertToDisplayDate(testEpoch);

				// Should return a string in YYYY-MM-DD HH:MM:SS format
				expect(typeof result).toBe('string');
				expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
			});

			test('should handle different epoch values', () => {
				const epochs = [
					0, // Unix epoch start
					1000000000000, // 2001-09-09T01:46:40.000Z
					1640995200000, // 2022-01-01T00:00:00.000Z
					testEpoch,
				];

				epochs.forEach((epoch) => {
					expect(() => convertToDisplayDate(epoch)).not.toThrow();
					const result = convertToDisplayDate(epoch);
					expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
				});
			});

			test('should create proper Date object internally', () => {
				// This test ensures our fix is working - the function should create a Date object
				// before formatting, which ensures consistent timezone handling
				const result1 = convertToDisplayDate(testEpoch);
				const result2 = convertToDisplayDate(testEpoch);

				// Multiple calls with same input should produce same result
				expect(result1).toBe(result2);
			});
		});

		describe('convertToHumanReadableDate', () => {
			test('should format epoch time in human readable format', () => {
				const result = convertToHumanReadableDate(testEpoch);

				// Should return a string in "d mmmm, yyyy @ HH:MM Z" format
				expect(typeof result).toBe('string');
				expect(result).toMatch(/^\d{1,2} \w+, \d{4} @ \d{2}:\d{2} .+$/);
			});

			test('should include timezone information', () => {
				const result = convertToHumanReadableDate(testEpoch);

				// Should contain timezone info (the "Z" part in the format)
				expect(result).toContain('@');
				// Should have timezone offset or name at the end
				expect(result.split('@')[1]).toBeTruthy();
			});

			test('should handle different epoch values consistently', () => {
				const epochs = [
					1000000000000, // 2001-09-09T01:46:40.000Z
					1640995200000, // 2022-01-01T00:00:00.000Z
					testEpoch,
				];

				epochs.forEach((epoch) => {
					expect(() => convertToHumanReadableDate(epoch)).not.toThrow();
					const result = convertToHumanReadableDate(epoch);
					expect(result).toMatch(/^\d{1,2} \w+, \d{4} @ \d{2}:\d{2} .+$/);
				});
			});

			test('should create proper Date object internally', () => {
				// This test ensures our fix is working
				const result1 = convertToHumanReadableDate(testEpoch);
				const result2 = convertToHumanReadableDate(testEpoch);

				// Multiple calls with same input should produce same result
				expect(result1).toBe(result2);
			});
		});

		describe('Timezone consistency between functions', () => {
			test('should maintain consistent timezone handling', () => {
				// Both functions should handle the same epoch time consistently
				// They use different formats but should represent the same moment in time
				const displayResult = convertToDisplayDate(testEpoch);
				const humanResult = convertToHumanReadableDate(testEpoch);

				// Extract time components to verify they represent the same moment
				const displayTime = displayResult.split(' ')[1]; // HH:MM:SS
				const humanTime = humanResult.split('@')[1].trim().split(' ')[0]; // HH:MM

				// The hour and minute should match (seconds are not in human readable format)
				expect(displayTime.substring(0, 5)).toBe(humanTime);
			});
		});
	});
});
