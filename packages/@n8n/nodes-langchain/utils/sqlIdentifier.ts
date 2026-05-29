import pg from 'pg';

/**
 * Matches a plain, unquoted SQL identifier: a leading letter or underscore
 * followed by letters, digits, underscores or dollar signs. Values that match
 * this pattern are safe to interpolate into SQL both quoted and unquoted.
 */
const SAFE_SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;

/**
 * Quotes a single SQL identifier so it can be safely interpolated into a
 * statement. Wraps the value in double quotes and doubles any embedded quotes.
 */
export function escapeSqlIdentifier(name: string): string {
	return pg.escapeIdentifier(name);
}

/**
 * Quotes a possibly schema-qualified identifier (`schema.table`) by escaping
 * each dot-separated part independently. This preserves schema qualification
 * while ensuring every segment is safely quoted.
 */
export function escapeQualifiedSqlIdentifier(name: string): string {
	return name.split('.').map(escapeSqlIdentifier).join('.');
}

/**
 * Returns true when the value is a plain SQL identifier that requires no
 * quoting and is safe to interpolate verbatim.
 */
export function isSafeSqlIdentifier(name: string): boolean {
	return SAFE_SQL_IDENTIFIER.test(name);
}

/**
 * Returns true when the value is a plain identifier or a schema-qualified
 * identifier (`schema.table`) where every dot-separated part is itself a plain
 * identifier. Non-string, empty values and empty segments are rejected.
 */
export function isSafeQualifiedSqlIdentifier(name: unknown): boolean {
	return typeof name === 'string' && name.split('.').every(isSafeSqlIdentifier);
}
