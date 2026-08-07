/**
 * Relative-time anchors injected into mock-generation LLM prompts.
 *
 * Mock data commonly flows into workflows that compare timestamps against the
 * real execution clock (`$now`, `Date.now()`); values from LLM training data
 * (months in the past) get silently filtered out and scenarios fail. Every
 * prompt that produces dates — data hints, pin data, HTTP mocks — must
 * include these anchors and derive all temporal values from them.
 */

/**
 * Renders a stable block of relative-time anchors (today, yesterday,
 * 7 days ago, etc.) the model integrates as data rather than a rule.
 */
export function buildDateAnchors(now: Date): string {
	const labels: Array<[string, number]> = [
		['today', 0],
		['yesterday', -1],
		['7 days ago', -7],
		['14 days ago', -14],
		['30 days ago', -30],
		['1 day from now', 1],
		['7 days from now', 7],
	];
	const lines = labels.map(([label, dayOffset]) => {
		const d = new Date(now);
		d.setUTCDate(d.getUTCDate() + dayOffset);
		const isoDate = d.toISOString().slice(0, 10);
		return label === 'today'
			? `- ${label}: ${isoDate} (full timestamp ${now.toISOString()})`
			: `- ${label}: ${isoDate}`;
	});
	return lines.join('\n');
}
