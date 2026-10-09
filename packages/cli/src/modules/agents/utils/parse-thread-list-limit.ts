/** Clamps a query-string `limit` param to a sane page size, defaulting to 20. */
export function parseThreadListLimit(value: string | undefined): number {
	// Truncate so a fractional limit (e.g. "1.5") does not reach SQL LIMIT.
	return Math.min(Math.max(Math.trunc(Number(value)) || 20, 1), 100);
}
