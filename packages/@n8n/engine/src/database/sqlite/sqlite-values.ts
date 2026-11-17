/**
 * How the SQLite driver stores a `Date`: `YYYY-MM-DD HH:MM:SS.SSS` in UTC, the
 * same text `CURRENT_TIMESTAMP` produces (to the second), so the strings
 * compare in time order.
 */
export function toSqliteDatetime(value: Date | string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	return date.toISOString().replace('T', ' ').replace('Z', '');
}

/** The reverse: a stored timestamp (or `null`) back to a `Date`. */
export function fromSqliteDatetime(value: string | Date | null | undefined): Date | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value;
	return new Date(`${value.replace(' ', 'T')}Z`);
}

/** A JSON column as a raw query returns it: still text, or already parsed. */
export function fromSqliteJson<T>(value: string | T | null): T | null {
	if (value === null || value === undefined) return null;
	return typeof value === 'string' ? (JSON.parse(value) as T) : value;
}

export function toSqliteJson(value: unknown): string | null {
	return value === null || value === undefined ? null : JSON.stringify(value);
}
