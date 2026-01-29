import type { DatabaseConfig } from '@n8n/config';
import { DateTime } from 'luxon';

import {
	getDateRangesCommonTableExpressionQuery,
	getDateRangesSelectQuery,
} from '../insights-by-period-query.helper';

describe('getDateRangesCommonTableExpressionQuery', () => {
	const now = DateTime.utc(2025, 10, 8, 8, 51, 27);

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(now.toJSDate());
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe.each([
		['sqlite', 'SQLite'],
		['postgresdb', 'PostgreSQL'],
	])('%s', (dbType: DatabaseConfig['type']) => {
		describe('hour periodicity (1 day - startDate == endDate)', () => {
			test('last 24 hours (endDate is today)', () => {
				const startDate = now.minus({ days: 1 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// endDate is today but different day from startDate, so dates stay as-is
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: now.minus({ days: 2 }).startOf('day'),
					startDateTime: now.minus({ days: 1 }).startOf('day'),
					endDateTime: now.startOf('day'),
				});
				expect(result).toBe(expected);
			});

			test('day before yesterday (specific day)', () => {
				const startDate = now.minus({ days: 2 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// Past range: end+1 day startOf('day')
				// Duration = 2 days, so prev starts 2 days before start
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: now.minus({ days: 4 }).startOf('day'),
					startDateTime: now.minus({ days: 2 }).startOf('day'),
					endDateTime: now.startOf('day'),
				});
				expect(result).toBe(expected);
			});

			test('7 days ago (specific day)', () => {
				const startDate = now.minus({ days: 7 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 6 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// Past range: end+1 day startOf('day')
				// Duration = 2 days, so prev starts 2 days before start
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: now.minus({ days: 9 }).startOf('day'),
					startDateTime: now.minus({ days: 7 }).startOf('day'),
					endDateTime: now.minus({ days: 5 }).startOf('day'),
				});
				expect(result).toBe(expected);
			});

			test('14 days ago (specific day)', () => {
				const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 13 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// Past range: end+1 day startOf('day')
				// Duration = 2 days, so prev starts 2 days before start
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: now.minus({ days: 16 }).startOf('day'),
					startDateTime: now.minus({ days: 14 }).startOf('day'),
					endDateTime: now.minus({ days: 12 }).startOf('day'),
				});
				expect(result).toBe(expected);
			});

			test('X days ago (specific day far in the past)', () => {
				// 109 days ago (2025-06-21)
				const startDate = now.minus({ days: 109 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 108 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// Past range: end+1 day startOf('day')
				// Duration = 2 days, so prev starts 2 days before start
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: now.minus({ days: 111 }).startOf('day'),
					startDateTime: now.minus({ days: 109 }).startOf('day'),
					endDateTime: now.minus({ days: 107 }).startOf('day'),
				});
				expect(result).toBe(expected);
			});
		});

		describe('day periodicity (2-30 days)', () => {
			describe('last X days (endDate is today)', () => {
				test('last 7 days', () => {
					const startDate = now.minus({ days: 7 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// endDate is today but different day, dates stay as-is
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 14 }).startOf('day'),
						startDateTime: now.minus({ days: 7 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('last 14 days', () => {
					const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// endDate is today but different day, dates stay as-is
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 28 }).startOf('day'),
						startDateTime: now.minus({ days: 14 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('last 30 days', () => {
					const startDate = now.minus({ days: 30 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// endDate is today but different day, dates stay as-is
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 60 }).startOf('day'),
						startDateTime: now.minus({ days: 30 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});
			});

			describe('specific historical range', () => {
				test('2 day range', () => {
					const startDate = now.minus({ days: 3 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 3 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 6 }).startOf('day'),
						startDateTime: now.minus({ days: 3 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('5 days range', () => {
					const startDate = now.minus({ days: 10 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 5 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 6 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 16 }).startOf('day'),
						startDateTime: now.minus({ days: 10 }).startOf('day'),
						endDateTime: now.minus({ days: 4 }).startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('7 days range', () => {
					const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 7 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 8 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 22 }).startOf('day'),
						startDateTime: now.minus({ days: 14 }).startOf('day'),
						endDateTime: now.minus({ days: 6 }).startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('14 days range', () => {
					const startDate = now.minus({ days: 15 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 15 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 30 }).startOf('day'),
						startDateTime: now.minus({ days: 15 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('30 days range', () => {
					const startDate = now.minus({ days: 53 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 23 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 31 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 84 }).startOf('day'),
						startDateTime: now.minus({ days: 53 }).startOf('day'),
						endDateTime: now.minus({ days: 22 }).startOf('day'),
					});
					expect(result).toBe(expected);
				});
			});
		});

		describe('week periodicity (31+ days)', () => {
			describe('last X days (endDate is today)', () => {
				test('last 90 days', () => {
					const startDate = now.minus({ days: 90 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// endDate is today but different day, dates stay as-is
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 180 }).startOf('day'),
						startDateTime: now.minus({ days: 90 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('last 6 months', () => {
					const startDate = now.minus({ months: 6 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					const startDateTime = DateTime.fromJSDate(startDate).toUTC().startOf('day');
					const endDateTime = now.startOf('day');
					const duration = endDateTime.diff(startDateTime);

					// endDate is today but different day, dates stay as-is
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: startDateTime.minus(duration),
						startDateTime,
						endDateTime,
					});
					expect(result).toBe(expected);
				});

				test('last year', () => {
					const startDate = now.minus({ years: 1 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					const startDateTime = DateTime.fromJSDate(startDate).toUTC().startOf('day');
					const endDateTime = now.startOf('day');
					const duration = endDateTime.diff(startDateTime);

					// endDate is today but different day, dates stay as-is
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: startDateTime.minus(duration),
						startDateTime,
						endDateTime,
					});
					expect(result).toBe(expected);
				});
			});

			describe('specific historical range', () => {
				test('31 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 32 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 32 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 64 }).startOf('day'),
						startDateTime: now.minus({ days: 32 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('90 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 98 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 8 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 91 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 189 }).startOf('day'),
						startDateTime: now.minus({ days: 98 }).startOf('day'),
						endDateTime: now.minus({ days: 7 }).startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('180 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 181 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 181 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 362 }).startOf('day'),
						startDateTime: now.minus({ days: 181 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});

				test('360 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 361 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({
						startDate,
						endDate,
						dbType,
					});

					// Past range: end+1 day, duration = 361 days
					const expected = getDateRangesSelectQuery({
						dbType,
						prevStartDateTime: now.minus({ days: 722 }).startOf('day'),
						startDateTime: now.minus({ days: 361 }).startOf('day'),
						endDateTime: now.startOf('day'),
					});
					expect(result).toBe(expected);
				});
			});
		});

		describe('edge cases', () => {
			test('handles date with time component correctly', () => {
				// Oct 6 14:30 to Oct 7 18:45
				// Now is Oct 8 8:51:27, so Oct 7 18:45 is in the past
				const startDate = DateTime.utc(2025, 10, 6, 14, 30, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 18, 45, 30).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// Past range, take full days
				const startDateTime = DateTime.utc(2025, 10, 6, 14, 30, 0).startOf('day');
				const endDateTime = DateTime.utc(2025, 10, 7, 18, 45, 30).plus({ days: 1 }).startOf('day');
				const duration = endDateTime.diff(startDateTime);

				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: startDateTime.minus(duration),
					startDateTime,
					endDateTime,
				});
				expect(result).toBe(expected);
			});

			test('handles same day with different times correctly (hour periodicity)', () => {
				// Oct 7 9:00 to Oct 7 17:00 (same day)
				// Now is Oct 8 8:51:27
				const startDate = DateTime.utc(2025, 10, 7, 9, 0, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 17, 0, 0).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// Past range, take full days
				const startDateTime = DateTime.utc(2025, 10, 7, 9, 0, 0).startOf('day');
				const endDateTime = DateTime.utc(2025, 10, 7, 17, 0, 0).plus({ days: 1 }).startOf('day');
				const duration = endDateTime.diff(startDateTime);

				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: startDateTime.minus(duration),
					startDateTime,
					endDateTime,
				});
				expect(result).toBe(expected);
			});

			test('handle current day as both start and end date', () => {
				const startDate = now.toJSDate();
				const endDate = now.toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
				});

				// startDate and endDate are today, so start is startOf('day'), end is now
				const startDateTime = now.startOf('day');
				const endDateTime = now;
				const duration = endDateTime.diff(startDateTime);

				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: startDateTime.minus(duration),
					startDateTime,
					endDateTime,
				});
				expect(result).toBe(expected);
			});
		});
	});
});
