import type { LlmBudgetWindow } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { DateTime } from 'luxon';

const ROLLING_DAYS = { day: 1, week: 7, month: 30 } as const;

/**
 * Where the current window of a budget starts. Rolling: 24 hours, 7 or 30 days before `now`.
 * Calendar: the start of the day, week (Monday) or month, in the instance timezone or in UTC.
 */
export function windowStart(window: LlmBudgetWindow, now: Date, instanceTimezone: string): Date {
	if (window.kind === 'rolling') {
		return new Date(now.getTime() - ROLLING_DAYS[window.unit] * Time.days.toMilliseconds);
	}
	const zone = window.timezone === 'UTC' ? 'UTC' : instanceTimezone;
	return DateTime.fromJSDate(now, { zone }).startOf(window.unit).toJSDate();
}

/** The window in words, for a violation message. */
export function describeWindow(window: LlmBudgetWindow): string {
	if (window.kind === 'calendar') return `this ${window.unit}`;
	return { day: 'in the last 24 hours', week: 'in the last 7 days', month: 'in the last 30 days' }[
		window.unit
	];
}
