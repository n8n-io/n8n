/**
 * Exponential backoff for a 1-based attempt, ramping from `minMs` and capped at `maxMs`.
 *
 * The ceiling is clamped to never fall below the floor, so a misconfiguration
 * (`maxMs < minMs`) degrades to a constant `minMs` delay rather than silently
 * collapsing every retry onto the smaller max value (which would defeat the floor).
 */
export function computeBackoff(attempt: number, minMs: number, maxMs: number): number {
	const ceiling = Math.max(minMs, maxMs);
	return Math.min(minMs * 2 ** (attempt - 1), ceiling);
}
