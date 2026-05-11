import type { DatabaseConfig } from '@n8n/config';
import { sql } from '@n8n/db';
import { DateTime } from 'luxon';

/**
 * Generates a SQL Common Table Expression (CTE) query that provides three date boundaries for insights queries
 *
 * Behavior:
 * - If the end date is today and the start date is also today, start date is set to the start of the day to take today's data.
 * - If the end date is in the past, both start and end dates are set to the start of their respective days, to take full days.
 *
 * The SQL CTE can be joined with the insights table for filtering/aggregation.
 *
 * @param startDate - The start date of the range (inclusive)
 * @param endDate - The end date of the range (inclusive, or "now" if today)
 * @param dbType - The database type (postgresdb or sqlite)
 * @returns SQL CTE query with `prev_start_date`, `start_date`, and `end_date` columns
 * - `prev_start_date`: The start of the previous period (used for comparison)
 * - `start_date`: The start of the current period (inclusive)
 * - `end_date`: The end of the current period (exclusive)
 */
export const getDateRangesCommonTableExpressionQuery = ({
	startDate,
	endDate,
	dbType,
}: {
	startDate: Date;
	endDate: Date;
	dbType: DatabaseConfig['type'];
}) => {
	let startDateTime = DateTime.fromJSDate(startDate).toUTC();
	let endDateTime = DateTime.fromJSDate(endDate).toUTC();

	const today = DateTime.now().toUTC();
	const isEndDateToday = endDateTime.hasSame(today, 'day');

	// Past range, take full days
	if (!isEndDateToday) {
		startDateTime = startDateTime.startOf('day');
		endDateTime = endDateTime.plus({ days: 1 }).startOf('day');
	}

	// Today range, take all day data starting from the beginning of the day
	if (isEndDateToday && startDateTime.hasSame(endDateTime, 'day')) {
		startDateTime = startDateTime.startOf('day');
	}

	const prevStartDateTime = startDateTime.minus(endDateTime.diff(startDateTime));

	return getDateRangesSelectQuery({ dbType, prevStartDateTime, startDateTime, endDateTime });
};

export function getDateRangesSelectQuery({
	dbType,
	prevStartDateTime,
	startDateTime,
	endDateTime,
}: {
	dbType: DatabaseConfig['type'];
	prevStartDateTime: DateTime;
	startDateTime: DateTime;
	endDateTime: DateTime;
}) {
	const prevStartStr = prevStartDateTime.toSQL({ includeZone: false, includeOffset: false });
	const startStr = startDateTime.toSQL({ includeZone: false, includeOffset: false });
	const endStr = endDateTime.toSQL({ includeZone: false, includeOffset: false });

	// Database-specific timestamp casting
	// PostgreSQL requires explicit CAST or :: syntax for timestamp comparisons
	// SQLite can work with string literals in comparisons
	if (dbType === 'postgresdb') {
		return sql`SELECT
			CAST('${prevStartStr}' AS TIMESTAMP) AS prev_start_date,
			CAST('${startStr}' AS TIMESTAMP) AS start_date,
			CAST('${endStr}' AS TIMESTAMP) AS end_date
		`;
	}

	return sql`SELECT
			'${prevStartStr}' AS prev_start_date,
			'${startStr}' AS start_date,
			'${endStr}' AS end_date
	`;
}
