import { OTLP_PROTOCOLS, type OtlpProtocol } from './otel.constants';

export function isOtlpProtocol(value: unknown): value is OtlpProtocol {
	return OTLP_PROTOCOLS.some((protocol) => protocol === value);
}

/**
 * Locale-aware formatting and parsing for the traces sample rate (0..1).
 *
 * The parser inverts the formatter: the locale's digits are mapped back to
 * ASCII and its decimal separator is accepted alongside '.' and ',', so any
 * value the formatter renders (or a user types) parses back to the same number.
 */
export function createSampleRateFormat(locale?: string) {
	const formatter = new Intl.NumberFormat(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
	});
	const decimalSeparator =
		formatter.formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';
	const digitFormatter = new Intl.NumberFormat(locale);
	const asciiDigits = new Map(
		Array.from({ length: 10 }, (_, digit) => [digitFormatter.format(digit), String(digit)]),
	);

	/** Parse a rate in this locale; null when not a number (incl. empty). Clamps to [0, 1]. */
	function parse(text: string): number | null {
		// strip bidi control marks (LRM, RLM, ALM) some locales emit around numbers
		const trimmed = text.replace(/[\u200e\u200f\u061c]/gu, '').trim();
		if (!trimmed) return null;
		const normalized = [...trimmed]
			.map((char) => asciiDigits.get(char) ?? char)
			.join('')
			.replace(decimalSeparator, '.')
			.replace(',', '.');
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : null;
	}

	return {
		format: (value: number) => formatter.format(value),
		parse,
	};
}
