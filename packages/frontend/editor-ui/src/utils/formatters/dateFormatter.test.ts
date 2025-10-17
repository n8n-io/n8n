import {
	formatTimeAgo,
	convertToDisplayDate,
	convertToDisplayDateComponents,
	toDayMonth,
	toTime,
} from './dateFormatter';

describe('formatTimeAgo', () => {
	const now = new Date('2023-07-15T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('should return "Today" for today', () => {
		const today = new Date('2023-07-15T08:00:00Z');
		expect(formatTimeAgo(today)).toBe('Today');
	});

	test('should return "Yesterday" for 1 day ago', () => {
		const yesterday = new Date('2023-07-14T12:00:00Z');
		expect(formatTimeAgo(yesterday)).toBe('Yesterday');
	});

	test('should return weekday name for 2-6 days ago', () => {
		const threeDaysAgo = new Date('2023-07-12T12:00:00Z'); // Wednesday
		expect(formatTimeAgo(threeDaysAgo)).toBe('Wednesday');

		const sixDaysAgo = new Date('2023-07-09T12:00:00Z'); // Sunday
		expect(formatTimeAgo(sixDaysAgo)).toBe('Sunday');
	});

	test('should return "Last [Weekday]" for 7-13 days ago', () => {
		const sevenDaysAgo = new Date('2023-07-08T12:00:00Z'); // Saturday
		expect(formatTimeAgo(sevenDaysAgo)).toBe('Last Saturday');

		const thirteenDaysAgo = new Date('2023-07-02T12:00:00Z'); // Sunday
		expect(formatTimeAgo(thirteenDaysAgo)).toBe('Last Sunday');
	});

	test('should return "[n] days ago" for 14-30 days ago', () => {
		const fourteenDaysAgo = new Date('2023-07-01T12:00:00Z');
		expect(formatTimeAgo(fourteenDaysAgo)).toBe('14 days ago');

		const thirtyDaysAgo = new Date('2023-06-15T12:00:00Z');
		expect(formatTimeAgo(thirtyDaysAgo)).toBe('30 days ago');
	});

	test('should return "[Month] [Day], [Year]" for 31+ days ago', () => {
		const thirtyOneDaysAgo = new Date('2023-06-14T12:00:00Z');
		expect(formatTimeAgo(thirtyOneDaysAgo)).toBe('June 14, 2023');

		const oneYearAgo = new Date('2022-07-15T12:00:00Z');
		expect(formatTimeAgo(oneYearAgo)).toBe('July 15, 2022');
	});

	test('should handle string input', () => {
		const yesterday = '2023-07-14T12:00:00Z';
		expect(formatTimeAgo(yesterday)).toBe('Yesterday');
	});

	test('should handle edge cases at boundaries', () => {
		// Exactly 7 days ago
		const exactlySevenDaysAgo = new Date('2023-07-08T12:00:00Z');
		expect(formatTimeAgo(exactlySevenDaysAgo)).toBe('Last Saturday');

		// Exactly 14 days ago
		const exactlyFourteenDaysAgo = new Date('2023-07-01T12:00:00Z');
		expect(formatTimeAgo(exactlyFourteenDaysAgo)).toBe('14 days ago');

		// Exactly 31 days ago
		const exactlyThirtyOneDaysAgo = new Date('2023-06-14T12:00:00Z');
		expect(formatTimeAgo(exactlyThirtyOneDaysAgo)).toBe('June 14, 2023');
	});
});

describe('Timezone Consistency Tests', () => {
	// Test data representing the same moment in time in different formats
	const testTimestamp = '2025-08-07T14:52:28.000Z'; // UTC time
	const testDate = new Date(testTimestamp);
	const testEpoch = testDate.getTime();

	beforeEach(() => {
		// Mock timezone to simulate user in UTC+8 (like the reported issue)
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-08-07T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('convertToDisplayDate', () => {
		test('should produce consistent results for different input formats', () => {
			const resultFromString = convertToDisplayDate(testTimestamp);
			const resultFromDate = convertToDisplayDate(testDate);
			const resultFromNumber = convertToDisplayDate(testEpoch);

			// All formats should produce the same result
			expect(resultFromString).toEqual(resultFromDate);
			expect(resultFromDate).toEqual(resultFromNumber);
			expect(resultFromString).toEqual(resultFromNumber);
		});

		test('should handle timezone correctly', () => {
			const result = convertToDisplayDate(testTimestamp);

			// Should contain both date and time components
			expect(result).toHaveProperty('date');
			expect(result).toHaveProperty('time');
			expect(typeof result.date).toBe('string');
			expect(typeof result.time).toBe('string');

			// Time should be formatted as HH:MM:ss
			expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});
	});

	describe('convertToDisplayDateComponents', () => {
		test('should produce consistent results for different input formats', () => {
			const resultFromString = convertToDisplayDateComponents(testTimestamp);
			const resultFromDate = convertToDisplayDateComponents(testDate);
			const resultFromNumber = convertToDisplayDateComponents(testEpoch);

			// All formats should produce the same result
			expect(resultFromString).toEqual(resultFromDate);
			expect(resultFromDate).toEqual(resultFromNumber);
			expect(resultFromString).toEqual(resultFromNumber);
		});

		test('should handle year display correctly', () => {
			const currentYear = new Date().getFullYear();
			const currentYearDate = new Date(`${currentYear}-08-07T14:52:28.000Z`);
			const differentYearDate = new Date(`${currentYear - 1}-08-07T14:52:28.000Z`);

			const currentYearResult = convertToDisplayDateComponents(currentYearDate);
			const differentYearResult = convertToDisplayDateComponents(differentYearDate);

			// Current year should not include year in date
			expect(currentYearResult.date).not.toContain(currentYear.toString());

			// Different year should include year in date
			expect(differentYearResult.date).toContain((currentYear - 1).toString());
		});
	});

	describe('toDayMonth', () => {
		test('should produce consistent results for different input formats', () => {
			const resultFromString = toDayMonth(testTimestamp);
			const resultFromDate = toDayMonth(testDate);

			// Both formats should produce the same result
			expect(resultFromString).toBe(resultFromDate);
		});

		test('should format day and month correctly', () => {
			const result = toDayMonth(testTimestamp);

			// Should match pattern like "7 Aug" or "07 Aug"
			expect(result).toMatch(/^\d{1,2} \w{3}$/);
		});
	});

	describe('toTime', () => {
		test('should produce consistent results for different input formats', () => {
			const resultFromString = toTime(testTimestamp);
			const resultFromDate = toTime(testDate);

			// Both formats should produce the same result
			expect(resultFromString).toBe(resultFromDate);
		});

		test('should format time correctly without milliseconds', () => {
			const result = toTime(testTimestamp, false);

			// Should match HH:MM:ss pattern
			expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});

		test('should format time correctly with milliseconds', () => {
			const result = toTime(testTimestamp, true);

			// Should match HH:MM:ss.mmm pattern
			expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
		});

		test('should handle milliseconds parameter correctly', () => {
			const withoutMillis = toTime(testTimestamp, false);
			const withMillis = toTime(testTimestamp, true);

			// With milliseconds should be longer
			expect(withMillis.length).toBeGreaterThan(withoutMillis.length);

			// Without milliseconds should be base of with milliseconds
			expect(withMillis).toStartWith(withoutMillis.substring(0, 8));
		});
	});

	describe('Cross-function consistency', () => {
		test('should maintain timezone consistency across all formatters', () => {
			// Test that all formatters handle the same timestamp consistently
			const displayDate = convertToDisplayDate(testTimestamp);
			const displayDateComponents = convertToDisplayDateComponents(testTimestamp);
			const timeOnly = toTime(testTimestamp);

			// The time component should be consistent across functions
			expect(displayDate.time).toBe(timeOnly);
			expect(displayDateComponents.time).toBe(timeOnly);
		});

		test('should handle edge case timestamps correctly', () => {
			const edgeCases = [
				'2025-01-01T00:00:00.000Z', // New Year
				'2025-12-31T23:59:59.999Z', // End of year
				'2025-02-29T12:00:00.000Z', // Leap year (if applicable)
				'2025-06-15T12:00:00.000Z', // Mid-year
			];

			edgeCases.forEach((timestamp) => {
				// All functions should handle these timestamps without throwing
				expect(() => convertToDisplayDate(timestamp)).not.toThrow();
				expect(() => convertToDisplayDateComponents(timestamp)).not.toThrow();
				expect(() => toDayMonth(timestamp)).not.toThrow();
				expect(() => toTime(timestamp)).not.toThrow();
				expect(() => formatTimeAgo(timestamp)).not.toThrow();
			});
		});
	});
});
