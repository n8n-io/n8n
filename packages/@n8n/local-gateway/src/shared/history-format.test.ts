import { formatMinutesSaved, formatRelativeTime, statusPresentation } from './history-format';
import type { DesktopAssistantHistoryEntry } from './types';

type ExecutionStatus = DesktopAssistantHistoryEntry['status'];

describe('statusPresentation', () => {
	it('maps success to a green check', () => {
		expect(statusPresentation('success')).toEqual({
			kind: 'done',
			icon: 'check',
			colorVar: 'var(--da-green)',
		});
	});

	it.each<ExecutionStatus>(['running', 'new', 'waiting'])(
		'maps in-flight status %s to an amber spinner',
		(status) => {
			expect(statusPresentation(status)).toMatchObject({ kind: 'running', icon: 'spinner' });
		},
	);

	it.each<ExecutionStatus>(['error', 'crashed', 'canceled'])(
		'maps failure status %s to a red warning',
		(status) => {
			expect(statusPresentation(status)).toMatchObject({
				kind: 'failed',
				icon: 'triangle-alert',
				colorVar: 'var(--da-red)',
			});
		},
	);

	it('treats unknown as its own non-failed kind so it gets no Fix affordance', () => {
		expect(statusPresentation('unknown')).toMatchObject({ kind: 'unknown' });
	});
});

describe('formatRelativeTime', () => {
	const now = new Date('2026-06-10T12:00:00.000Z').getTime();

	it('returns an empty string for null or invalid input', () => {
		expect(formatRelativeTime(null, now)).toBe('');
		expect(formatRelativeTime('not-a-date', now)).toBe('');
	});

	it('shows "just now" under a minute', () => {
		expect(formatRelativeTime('2026-06-10T11:59:30.000Z', now)).toBe('just now');
	});

	it('singularizes one and pluralizes many', () => {
		expect(formatRelativeTime('2026-06-10T11:59:00.000Z', now)).toBe('1 minute ago');
		expect(formatRelativeTime('2026-06-10T11:30:00.000Z', now)).toBe('30 minutes ago');
		expect(formatRelativeTime('2026-06-10T11:00:00.000Z', now)).toBe('1 hour ago');
		expect(formatRelativeTime('2026-06-10T10:00:00.000Z', now)).toBe('2 hours ago');
		expect(formatRelativeTime('2026-06-09T12:00:00.000Z', now)).toBe('1 day ago');
		expect(formatRelativeTime('2026-06-08T12:00:00.000Z', now)).toBe('2 days ago');
	});

	it('clamps future timestamps to "just now" rather than negative values', () => {
		expect(formatRelativeTime('2026-06-10T12:05:00.000Z', now)).toBe('just now');
	});
});

describe('formatMinutesSaved', () => {
	it('renders a motivational dash for zero, negative, or non-finite input', () => {
		expect(formatMinutesSaved(0)).toBe('--');
		expect(formatMinutesSaved(-5)).toBe('--');
		expect(formatMinutesSaved(Number.NaN)).toBe('--');
	});

	it('renders minutes under an hour', () => {
		expect(formatMinutesSaved(45)).toBe('45m');
	});

	it('renders hours and minutes, omitting a zero minutes part', () => {
		expect(formatMinutesSaved(73)).toBe('1h 13m');
		expect(formatMinutesSaved(120)).toBe('2h');
	});
});
