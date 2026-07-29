import { formatTimeAgo } from './dateFormatter';

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
