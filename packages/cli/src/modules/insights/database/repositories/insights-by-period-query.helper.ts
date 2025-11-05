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
	let today = DateTime.now();
	let startDateTime = DateTime.fromJSDate(startDate);
	let endDateTime = DateTime.fromJSDate(endDate);

	// If the end date is in a past day, use start of day for both dates
	const useStartOfDay = today.diff(endDateTime, 'days').days >= 1;

	if (useStartOfDay) {
		startDateTime = startDateTime.startOf('day');
		endDateTime = endDateTime.startOf('day');
		today = today.startOf('day');
	}

	// Check if times are exactly the same but timezone differs (DST transition case)
	const offsetDiff = Math.abs(startDateTime.offset - endDateTime.offset);

	// If same wall-clock time but different timezone offset (max 2 hours), normalize to same timezone
	if (
		startDateTime.hour === endDateTime.hour &&
		startDateTime.minute === endDateTime.minute &&
		startDateTime.second === endDateTime.second &&
		offsetDiff > 0 &&
		offsetDiff <= 120 // Max 2 hours difference in minutes
	) {
		// Change the startDateTime to so that time matches
		startDateTime = startDateTime.plus({ minutes: offsetDiff });
	}

	// Convert to UTC to avoid DST issues when calculating day differences
	const startDateTimeUTC = startDateTime.toUTC();
	const endDateTimeUTC = endDateTime.toUTC();
	const todayUTC = today.toUTC();

	const daysFromEndDateToToday = Math.round(todayUTC.diff(endDateTimeUTC, 'days').days);
	const daysDiff = Math.round(endDateTimeUTC.diff(startDateTimeUTC, 'days').days);

	const daysFromStartDateToToday = Math.floor(todayUTC.diff(startDateTimeUTC, 'days').days);
	const prevStartDaysFromToday = daysFromStartDateToToday + daysDiff;

	const prevStartDateSql = getDatetimeSql({
		dbType,
		daysFromToday: prevStartDaysFromToday,
		useStartOfDay,
	});

	const startDateSql = getDatetimeSql({
		dbType,
		daysFromToday: daysFromStartDateToToday,
		useStartOfDay,
	});

	const endDateSql = getDatetimeSql({
		dbType,
		daysFromToday: daysFromEndDateToToday,
		useStartOfDay,
	});

	return sql`SELECT
			${prevStartDateSql} AS prev_start_date,
			${startDateSql} AS start_date,
			${endDateSql} AS end_date
	`;
};
