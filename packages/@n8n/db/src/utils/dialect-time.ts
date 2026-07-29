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
 * A column's value plus a millisecond offset, per dialect. Unlike
 * {@link dbNowPlusMsLiteral}, the base is a stored column, not DB-now, so a value
 * derived from another column isn't re-anchored to the current instant.
 * `ms` is caller-computed (safe to inline); `columnExpr` must already be a safe
 * SQL fragment (a quoted column name), never caller input.
 */
export function columnPlusMsLiteral(isPostgres: boolean, columnExpr: string, ms: number): string {
	const rounded = Math.round(ms);
	if (isPostgres) {
		return `${columnExpr} + (${rounded} || ' milliseconds')::interval`;
	}
	const seconds = rounded / 1000;
	return `STRFTIME('%Y-%m-%d %H:%M:%f', ${columnExpr}, '${seconds < 0 ? '' : '+'}${seconds} seconds')`;
}

/**
 * Whichever is later of a column's value or DB-clock `now`, plus a millisecond
 * offset, per dialect. Unlike {@link columnPlusMsLiteral}, a column value already
 * in the past doesn't drag the result into the past with it.
 * `ms` is caller-computed (safe to inline); `columnExpr` must already be a safe
 * SQL fragment (a quoted column name), never caller input.
 */
export function columnOrNowPlusMsLiteral(
	isPostgres: boolean,
	columnExpr: string,
	ms: number,
): string {
	const rounded = Math.round(ms);
	if (isPostgres) {
		return `GREATEST(${columnExpr}, CURRENT_TIMESTAMP(3)) + (${rounded} || ' milliseconds')::interval`;
	}
	const seconds = rounded / 1000;
	// SQLite's `%Y-%m-%d %H:%M:%f` is fixed-width and zero-padded, so a lexical MAX
	// on the formatted strings agrees with a chronological one.
	return `STRFTIME('%Y-%m-%d %H:%M:%f', MAX(${columnExpr}, ${dbNowLiteral(false)}), '${seconds < 0 ? '' : '+'}${seconds} seconds')`;
}

/**
 * Parse a DB-clock value read back from a query.
 * Postgres returns a `Date`.
 * SQLite returns UTC wall-clock text with no zone.
 */
export function parseDbTime(value: Date | string): Date {
	return typeof value === 'string' ? new Date(`${value.replace(' ', 'T')}Z`) : value;
}
