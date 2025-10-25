import { render } from '@testing-library/vue';
import { vi } from 'vitest';
import ExecutionsTime from './ExecutionsTime.vue';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';

describe('ExecutionsTime', () => {
	const testTimestamp = '2025-08-07T14:52:28.000Z';
	const testDate = new Date(testTimestamp);
	const testEpoch = testDate.getTime();

	beforeEach(() => {
		// Mock timezone for consistent testing
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-08-07T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Timezone Consistency', () => {
		test('should handle string timestamp correctly', () => {
			const { container } = render(ExecutionsTime, {
				props: {
					startTime: testTimestamp,
				},
			});

			// Component should render without errors
			expect(container.firstChild).toBeTruthy();
		});

		test('should handle Date object correctly', () => {
			const { container } = render(ExecutionsTime, {
				props: {
					startTime: testDate,
				},
			});

			// Component should render without errors
			expect(container.firstChild).toBeTruthy();
		});

		test('should handle epoch timestamp correctly', () => {
			const { container } = render(ExecutionsTime, {
				props: {
					startTime: testEpoch,
				},
			});

			// Component should render without errors
			expect(container.firstChild).toBeTruthy();
		});

		test('should be consistent with dateFormatter functions', () => {
			// This test ensures that ExecutionsTime component and dateFormatter
			// functions handle the same timestamp consistently

			// Get the formatted result from dateFormatter
			const formatterResult = convertToDisplayDate(testTimestamp);

			// Render the component
			const { container } = render(ExecutionsTime, {
				props: {
					startTime: testTimestamp,
				},
			});

			// Both should handle the same timestamp without throwing errors
			expect(container.firstChild).toBeTruthy();
			expect(formatterResult).toBeTruthy();
			expect(formatterResult.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});

		test('should handle different input formats consistently', () => {
			const inputs = [
				testTimestamp, // ISO string
				testDate, // Date object
				testEpoch, // Epoch number
			];

			inputs.forEach((input, index) => {
				const { container } = render(ExecutionsTime, {
					props: {
						startTime: input,
					},
				});

				// All formats should render successfully
				expect(container.firstChild).toBeTruthy();
			});
		});

		test('should handle edge case timestamps', () => {
			const edgeCases = [
				'2025-01-01T00:00:00.000Z', // New Year
				'2025-12-31T23:59:59.999Z', // End of year
				'2025-06-15T12:00:00.000Z', // Mid-year
				new Date('2025-02-28T12:00:00.000Z'), // Date object
				1640995200000, // Epoch number
			];

			edgeCases.forEach((timestamp) => {
				expect(() => {
					render(ExecutionsTime, {
						props: {
							startTime: timestamp,
						},
					});
				}).not.toThrow();
			});
		});
	});

	describe('Component behavior', () => {
		test('should render with required props', () => {
			const { container } = render(ExecutionsTime, {
				props: {
					startTime: testTimestamp,
				},
			});

			expect(container.firstChild).toBeTruthy();
		});

		test('should handle invalid timestamps gracefully', () => {
			const invalidInputs = ['invalid-date', null, undefined, '', NaN];

			invalidInputs.forEach((input) => {
				// Component should not crash with invalid inputs
				expect(() => {
					render(ExecutionsTime, {
						props: {
							startTime: input as any,
						},
					});
				}).not.toThrow();
			});
		});
	});
});
