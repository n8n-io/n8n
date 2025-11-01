import type { DatabaseConfig } from '@n8n/config';
import { DateTime } from 'luxon';

import { getDateRangesCommonTableExpressionQuery } from '../insights-by-period-query.helper';

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

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-2 days', 'start of day')"); // prev_start_date
					expect(result).toContain("datetime('now', '-1 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '2 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '1 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 2 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 1 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('7 days ago (specific day)', () => {
				const startDate = now.minus({ days: 7 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 7 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-8 days', 'start of day')"); // prev_start_date
					expect(result).toContain("datetime('now', '-7 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', '-6 days', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '8 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '7 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '6 days')"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 8 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 7 DAY))'); // start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 6 DAY))'); // end_date
				}
			});

			test('14 days ago (specific day)', () => {
				const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 14 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-15 days', 'start of day')"); // prev_start_date
					expect(result).toContain("datetime('now', '-14 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', '-13 days', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '15 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '14 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '13 days')"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 15 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 14 DAY))'); // start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 13 DAY))'); // end_date
				}
			});

			test('X days ago (specific day far in the past)', () => {
				// 109 days ago (2025-06-21)
				const startDate = now.minus({ days: 109 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 109 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-110 days', 'start of day')"); // prev_start_date
					expect(result).toContain("datetime('now', '-109 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', '-108 days', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '110 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '109 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '108 days')"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 110 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 109 DAY))'); // start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 108 DAY))'); // end_date
				}
			});
		});

		describe('day periodicity (2-30 days)', () => {
			test('last 7 days (endDate is today)', () => {
				const startDate = now.minus({ days: 6 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-12 days', 'start of day')"); // prev_start_date (6 + 6)
					expect(result).toContain("datetime('now', '-6 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '12 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '6 days')"); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 12 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 6 DAY))'); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('last 14 days (endDate is today)', () => {
				const startDate = now.minus({ days: 13 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-26 days', 'start of day')"); // prev_start_date (13 + 13)
					expect(result).toContain("datetime('now', '-13 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '26 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '13 days')"); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 26 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 13 DAY))'); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('last 30 days (endDate is today)', () => {
				const startDate = now.minus({ days: 29 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-58 days', 'start of day')"); // prev_start_date (29 + 29)
					expect(result).toContain("datetime('now', '-29 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '58 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '29 days')"); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 58 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 29 DAY))'); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('2 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 2 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-3 days', 'start of day')"); // prev_start_date (2 + 1)
					expect(result).toContain("datetime('now', '-2 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '3 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '2 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 3 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 2 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('5 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 10 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 6 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-14 days', 'start of day')"); // prev_start_date (10 + 4)
					expect(result).toContain("datetime('now', '-10 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', '-5 days', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '14 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '10 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '5 days')"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 14 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 10 DAY))'); // start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 5 DAY))'); // end_date
				}
			});

			test('7 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 12 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 6 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-18 days', 'start of day')"); // prev_start_date (12 + 6)
					expect(result).toContain("datetime('now', '-12 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', '-5 days', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '18 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '12 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '5 days')"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 18 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 12 DAY))'); // start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 5 DAY))'); // end_date
				}
			});

			test('14 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 14 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-27 days', 'start of day')"); // prev_start_date (14 + 13)
					expect(result).toContain("datetime('now', '-14 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '27 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '14 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 27 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 14 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('30 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 30 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-59 days', 'start of day')"); // prev_start_date (30 + 29)
					expect(result).toContain("datetime('now', '-30 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '59 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '30 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 59 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 30 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});
		});

		describe('week periodicity (31+ days)', () => {
			test('last 90 days (endDate is today)', () => {
				const startDate = now.minus({ days: 89 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-178 days', 'start of day')"); // prev_start_date (89 + 89)
					expect(result).toContain("datetime('now', '-89 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '178 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '89 days')"); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 178 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 89 DAY))'); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('last 6 months (endDate is today)', () => {
				const startDate = now.minus({ months: 6 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				const daysBack = Math.floor(now.diff(DateTime.fromJSDate(startDate), 'days').days);
				const prevDaysBack = daysBack * 2;

				if (dbType === 'sqlite') {
					expect(result).toContain(`datetime('now', '-${prevDaysBack} days', 'start of day')`); // prev_start_date
					expect(result).toContain(`datetime('now', '-${daysBack} days', 'start of day')`); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${prevDaysBack} days')`); // prev_start_date
					expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${daysBack} days')`); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${prevDaysBack} DAY))`); // prev_start_date
					expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${daysBack} DAY))`); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('last year (endDate is today)', () => {
				const startDate = now.minus({ years: 1 }).startOf('day').toJSDate();
				const endDate = now.startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });
				const daysBack = Math.floor(now.diff(DateTime.fromJSDate(startDate), 'days').days);
				const prevDaysBack = daysBack * 2;

				if (dbType === 'sqlite') {
					expect(result).toContain(`datetime('now', '-${prevDaysBack} days', 'start of day')`); // prev_start_date
					expect(result).toContain(`datetime('now', '-${daysBack} days', 'start of day')`); // start_date
					expect(result).toContain("datetime('now')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${prevDaysBack} days')`); // prev_start_date
					expect(result).toContain(`DATE_TRUNC('day', NOW() - INTERVAL '${daysBack} days')`); // start_date
					expect(result).toContain('NOW()'); // end_date
				} else {
					expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${prevDaysBack} DAY))`); // prev_start_date
					expect(result).toContain(`DATE(DATE_SUB(NOW(), INTERVAL ${daysBack} DAY))`); // start_date
					expect(result).toContain('NOW()'); // end_date
				}
			});

			test('31 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 31 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-61 days', 'start of day')"); // prev_start_date (31 + 30)
					expect(result).toContain("datetime('now', '-31 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '61 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '31 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 61 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 31 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('90 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 90 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-179 days', 'start of day')"); // prev_start_date (90 + 89)
					expect(result).toContain("datetime('now', '-90 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '179 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '90 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 179 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 90 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('180 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 180 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-359 days', 'start of day')"); // prev_start_date (180 + 179)
					expect(result).toContain("datetime('now', '-180 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '359 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '180 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 359 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 180 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('360 days range (specific historical range)', () => {
				const startDate = now.minus({ days: 360 }).startOf('day').toJSDate();
				const endDate = now.minus({ days: 1 }).startOf('day').toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-719 days', 'start of day')"); // prev_start_date (360 + 359)
					expect(result).toContain("datetime('now', '-360 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '719 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '360 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 719 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 360 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});
		});

		describe('edge cases', () => {
			test('handles date with time component correctly', () => {
				// Date with time should be treated as start of day
				const startDate = DateTime.utc(2025, 10, 6, 14, 30, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 18, 45, 30).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				// Should calculate based on start of day values (2-day range)
				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-3 days', 'start of day')"); // prev_start_date (2 + 1)
					expect(result).toContain("datetime('now', '-2 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '3 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '2 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 3 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 2 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});

			test('handles same day with different times correctly (hour periodicity)', () => {
				const startDate = DateTime.utc(2025, 10, 7, 9, 0, 0).toJSDate();
				const endDate = DateTime.utc(2025, 10, 7, 17, 0, 0).toJSDate();

				const result = getDateRangesCommonTableExpressionQuery({ dbType, startDate, endDate });

				// Should treat as single day (yesterday) - hour periodicity
				if (dbType === 'sqlite') {
					expect(result).toContain("datetime('now', '-2 days', 'start of day')"); // prev_start_date (1 + 1)
					expect(result).toContain("datetime('now', '-1 days', 'start of day')"); // start_date
					expect(result).toContain("datetime('now', 'start of day')"); // end_date
				} else if (dbType === 'postgresdb') {
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '2 days')"); // prev_start_date
					expect(result).toContain("DATE_TRUNC('day', NOW() - INTERVAL '1 days')"); // start_date
					expect(result).toContain("DATE_TRUNC('day', NOW())"); // end_date
				} else {
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 2 DAY))'); // prev_start_date
					expect(result).toContain('DATE(DATE_SUB(NOW(), INTERVAL 1 DAY))'); // start_date
					expect(result).toContain('DATE(NOW())'); // end_date
				}
			});
		});
	});
});
