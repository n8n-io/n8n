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
 *
 * Each part is lower-cased first to mirror PostgreSQL's folding of unquoted
 * identifiers: these names were historically interpolated unquoted, so an
 * existing mixed-case config like `MyTable` keeps resolving to `mytable`
 * rather than a new, case-sensitive `"MyTable"`.
 */
export function escapeQualifiedSqlIdentifier(name: string): string {
	return name
		.split('.')
		.map((part) => escapeSqlIdentifier(part.toLowerCase()))
		.join('.');
}

/**
 * Returns true when the value is a plain SQL identifier that requires no
 * quoting and is safe to interpolate verbatim.
 */
export function isSafeSqlIdentifier(name: string): boolean {
	return SAFE_SQL_IDENTIFIER.test(name);
}

/**
 * Returns true when the value is either a plain identifier (`name`) or a
 * schema-qualified one (`schema.name`) — at most two dot-separated parts, each a
 * plain identifier. Non-strings, empty values, empty segments and anything with
 * more than two parts (e.g. `a.b.c`) are rejected, matching the documented
 * "plain name or optional schema. prefix" contract.
 */
export function isSafeQualifiedSqlIdentifier(name: unknown): boolean {
	if (typeof name !== 'string') return false;
	const parts = name.split('.');
	return parts.length <= 2 && parts.every(isSafeSqlIdentifier);
}

/**
 * Returns the first metadata-filter key that could break out of the
 * single-quoted SQL literal the store interpolates it into, or undefined when
 * every key is safe.
 */
export function findUnsafeMetadataFilterKey(
	filter: Record<string, unknown> | undefined,
): string | undefined {
	if (!filter) return undefined;
	return Object.keys(filter).find((key) => key.includes("'") || key.includes('\\'));
}
