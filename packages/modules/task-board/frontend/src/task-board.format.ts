const TOKEN_UNITS = [
	{ value: 1_000_000_000, suffix: 'B' },
	{ value: 1_000_000, suffix: 'M' },
	{ value: 1_000, suffix: 'k' },
];

/** The smallest price that shows as a number. A lower price shows as "<$0.0001". */
const MIN_COST = 0.0001;

/** A token count in compact form: 950, 1.2k, 12.4k, 3M. */
export function formatTokenCount(count: number): string {
	const tokens = Math.max(Math.round(count), 0);
	for (const [index, unit] of TOKEN_UNITS.entries()) {
		if (tokens < unit.value) continue;
		const scaled = Math.round((tokens / unit.value) * 10) / 10;
		// 999,950 rounds to "1000k". The next unit says it shorter.
		const larger = TOKEN_UNITS[index - 1];
		if (scaled >= 1000 && larger) return `1${larger.suffix}`;
		return `${scaled}${unit.suffix}`;
	}
	return String(tokens);
}

/**
 * A price in USD. A price of one cent or more has two decimals. A lower price keeps up to
 * four decimals, so that a small run does not read as "$0.00".
 */
export function formatCost(cost: number): string {
	if (cost <= 0) return '$0.00';
	if (cost < MIN_COST) return `<$${MIN_COST}`;
	if (cost < 0.01) return `$${Number(cost.toFixed(4))}`;
	return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
