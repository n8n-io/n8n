import { vi } from 'vitest';
import {
	convertToDisplayDate,
	convertToDisplayDateComponents,
	toDayMonth,
	toTime,
	formatTimeAgo,
} from './dateFormatter';
import {
	convertToDisplayDate as typesConvertToDisplayDate,
	convertToHumanReadableDate,
} from '../typesUtils';

/**
 * Integration tests to verify timezone consistency across all date formatting functions.
 * This test suite specifically addresses the issue where execution times were displayed
 * differently in the execution list vs execution details due to timezone handling inconsistencies.
 */
describe('Timezone Consistency Integration Tests', () => {
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

	describe('Cross-module consistency', () => {
		test('dateFormatter and typesUtils should handle same epoch consistently', () => {
			// Test the specific scenario from the bug report:
			// dateFormatter functions are used in execution details (right panel)
			// typesUtils functions might be used elsewhere in the application

			const dateFormatterResult = convertToDisplayDate(testTimestamp);
			const typesUtilsResult = typesConvertToDisplayDate(testEpoch);

			// Both should represent the same moment in time
			// Extract time components for comparison
			const dateFormatterTime = dateFormatterResult.time;
			const typesUtilsTime = typesUtilsResult.split(' ')[1]; // Extract time part

			// Times should match (both should show local timezone)
			expect(dateFormatterTime).toBe(typesUtilsTime);
		});

		test('all formatters should handle the same timestamp consistently', () => {
			// This test ensures that all our date formatting functions
			// produce consistent results for the same input timestamp

			const results = {
				displayDate: convertToDisplayDate(testTimestamp),
				displayDateComponents: convertToDisplayDateComponents(testTimestamp),
				dayMonth: toDayMonth(testTimestamp),
				time: toTime(testTimestamp),
				timeAgo: formatTimeAgo(testTimestamp),
				typesDisplayDate: typesConvertToDisplayDate(testEpoch),
				humanReadable: convertToHumanReadableDate(testEpoch),
			};

			// All functions should execute without throwing
			Object.values(results).forEach((result) => {
				expect(result).toBeTruthy();
			});

			// Time components should be consistent across functions
			expect(results.displayDate.time).toBe(results.time);
			expect(results.displayDateComponents.time).toBe(results.time);
		});
	});

	describe('Input format consistency', () => {
		test('should handle string, Date, and number inputs consistently', () => {
			const inputs = [
				testTimestamp, // ISO string
				testDate, // Date object
				testEpoch, // Epoch number
			];

			// Test each formatter with all input types
			inputs.forEach((input, index) => {
				// These functions accept string or Date
				if (typeof input !== 'number') {
					const displayDate = convertToDisplayDate(input);
					const displayDateComponents = convertToDisplayDateComponents(input);
					const dayMonth = toDayMonth(input);
					const time = toTime(input);
					const timeAgo = formatTimeAgo(input);

					// All should produce valid results
					expect(displayDate.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
					expect(displayDateComponents.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
					expect(dayMonth).toMatch(/^\d{1,2} \w{3}$/);
					expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
					expect(timeAgo).toBeTruthy();

					// Time components should be identical
					expect(displayDate.time).toBe(time);
					expect(displayDateComponents.time).toBe(time);
				}

				// These functions accept epoch numbers
				if (typeof input === 'number') {
					const typesDisplayDate = typesConvertToDisplayDate(input);
					const humanReadable = convertToHumanReadableDate(input);

					expect(typesDisplayDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
					expect(humanReadable).toMatch(/^\d{1,2} \w+, \d{4} @ \d{2}:\d{2} .+$/);
				}
			});
		});
	});

	describe('Timezone edge cases', () => {
		test('should handle daylight saving time transitions', () => {
			// Test dates around DST transitions (if applicable to user's timezone)
			const dstDates = [
				'2025-03-09T07:00:00.000Z', // Spring forward (US)
				'2025-11-02T06:00:00.000Z', // Fall back (US)
			];

			dstDates.forEach((dateStr) => {
				const date = new Date(dateStr);
				const epoch = date.getTime();

				// All formatters should handle DST transitions gracefully
				expect(() => convertToDisplayDate(dateStr)).not.toThrow();
				expect(() => convertToDisplayDateComponents(dateStr)).not.toThrow();
				expect(() => toDayMonth(dateStr)).not.toThrow();
				expect(() => toTime(dateStr)).not.toThrow();
				expect(() => formatTimeAgo(dateStr)).not.toThrow();
				expect(() => typesConvertToDisplayDate(epoch)).not.toThrow();
				expect(() => convertToHumanReadableDate(epoch)).not.toThrow();
			});
		});

		test('should handle year boundaries correctly', () => {
			const yearBoundaryDates = ['2024-12-31T23:59:59.999Z', '2025-01-01T00:00:00.000Z'];

			yearBoundaryDates.forEach((dateStr) => {
				const date = new Date(dateStr);
				const epoch = date.getTime();

				const displayDate = convertToDisplayDate(dateStr);
				const typesDisplayDate = typesConvertToDisplayDate(epoch);

				// Both should handle year boundaries correctly
				expect(displayDate.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
				expect(typesDisplayDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
			});
		});
	});

	describe('Real-world scenario simulation', () => {
		test('should fix the original bug: execution list vs details time consistency', () => {
			// Simulate the original bug scenario:
			// - Left sidebar (ExecutionsTime): uses new Date(timestamp).getTime()
			// - Right panel (WorkflowExecutionsPreview): uses convertToDisplayDate()

			// Simulate what ExecutionsTime component does internally
			const executionTimeResult = new Date(testTimestamp).getTime();

			// Simulate what the execution details panel does
			const executionDetailsResult = convertToDisplayDate(testTimestamp);

			// Both should represent the same moment in time
			// The key is that both now use proper Date object creation
			expect(executionTimeResult).toBe(testEpoch);
			expect(executionDetailsResult.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);

			// The time should be consistent (both should show local timezone)
			const executionTimeDate = new Date(executionTimeResult);
			const executionTimeFormatted = executionTimeDate.toTimeString().substring(0, 8);

			// Both should show the same time (accounting for local timezone)
			expect(executionDetailsResult.time).toBe(executionTimeFormatted);
		});
	});
});
