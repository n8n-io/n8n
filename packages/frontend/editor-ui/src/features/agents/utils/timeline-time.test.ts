import { describe, expect, it } from 'vitest';
import { formatTimelineTime } from './timeline-time';

describe('formatTimelineTime', () => {
	it('returns an empty string for a missing timestamp', () => {
		expect(formatTimelineTime(0)).toBe('');
	});

	it('formats a timestamp in local time with seconds', () => {
		const date = new Date(2026, 5, 10, 10, 42, 15);
		expect(formatTimelineTime(date.getTime())).toBe('10:42:15');
	});
});
