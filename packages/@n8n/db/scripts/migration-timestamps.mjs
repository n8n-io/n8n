// @ts-check

/**
 * Picks a timestamp later than every existing migration: `now`, or `max + 1` while the head is in the future.
 *
 * @param {number[]} existing
 * @param {number} [now]
 * @returns {{ timestamp: number, source: string }}
 */
export function pickTimestamp(existing, now = Date.now()) {
	const max = existing.length === 0 ? 0 : Math.max(...existing);
	if (now > max) return { timestamp: now, source: 'Date.now()' };
	return {
		timestamp: max + 1,
		source: `max + 1 (existing head ${max} is in the future — see AGENTS.md)`,
	};
}
