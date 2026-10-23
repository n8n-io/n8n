import type { DatabaseConfig } from '@n8n/config';
import { DateTime } from 'luxon';

import {
	getDateRangesCommonTableExpressionQuery,
	getDateRangesSelectQuery,
} from '../insights-by-period-query.helper';

describe('getDateRangesCommonTableExpressionQuery', () => {
	const now = DateTime.utc(2025, 10, 8, 8, 51, 27);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now.toJSDate());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe.each<[DatabaseConfig['type'], string]>([
		['sqlite', 'SQLite'],
		['postgresdb', 'PostgreSQL'],
	])('%s', (dbType) => {
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

		describe('timezone-aware date ranges (LIGO-808)', () => {
			test('floors a past custom range to the caller timezone day boundaries (Europe/Berlin, UTC+2)', () => {
				// Frontend sends the exact UTC instants for local start-/end-of-day in Berlin.
				// Local Jun 24 00:00 Berlin === 2026-06-23T22:00:00.000Z
				// Local Jun 26 23:59:59.999 Berlin === 2026-06-26T21:59:59.999Z
				const startDate = new Date('2026-06-23T22:00:00.000Z');
				const endDate = new Date('2026-06-26T21:59:59.999Z');

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
					timeZone: 'Europe/Berlin',
					now: DateTime.utc(2026, 6, 27, 10, 0, 0),
				});

				// Boundaries must be the Berlin-local day edges, not the UTC-floored
				// 2026-06-23T00:00:00.000Z start that would sum in Jun 23's executions.
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: DateTime.utc(2026, 6, 20, 22, 0, 0),
					startDateTime: DateTime.utc(2026, 6, 23, 22, 0, 0),
					endDateTime: DateTime.utc(2026, 6, 26, 22, 0, 0),
				});
				expect(result).toBe(expected);
			});

			test('floors a past custom range to the caller timezone day boundaries (America/Los_Angeles, UTC-7)', () => {
				// Local Jun 24 00:00 LA === 2026-06-24T07:00:00.000Z
				// Local Jun 26 23:59:59.999 LA === 2026-06-27T06:59:59.999Z
				const startDate = new Date('2026-06-24T07:00:00.000Z');
				const endDate = new Date('2026-06-27T06:59:59.999Z');

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
					timeZone: 'America/Los_Angeles',
					now: DateTime.utc(2026, 6, 27, 10, 0, 0),
				});

				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: DateTime.utc(2026, 6, 21, 7, 0, 0),
					startDateTime: DateTime.utc(2026, 6, 24, 7, 0, 0),
					endDateTime: DateTime.utc(2026, 6, 27, 7, 0, 0),
				});
				expect(result).toBe(expected);
			});

			test('treats a range ending yesterday in the caller timezone as a past range near UTC midnight', () => {
				// now is 23:30 UTC Jun 27, which is already 01:30 Jun 28 in Berlin.
				// The user asks for a range ending end-of-day Jun 27 Berlin (their "yesterday").
				// Local Jun 25 00:00 Berlin === 2026-06-24T22:00:00.000Z
				// Local Jun 27 23:59:59.999 Berlin === 2026-06-27T21:59:59.999Z
				const startDate = new Date('2026-06-24T22:00:00.000Z');
				const endDate = new Date('2026-06-27T21:59:59.999Z');

				const result = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
					timeZone: 'Europe/Berlin',
					now: DateTime.utc(2026, 6, 27, 23, 30, 0),
				});

				// Past-range branch: the end boundary extends to the start of the next
				// Berlin day (2026-06-27T22:00:00.000Z), covering all of Jun 27 local.
				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: DateTime.utc(2026, 6, 21, 22, 0, 0),
					startDateTime: DateTime.utc(2026, 6, 24, 22, 0, 0),
					endDateTime: DateTime.utc(2026, 6, 27, 22, 0, 0),
				});
				expect(result).toBe(expected);

				// A UTC-based isEndDateToday check would wrongly treat this as "today"
				// (both 21:59:59.999Z and 23:30:00Z are Jun 27 in UTC) and leave the end
				// boundary truncated at 21:59:59.999 instead of extending it.
				expect(result).not.toContain('2026-06-27 21:59:59.999');
			});

			test('defaults to UTC and matches the pre-timezone behavior when no timeZone is passed', () => {
				const now = DateTime.utc(2025, 10, 8, 8, 51, 27);
				const startDate = now.minus({ days: 2 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const withoutTimeZone = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
					now,
				});
				const withUtcTimeZone = getDateRangesCommonTableExpressionQuery({
					startDate,
					endDate,
					dbType,
					timeZone: 'utc',
					now,
				});

				const expected = getDateRangesSelectQuery({
					dbType,
					prevStartDateTime: now.minus({ days: 4 }).startOf('day'),
					startDateTime: now.minus({ days: 2 }).startOf('day'),
					endDateTime: now.startOf('day'),
				});

				expect(withoutTimeZone).toBe(expected);
				expect(withUtcTimeZone).toBe(expected);
				expect(withoutTimeZone).toBe(withUtcTimeZone);
			});
		});
	});
});
