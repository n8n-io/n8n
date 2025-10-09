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

/**
 * Generates a SQL Common Table Expression (CTE) query that provides three date boundaries for insights queries
 *
 * Behavior:
 * - If startDate and endDate are the same and today
 *   - returns the last 24 hours: prev_start_date (2 days ago), start_date (1 day ago), end_date (now).
 * - Otherwise:
 *   - prev_start_date: start of the day before the range
 *   - start_date: start of the current range
 *   - end_date: "now" if endDate is today, else start of the day after endDate
 *
 * The SQL CTE can be joined with the insights table for filtering/aggregation.
 *
 * @param dbType - The database type ('sqlite', 'postgresdb', 'mysqldb', 'mariadb')
 * @param startDate - The start date of the range (inclusive)
 * @param endDate - The end date of the range (inclusive, or "now" if today)
 * @returns SQL CTE query with `prev_start_date`, `start_date`, and `end_date` columns
 * - `prev_start_date`: The start of the previous period (used for comparison)
 * - `start_date`: The start of the current period (inclusive)
 * - `end_date`: The end of the current period (exclusive)
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

	const daysFromEndDateToToday = Math.floor(today.diff(endDateStartOfDay, 'days').days);
	const daysDiff = Math.floor(endDateStartOfDay.diff(startDateStartOfDay, 'days').days);

	const isEndDateToday = daysFromEndDateToToday === 0;

	let prevStartDateSql: string;
	let startDateSql: string;
	let endDateSql: string;

	if (daysDiff === 0 && isEndDateToday) {
		// Last 24 hours
		prevStartDateSql = getDatetimeSql({ dbType, daysFromToday: 2, useStartOfDay: false });
		startDateSql = getDatetimeSql({ dbType, daysFromToday: 1, useStartOfDay: false });
		endDateSql = getDatetimeSql({ dbType, daysFromToday: 0, useStartOfDay: false });
	} else {
		// Calculate the date range (minimum 1 day) for previous period
		const dateRangeInDays = Math.max(1, daysDiff);
		const daysFromStartDateToToday = Math.floor(today.diff(startDateStartOfDay, 'days').days);
		const prevStartDaysFromToday = daysFromStartDateToToday + dateRangeInDays;

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

		endDateSql = isEndDateToday
			? getDatetimeSql({ dbType, daysFromToday: 0, useStartOfDay: false })
			: getDatetimeSql({ dbType, daysFromToday: daysFromEndDateToToday - 1, useStartOfDay: true });
	}

	return sql`SELECT
			${prevStartDateSql} AS prev_start_date,
			${startDateSql} AS start_date,
			${endDateSql} AS end_date
	`;
};
