import type { DatabaseConfig } from '@n8n/config';
import { DateTime } from 'luxon';

import { getDateRangesCommonTableExpressionQuery } from '../insights-by-period-query.helper';

function expectLastXDaysDateRangeQuery(params: {
	result: string;
	dbType: DatabaseConfig['type'];
	prevStartDateOffset: number;
	startDateOffset: number;
}) {
	const { result, dbType, prevStartDateOffset: prev, startDateOffset: start } = params;

	if (dbType === 'sqlite') {
		if (prev === 0) {
			expect(result).toContain("datetime('now') AS prev_start_date");
		} else {
			expect(result).toContain(`datetime('now', '-${prev} days') AS prev_start_date`);
		}
		if (start === 0) {
			expect(result).toContain("datetime('now') AS start_date");
		} else {
			expect(result).toContain(`datetime('now', '-${start} days') AS start_date`);
		}
		expect(result).toContain("datetime('now') AS end_date");
	} else if (dbType === 'postgresdb') {
		if (prev === 0) {
			expect(result).toContain('NOW() AS prev_start_date');
		} else {
			expect(result).toContain(`NOW() - INTERVAL '${prev} days' AS prev_start_date`);
		}
		if (start === 0) {
			expect(result).toContain('NOW() AS start_date');
		} else {
			expect(result).toContain(`NOW() - INTERVAL '${start} days' AS start_date`);
		}
		expect(result).toContain('NOW() AS end_date');
	} else {
		if (prev === 0) {
			expect(result).toContain('NOW() AS prev_start_date');
		} else {
			expect(result).toContain(`DATE_SUB(NOW(), INTERVAL ${prev} DAY) AS prev_start_date`);
		}
		if (start === 0) {
			expect(result).toContain('NOW() AS start_date');
		} else {
			expect(result).toContain(`DATE_SUB(NOW(), INTERVAL ${start} DAY) AS start_date`);
		}
		expect(result).toContain('NOW() AS end_date');
	}
}

function expectStartOfDayDateRangeQuery(params: {
	result: string;
	dbType: DatabaseConfig['type'];
	prevStartDateOffset: number;
	startDateOffset: number;
	endDateOffset: number;
}) {
	const {
		result,
		dbType,
		prevStartDateOffset: prev,
		startDateOffset: start,
		endDateOffset: end,
	} = params;

	if (dbType === 'sqlite') {
		expect(result).toContain(`datetime('now', '-${prev} days', 'start of day') AS prev_start_date`);
		expect(result).toContain(`datetime('now', '-${start} days', 'start of day') AS start_date`);
		expect(result).toContain(`datetime('now', '-${end} days', 'start of day') AS end_date`);
	} else if (dbType === 'postgresdb') {
		expect(result).toContain(
			`DATE_TRUNC('day', NOW() - INTERVAL '${prev} days') AS prev_start_date`,
		);
		expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${start} days') AS start_date`);
		expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${end} days') AS end_date`);
	} else {
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${prev} DAY)) AS prev_start_date`);
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${start} DAY)) AS start_date`);
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${end} DAY)) AS end_date`);
	}
}

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
		['mysqldb', 'MySQL'],
		['mariadb', 'MariaDB'],
	])('%s', (dbType: DatabaseConfig['type']) => {
		describe('hour periodicity (1 day - startDate == endDate)', () => {
			test('last 24 hours (endDate is today)', () => {
				const startDate = now.minus({ days: 1 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-2 days')"); // prev_start_date
					expect(result).toContain("datetime('now', '-1 days')"); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("NOW() - INTERVAL '2 days'"); // prev_start_date
					expect(result).toContain("NOW() - INTERVAL '1 days'"); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain('DATE_SUB(NOW(), INTERVAL 2 DAY)'); // prev_start_date
					expect(result).toContain('DATE_SUB(NOW(), INTERVAL 1 DAY)'); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('day before yesterday (specific day)', () => {
				const startDate = now.minus({ days: 2 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 3,
					startDateOffset: 2,
					endDateOffset: 1,
				});
			});

			test('7 days ago (specific day)', () => {
				const startDate = now.minus({ days: 7 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 6 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 8,
					startDateOffset: 7,
					endDateOffset: 6, // the end of the range is the start of the next day
				});
			});

			test('14 days ago (specific day)', () => {
				const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 13 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 15,
					startDateOffset: 14,
					endDateOffset: 13, // the end of the range is the start of the next day
				});
			});

			test('X days ago (specific day far in the past)', () => {
				// 109 days ago (2025-06-21)
				const startDate = now.minus({ days: 109 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 108 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 110,
					startDateOffset: 109,
					endDateOffset: 108,
				});
			});
		});

		describe('day periodicity (2-30 days)', () => {
			describe('last X days (endDate is today)', () => {
				test('last 7 days', () => {
					const startDate = now.minus({ days: 7 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 14, // 7 + 7
						startDateOffset: 7,
					});
				});

				test('last 14 days', () => {
					const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 28, // 14 + 14
						startDateOffset: 14,
					});
				});

				test('last 30 days', () => {
					const startDate = now.minus({ days: 30 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 60, // 30 + 30
						startDateOffset: 30,
					});
				});
			});

			describe('specific historical range', () => {
				test('2 day range', () => {
					const startDate = now.minus({ days: 3 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 5,
						startDateOffset: 3,
						endDateOffset: 1,
					});
				});

				test('5 days range', () => {
					const startDate = now.minus({ days: 10 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 5 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 15,
						startDateOffset: 10,
						endDateOffset: 5,
					});
				});

				test('7 days range', () => {
					const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 7 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 21,
						startDateOffset: 14,
						endDateOffset: 7,
					});
				});

				test('14 days range', () => {
					const startDate = now.minus({ days: 15 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 29,
						startDateOffset: 15,
						endDateOffset: 1,
					});
				});

				test('30 days range', () => {
					const startDate = now.minus({ days: 53 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 23 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 83,
						startDateOffset: 53,
						endDateOffset: 23,
					});
				});
			});
		});

		describe('week periodicity (31+ days)', () => {
			describe('last X days (endDate is today)', () => {
				test('last 90 days', () => {
					const startDate = now.minus({ days: 90 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 180,
						startDateOffset: 90,
					});
				});

				test('last 6 months', () => {
					const startDate = now.minus({ months: 6 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					const daysBack = Math.floor(now.diff(DateTime.fromJSDate(startDate), 'days').days);
					const prevDaysBack = daysBack * 2;
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: prevDaysBack,
						startDateOffset: daysBack,
					});
				});

				test('last year', () => {
					const startDate = now.minus({ years: 1 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					const daysBack = Math.floor(now.diff(DateTime.fromJSDate(startDate), 'days').days);
					const prevDaysBack = daysBack * 2;
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: prevDaysBack,
						startDateOffset: daysBack,
					});
				});
			});

			describe('specific historical range', () => {
				test('31 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 32 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 63,
						startDateOffset: 32,
						endDateOffset: 1,
					});
				});

				test('90 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 98 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 8 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 188,
						startDateOffset: 98,
						endDateOffset: 8,
					});
				});

				test('180 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 181 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 361,
						startDateOffset: 181,
						endDateOffset: 1,
					});
				});

				test('360 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 361 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 721,
						startDateOffset: 361,
						endDateOffset: 1,
					});
				});
			});
		});

		describe('edge cases', () => {
			test('handles date with time component correctly', () => {
				// Oct 6 14:30 to Oct 7 18:45
				// Now is Oct 8 8:51:27, so Oct 7 18:45 is less than 1 full day ago
				// Therefore useStartOfDay = false (not yet a full day in the past)
				// daysFromEndDateToToday = Math.round(0.58) = 1
				// daysDiff = Math.round(1.18) = 1
				// daysFromStartDateToToday = Math.floor(1.76) = 1
				// prevStartDaysFromToday = 1 + 1 = 2
				const startDate = DateTime.utc(2025, 10, 6, 14, 30, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 18, 45, 30).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				// Verify the actual output based on the calculation
				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-2 days') AS prev_start_date");
					expect(result).toContain("datetime('now', '-1 days') AS start_date");
					expect(result).toContain("datetime('now', '-1 days') AS end_date");
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("NOW() - INTERVAL '2 days' AS prev_start_date");
					expect(result).toContain("NOW() - INTERVAL '1 days' AS start_date");
					expect(result).toContain("NOW() - INTERVAL '1 days' AS end_date");
				} else {
					expect(result).toContain('DATE_SUB(NOW(), INTERVAL 2 DAY) AS prev_start_date');
					expect(result).toContain('DATE_SUB(NOW(), INTERVAL 1 DAY) AS start_date');
					expect(result).toContain('DATE_SUB(NOW(), INTERVAL 1 DAY) AS end_date');
				}
			});

			test('handles same day with different times correctly (hour periodicity)', () => {
				// Oct 7 9:00 to Oct 7 17:00 (same day)
				// Now is Oct 8 8:51:27, so Oct 7 17:00 is less than 1 full day ago
				// useStartOfDay = false
				// daysDiff = 0 (same day), daysFromEndDateToToday = 1 (rounded)
				// daysFromStartDateToToday = 0 (floored), prevStartDaysFromToday = 0 + 0 = 0
				const startDate = DateTime.utc(2025, 10, 7, 9, 0, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 17, 0, 0).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				// Verify the actual output based on the calculation
				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now') AS prev_start_date");
					expect(result).toContain("datetime('now') AS start_date");
					expect(result).toContain("datetime('now', '-1 days') AS end_date");
				} else if (dbType === 'postgresdb') {
					expect(result).toContain('NOW() AS prev_start_date');
					expect(result).toContain('NOW() AS start_date');
					expect(result).toContain("NOW() - INTERVAL '1 days' AS end_date");
				} else {
					expect(result).toContain('NOW() AS prev_start_date');
					expect(result).toContain('NOW() AS start_date');
					expect(result).toContain('DATE_SUB(NOW(), INTERVAL 1 DAY) AS end_date');
				}
			});

			test('handles daylight saving time transition correctly', () => {
				// Simulate DST transition: Oct 22 (GMT+0200) to Nov 5 (GMT+0100)
				// Same wall-clock time but different timezone offset
				// Oct 26 2025 is when DST ends in Europe (clocks go back 1 hour)
				const startDate = DateTime.fromObject(
					{ year: 2025, month: 10, day: 22, hour: 12, minute: 37, second: 56 },
					{ zone: 'Europe/Paris' },
				).toJSDate();
				const endDate = DateTime.fromObject(
					{ year: 2025, month: 11, day: 5, hour: 12, minute: 37, second: 56 },
					{ zone: 'Europe/Paris' },
				).toJSDate();

				// Mock current time to be Nov 5
				jest.setSystemTime(endDate);

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				// With DST normalization: Oct 22 to Nov 5 is 14 calendar days
				// The function detects same wall-clock time but different timezone offset
				// and normalizes to calculate correct calendar days
				expectLastXDaysDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 28, // 14 + 14
					startDateOffset: 14,
				});

				// Restore original mock time
				jest.setSystemTime(now.toJSDate());
			});
		});
	});
});
