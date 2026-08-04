import { describe, expect, it } from 'vitest';
import { formatRelativeTimestamp } from '../utils/relative-time';

const i18n = {
	justNow: 'just now',
	secondsAgo: (n: number) => `${n}s ago`,
	minutesAgo: (n: number) => `${n}m ago`,
	hoursAgo: (n: number) => `${n}h ago`,
	yesterday: 'Yesterday',
};

const NOW = new Date('2026-04-26T14:00:00');

function ago(ms: number): Date {
	return new Date(NOW.getTime() - ms);
}

describe('formatRelativeTimestamp', () => {
	it('returns "just now" within the first 5 seconds', () => {
		expect(formatRelativeTimestamp(ago(2_000), i18n, NOW)).toBe('just now');
	});

	it('returns Ns ago between 5s and 1 minute', () => {
		expect(formatRelativeTimestamp(ago(15_000), i18n, NOW)).toBe('15s ago');
	});

	it('returns Nm ago under an hour', () => {
		expect(formatRelativeTimestamp(ago(7 * 60_000), i18n, NOW)).toBe('7m ago');
	});

	it('returns Nh ago under a day', () => {
		expect(formatRelativeTimestamp(ago(3 * 60 * 60_000), i18n, NOW)).toBe('3h ago');
	});

	it('returns "Yesterday" for the previous calendar day', () => {
		const yesterday = new Date('2026-04-25T22:30:00');
		expect(formatRelativeTimestamp(yesterday, i18n, NOW)).toBe('Yesterday');
	});

	it('returns a short locale date for older timestamps', () => {
		const lastMonth = new Date('2026-03-15T10:00:00');
		const result = formatRelativeTimestamp(lastMonth, i18n, NOW);
		// Locale-dependent — just confirm it isn't a relative phrase or "Yesterday".
		expect(result).not.toBe('Yesterday');
		expect(result).not.toMatch(/ago$/);
	});

	it('clamps future timestamps to "just now" rather than rendering "in N"', () => {
		const future = new Date(NOW.getTime() + 60_000);
		expect(formatRelativeTimestamp(future, i18n, NOW)).toBe('just now');
	});
});
