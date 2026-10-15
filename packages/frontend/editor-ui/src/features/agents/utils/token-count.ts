/**
 * Locale is fixed to `en` so the suffixes stay K / M / B in every UI language.
 */
const compactTokenFormatter = new Intl.NumberFormat('en', {
	notation: 'compact',
	compactDisplay: 'short',
	maximumFractionDigits: 1,
});

/**
 * Formats a token count in a short form, for example 100, 1.3K, 2.4M, 1.9B.
 */
export function formatTokenCount(tokens: number): string {
	if (!Number.isFinite(tokens)) return String(tokens);
	return compactTokenFormatter.format(tokens);
}
