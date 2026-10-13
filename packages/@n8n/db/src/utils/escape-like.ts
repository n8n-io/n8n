/** SQL fragment declaring backslash as the `LIKE` escape character. */
export const LIKE_ESCAPE_CLAUSE = "ESCAPE '\\'";

/** Escape `LIKE` metacharacters (`\`, `%`, `_`) so the value matches literally. */
export function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, '\\$&');
}
