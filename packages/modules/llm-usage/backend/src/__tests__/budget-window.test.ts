import type { LlmBudgetWindow } from '@n8n/api-types';

import { windowStart } from '../budget-window';

// A Wednesday, 01:30 UTC: still Tuesday evening in New York.
const now = new Date('2026-10-28T01:30:00.000Z');

describe('windowStart', () => {
	it.each([
		['rolling day: 24 hours back', { kind: 'rolling', unit: 'day' }, '2026-10-27T01:30:00.000Z'],
		['rolling month: 30 days back', { kind: 'rolling', unit: 'month' }, '2026-09-28T01:30:00.000Z'],
		[
			'calendar day: midnight in the instance timezone',
			{ kind: 'calendar', unit: 'day' },
			'2026-10-27T04:00:00.000Z',
		],
		[
			'calendar week: Monday in the instance timezone',
			{ kind: 'calendar', unit: 'week' },
			'2026-10-26T04:00:00.000Z',
		],
		[
			'calendar month in UTC',
			{ kind: 'calendar', unit: 'month', timezone: 'UTC' },
			'2026-10-01T00:00:00.000Z',
		],
	] satisfies Array<[string, LlmBudgetWindow, string]>)('%s', (_name, window, start) => {
		expect(windowStart(window, now, 'America/New_York').toISOString()).toBe(start);
	});
});
