/**
 * Dialect-specific SQL for reading and writing the database clock. Coordination
 * across instances must use the DB clock, never an instance clock, so these are
 * the only time expressions the scheduler repositories embed in queries.
 *
 * Millisecond precision on both dialects (`CURRENT_TIMESTAMP(3)` / `%f`), so a
 * value read back compares consistently with one written.
 */

/**
 * @returns DB-clock `now`, per dialect.
 */
export function dbNowLiteral(isPostgres: boolean): string {
	return isPostgres ? 'CURRENT_TIMESTAMP(3)' : "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')";
}

/**
 * DB-clock `now` plus a millisecond offset, per dialect.
 * A negative `ms` gives an instant in the past (e.g. a retention cutoff).
 * `ms` is caller-computed (safe to inline).
 */
export function dbNowPlusMsLiteral(isPostgres: boolean, ms: number): string {
	const rounded = Math.round(ms);
	if (isPostgres) {
		return `CURRENT_TIMESTAMP(3) + (${rounded} || ' milliseconds')::interval`;
	}
	const seconds = rounded / 1000;
	return `STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '${seconds < 0 ? '' : '+'}${seconds} seconds')`;
}

/**
 * Parse a DB-clock value read back from a query.
 * Postgres returns a `Date`.
 * SQLite returns UTC wall-clock text with no zone.
 */
export function parseDbTime(value: Date | string): Date {
	return typeof value === 'string' ? new Date(`${value.replace(' ', 'T')}Z`) : value;
}
