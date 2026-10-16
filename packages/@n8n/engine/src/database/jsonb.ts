/**
 * Serializes a value for a `jsonb` parameter. `pg` would send a JS array as a
 * Postgres array literal, so every `jsonb` value goes through here.
 */
export function toJsonb(value: unknown): string | null {
	return value === null || value === undefined ? null : JSON.stringify(value);
}
