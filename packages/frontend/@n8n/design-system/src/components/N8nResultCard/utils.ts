/** Card data is untrusted (LLM-authored); only absolute https URLs are ever rendered as links. */
export const isSafeHref = (href?: string): href is string =>
	typeof href === 'string' && href.startsWith('https://');

/** Cover photos are allow-listed to Unsplash so a card can never load an arbitrary tracking pixel. */
export const isSafeCoverSrc = (src?: string): src is string =>
	typeof src === 'string' && src.startsWith('https://images.unsplash.com/');

/** Parses a formatted number ("12", "1,204", "9,787.32", "-3") for the count-up; `null` for anything else. */
export function parseDisplayNumber(text: string): { value: number; decimals: number } | null {
	const cleaned = text.replace(/[\s,]/g, '');
	if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
	const decimals = cleaned.includes('.') ? cleaned.split('.')[1].length : 0;
	return { value: Number(cleaned), decimals };
}

export function formatDisplayNumber(value: number, decimals: number): string {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value);
}

/** Stagger delay in seconds for the i-th element of a group */
export const stagger = (index: number, start: number, step = 0.08): string =>
	`${(start + index * step).toFixed(2)}s`;
