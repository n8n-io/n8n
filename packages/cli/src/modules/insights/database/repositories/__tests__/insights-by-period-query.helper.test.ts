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
		expect(result).toContain(`datetime('now', '-${prev} days', 'start of day') AS prev_start_date`);
		expect(result).toContain(`datetime('now', '-${start} days', 'start of day') AS start_date`);
		expect(result).toContain("datetime('now') AS end_date");
	} else if (dbType === 'postgresdb') {
		expect(result).toContain(
			`DATE_TRUNC('day', NOW() - INTERVAL '${prev} days') AS prev_start_date`,
		);
		expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${start} days') AS start_date`);
		expect(result).toContain('NOW() AS end_date');
	} else {
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${prev} DAY)) AS prev_start_date`);
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${start} DAY)) AS start_date`);
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
		if (end !== 0) {
			expect(result).toContain(`datetime('now', '-${end} days', 'start of day') AS end_date`);
		} else {
			expect(result).toContain("datetime('now', 'start of day') AS end_date");
		}
	} else if (dbType === 'postgresdb') {
		expect(result).toContain(
			`DATE_TRUNC('day', NOW() - INTERVAL '${prev} days') AS prev_start_date`,
		);
		expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${start} days') AS start_date`);
		if (end !== 0) {
			expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${end} days') AS end_date`);
		} else {
			expect(result).toContain("DATE_TRUNC('day', NOW()) AS end_date");
		}
	} else {
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${prev} DAY)) AS prev_start_date`);
		expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${start} DAY)) AS start_date`);
		if (end !== 0) {
			expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${end} DAY)) AS end_date`);
		} else {
			expect(result).toContain('DATE(NOW()) AS end_date');
		}
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
				const startDate = now.startOf('day').toJSDate();
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

			test('yesterday (specific day)', () => {
				const startDate = now.minus({ days: 1 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 2,
					startDateOffset: 1,
					endDateOffset: 0, // the end of the range is the start of the next day
				});
			});

			test('7 days ago (specific day)', () => {
				const startDate = now.minus({ days: 7 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 7 }).startOf('day').toJSDate();

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
				const endDate = now.minus({ days: 14 }).startOf('day').toJSDate();

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
				const endDate = now.minus({ days: 109 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 110,
					startDateOffset: 109,
					endDateOffset: 108, // the end of the range is the start of the next day
				});
			});
		});

		describe('day periodicity (2-30 days)', () => {
			describe('last X days (endDate is today)', () => {
				test('last 7 days', () => {
					const startDate = now.minus({ days: 6 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 13, // 6 + 7
						startDateOffset: 6, // today - 6 days ago = 7 days range
					});
				});

				test('last 14 days', () => {
					const startDate = now.minus({ days: 13 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 27, // 13 + 14
						startDateOffset: 13, // today - 13 days ago = 14 days range
					});
				});

				test('last 30 days', () => {
					const startDate = now.minus({ days: 29 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 59, // 29 + 30
						startDateOffset: 29, // today - 29 days ago = 30 days range
					});
				});
			});

			describe('specific historical range', () => {
				test('2 day range', () => {
					const startDate = now.minus({ days: 2 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 4, // 2 + 2
						startDateOffset: 2,
						endDateOffset: 0, // the end of the range is the start of the next day
					});
				});

				test('5 days range', () => {
					const startDate = now.minus({ days: 10 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 6 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 15, // 10 + 5
						startDateOffset: 10,
						endDateOffset: 5, // the end of the range is the start of the next day
					});
				});

				test('7 days range', () => {
					const startDate = now.minus({ days: 12 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 6 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 19, // 12 + 7
						startDateOffset: 12,
						endDateOffset: 5, // the end of the range is the start of the next day
					});
				});

				test('14 days range', () => {
					const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 28, // 14 + 14
						startDateOffset: 14,
						endDateOffset: 0, // the end of the range is the start of the next day
					});
				});

				test('30 days range', () => {
					const startDate = now.minus({ days: 52 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 23 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 82, // 52 + 30
						startDateOffset: 52,
						endDateOffset: 22, // the end of the range is the start of the next day
					});
				});
			});
		});

		describe('week periodicity (31+ days)', () => {
			describe('last X days (endDate is today)', () => {
				test('last 90 days', () => {
					const startDate = now.minus({ days: 89 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectLastXDaysDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 179, // 89 + 90
						startDateOffset: 89,
					});
				});

				test('last 6 months', () => {
					const startDate = now.minus({ months: 6 }).startOf('day').toJSDate();
					const endDate = now.startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					const daysBack = Math.floor(now.diff(DateTime.fromJSDate(startDate), 'days').days);
					const prevDaysBack = daysBack * 2 + 1;
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
					const prevDaysBack = daysBack * 2 + 1;
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
					const startDate = now.minus({ days: 31 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 62, // 31 + 31
						startDateOffset: 31,
						endDateOffset: 0, // the end of the range is the start of the next day
					});
				});

				test('90 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 97 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 8 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 187, // 97 + 90
						startDateOffset: 97,
						endDateOffset: 7, // the end of the range is the start of the next day
					});
				});

				test('180 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 180 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 360, // 180 + 180
						startDateOffset: 180,
						endDateOffset: 0, // the end of the range is the start of the next day
					});
				});

				test('360 days range (specific historical range)', () => {
					const startDate = now.minus({ days: 360 }).startOf('day').toJSDate();
					const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

					const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
					expectStartOfDayDateRangeQuery({
						result,
						dbType,
						prevStartDateOffset: 720, // 360 + 360
						startDateOffset: 360,
						endDateOffset: 0, // the end of the range is the start of the next day
					});
				});
			});
		});

		describe('edge cases', () => {
			test('handles date with time component correctly', () => {
				// Date with time should be treated as start of day
				const startDate = DateTime.utc(2025, 10, 6, 14, 30, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 18, 45, 30).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				// 2-day range
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 4, // 2 + 2
					startDateOffset: 2,
					endDateOffset: 0, // the end of the range is the start of the next day
				});
			});

			test('handles same day with different times correctly (hour periodicity)', () => {
				const startDate = DateTime.utc(2025, 10, 7, 9, 0, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 17, 0, 0).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				expectStartOfDayDateRangeQuery({
					result,
					dbType,
					prevStartDateOffset: 2, // 1 + 1
					startDateOffset: 1,
					endDateOffset: 0, // the end of the range is the start of the next day
				});
			});
		});
	});
});
