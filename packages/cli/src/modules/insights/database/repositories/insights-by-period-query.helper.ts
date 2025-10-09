import type { DatabaseConfig } from '@n8n/config';
import { sql } from '@n8n/db';
import { DateTime } from 'luxon';

/**
 * Generates database-specific SQL for a datetime value relative to now
 * @param dbType - The database type
 * @param daysFromToday - Number of days back from today (0 = now)
 * @param useStartOfDay - Whether to truncate to start of day (00:00:00)
 */
const getDatetimeSql = ({
	dbType,
	daysFromToday,
	useStartOfDay = false,
}: {
	dbType: DatabaseConfig['type'];
	daysFromToday: number;
	useStartOfDay?: boolean;
}): string => {
	// Handle "now" case
	if (daysFromToday === 0 && !useStartOfDay) {
		return dbType === 'sqlite' ? "datetime('now')" : 'NOW()';
	}

	// SQLite
	if (dbType === 'sqlite') {
		if (daysFromToday === 0 && useStartOfDay) {
			return "datetime('now', 'start of day')";
		}
		if (useStartOfDay) {
			return `datetime('now', '-${daysFromToday} days', 'start of day')`;
		}
		return `datetime('now', '-${daysFromToday} days')`;
	}

	// PostgreSQL
	if (dbType === 'postgresdb') {
		if (daysFromToday === 0 && useStartOfDay) {
			return "DATE_TRUNC('day', NOW())";
		}
		if (useStartOfDay) {
			return `DATE_TRUNC('day', NOW() - INTERVAL '${daysFromToday} days')`;
		}
		return `NOW() - INTERVAL '${daysFromToday} days'`;
	}

	// MySQL/MariaDB
	if (daysFromToday === 0 && useStartOfDay) {
		return 'DATE(NOW())';
	}
	if (useStartOfDay) {
		return `DATE(DATE_SUB(NOW(), INTERVAL ${daysFromToday} DAY))`;
	}
	return `DATE_SUB(NOW(), INTERVAL ${daysFromToday} DAY)`;
};

const getEndDatetimeSql = ({
	dbType,
	endDate,
}: {
	dbType: DatabaseConfig['type'];
	endDate: Date;
}) => {
	const endDateStartOfDay = DateTime.fromJSDate(endDate).startOf('day');
	const today = DateTime.now().startOf('day');
	const daysFromEndDateToToday = Math.floor(today.diff(endDateStartOfDay, 'days').days);

	const isEndDateToday = daysFromEndDateToToday === 0;

	if (isEndDateToday) {
		return getDatetimeSql({ dbType, daysFromToday: 0, useStartOfDay: false });
	}

	// We take the start of the day of the next day after endDate to make the end of the range exclusive,
	// ensuring that queries include all data up to the end of the specified endDate.
	return getDatetimeSql({ dbType, daysFromToday: daysFromEndDateToToday - 1, useStartOfDay: true });
};

/**
 * Generates a CTE query for date range filtering based on the insights-query-spec
 *
 * The logic handles three periodicity:
 * - Hour periodicity (1 day): when startDate == endDate
 * - Day periodicity (2-30 days): when range is 2-30 days
 * - Week periodicity (31+ days): when range is 31+ days
 *
 * It also distinguishes between:
 * - "Last X" queries: when endDate is today at 00:00:00 (uses NOW() as end)
 * - Specific range queries: historical date ranges (uses endDate + 1 day)
 *
 * @param dbType - The database type (sqlite, postgresdb, mysqldb, mariadb)
 * @param startDate - The start date of the range
 * @param endDate - The end date of the range
 */
export const getDateRangesCommonTableExpressionQuery = ({
	dbType,
	startDate,
	endDate,
}: {
	dbType: DatabaseConfig['type'];
	startDate: Date;
	endDate: Date;
}) => {
	const today = DateTime.now().startOf('day');
	const startDateStartOfDay = DateTime.fromJSDate(startDate).startOf('day');
	const endDateStartOfDay = DateTime.fromJSDate(endDate).startOf('day');

	const daysFromStartDateToToday = Math.floor(today.diff(startDateStartOfDay, 'days').days);
	const daysFromEndDateToToday = Math.floor(today.diff(endDateStartOfDay, 'days').days);
	const daysDiff = Math.floor(endDateStartOfDay.diff(startDateStartOfDay, 'days').days);

	const isEndDateToday = daysFromEndDateToToday === 0;

	// Calculate the date range (minimum 1 day) for previous period
	const dateRangeInDays = Math.max(1, daysDiff);
	const prevStartDaysFromToday = daysFromStartDateToToday + dateRangeInDays;

	let prevStartDateSql: string;
	let startDateSql: string;
	const endDateSql = getEndDatetimeSql({ dbType, endDate });

	// Hour periodicity (1 day - when startDate == endDate)
	if (daysDiff === 0) {
		if (isEndDateToday) {
			// Last 24 hours: prev_start = now - 48h, start = now - 24h, end = now
			prevStartDateSql = getDatetimeSql({ dbType, daysFromToday: 2, useStartOfDay: false });
			startDateSql = getDatetimeSql({ dbType, daysFromToday: 1, useStartOfDay: false });
		} else {
			// Specific day: prev_start = (day - 1) at 00:00:00, start = day at 00:00:00, end = day+1 at 00:00:00
			prevStartDateSql = getDatetimeSql({
				dbType,
				daysFromToday: prevStartDaysFromToday,
				useStartOfDay: true,
			});
			startDateSql = getDatetimeSql({
				dbType,
				daysFromToday: daysFromStartDateToToday,
				useStartOfDay: true,
			});
		}
	} else {
		// Day or Week periodicity (2+ days)
		prevStartDateSql = getDatetimeSql({
			dbType,
			daysFromToday: prevStartDaysFromToday,
			useStartOfDay: true,
		});
		startDateSql = getDatetimeSql({
			dbType,
			daysFromToday: daysFromStartDateToToday,
			useStartOfDay: true,
		});
	}

	return sql`SELECT
			${prevStartDateSql} AS prev_start_date,
			${startDateSql} AS start_date,
			${endDateSql} AS end_date
	`;
};
