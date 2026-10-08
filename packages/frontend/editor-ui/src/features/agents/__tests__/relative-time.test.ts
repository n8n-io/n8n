import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	formatChatDividerTimestamp,
	formatChatTime,
	formatRelativeTimestamp,
} from '../utils/relative-time';

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

const dividerI18n = {
	today: (time: string) => `Today at ${time}`,
	yesterday: (time: string) => `Yesterday at ${time}`,
	date: (date: string, time: string) => `${date} at ${time}`,
};

describe('formatChatTime', () => {
	it.each([
		{ time: [6, 42], expected: '06:42' },
		{ time: [0, 0], expected: '00:00' },
		{ time: [12, 5], expected: '12:05' },
		{ time: [18, 5], expected: '18:05' },
		{ time: [23, 59], expected: '23:59' },
	])('gives a 24-hour time without AM or PM in en-GB: $expected', ({ time, expected }) => {
		expect(formatChatTime(new Date(2026, 3, 26, time[0], time[1]), 'en-GB')).toBe(expected);
	});

	it.each([
		{ time: [6, 42], expected: /^6:42\sAM$/u },
		{ time: [0, 0], expected: /^12:00\sAM$/u },
		{ time: [12, 5], expected: /^12:05\sPM$/u },
		{ time: [18, 5], expected: /^6:05\sPM$/u },
	])('gives a 12-hour time with AM or PM in en-US: $expected', ({ time, expected }) => {
		expect(formatChatTime(new Date(2026, 3, 26, time[0], time[1]), 'en-US')).toMatch(expected);
	});

	const timeOfDay = fc.record({
		hours: fc.integer({ min: 0, max: 23 }),
		minutes: fc.integer({ min: 0, max: 59 }),
	});
	const pad = (value: number) => String(value).padStart(2, '0');

	it('gives the same hours and minutes in en-GB for any time of day', () => {
		fc.assert(
			fc.property(timeOfDay, ({ hours, minutes }) => {
				const time = formatChatTime(new Date(2026, 3, 26, hours, minutes), 'en-GB');
				expect(time).toBe(`${pad(hours)}:${pad(minutes)}`);
			}),
		);
	});

	it('gives the 12-hour clock in en-US for any time of day', () => {
		fc.assert(
			fc.property(timeOfDay, ({ hours, minutes }) => {
				const time = formatChatTime(new Date(2026, 3, 26, hours, minutes), 'en-US');
				const hour12 = hours % 12 === 0 ? 12 : hours % 12;
				const period = hours < 12 ? 'AM' : 'PM';
				expect(time).toMatch(new RegExp(`^${hour12}:${pad(minutes)}\\s${period}$`, 'u'));
			}),
		);
	});
});

describe('formatChatDividerTimestamp', () => {
	it('returns "Today at {time}" in the 24-hour clock for en-GB', () => {
		const today = new Date('2026-04-26T06:42:00');
		expect(formatChatDividerTimestamp(today, dividerI18n, NOW, 'en-GB')).toBe('Today at 06:42');
	});

	it('returns "Today at {time}" in the 12-hour clock for en-US', () => {
		const today = new Date('2026-04-26T06:42:00');
		expect(formatChatDividerTimestamp(today, dividerI18n, NOW, 'en-US')).toMatch(
			/^Today at 6:42\sAM$/u,
		);
	});

	it('returns "Yesterday at {time}" for a timestamp on the previous local day', () => {
		const yesterday = new Date('2026-04-25T23:59:00');
		expect(formatChatDividerTimestamp(yesterday, dividerI18n, NOW, 'en-GB')).toBe(
			'Yesterday at 23:59',
		);
	});

	it('returns the date in the order of the locale for an older timestamp', () => {
		const older = new Date('2026-04-20T10:20:00');
		expect(formatChatDividerTimestamp(older, dividerI18n, NOW, 'en-GB')).toBe(
			'Mon 20 Apr at 10:20',
		);
		expect(formatChatDividerTimestamp(older, dividerI18n, NOW, 'en-US')).toMatch(
			/^Mon, Apr 20 at 10:20\sAM$/u,
		);
	});

	it('returns a date, not "Yesterday", two days back across midnight', () => {
		const twoDaysBack = new Date('2026-04-24T23:59:00');
		expect(formatChatDividerTimestamp(twoDaysBack, dividerI18n, NOW, 'en-GB')).toBe(
			'Fri 24 Apr at 23:59',
		);
	});

	it("uses the browser's locale when no locale is given", () => {
		const today = new Date('2026-04-26T10:20:00');
		const browserTime = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(today);

		expect(formatChatDividerTimestamp(today, dividerI18n, NOW)).toBe(`Today at ${browserTime}`);
	});
});
