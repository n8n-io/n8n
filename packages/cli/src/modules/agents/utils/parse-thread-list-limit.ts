/** Clamps a query-string `limit` param to a sane page size, defaulting to 20. */
export function parseThreadListLimit(value: string | undefined): number {
	return Math.min(Math.max(Number(value) || 20, 1), 100);
}
