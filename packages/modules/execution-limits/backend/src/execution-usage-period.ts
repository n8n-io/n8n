import type { ExecutionLimitPeriodUnit } from '@n8n/api-types';
import { Time } from '@n8n/constants';

/** A period as UTC days. `firstDay` and `lastDay` are inclusive, as `YYYY-MM-DD`. */
export type UsagePeriod = {
	unit: ExecutionLimitPeriodUnit;
	firstDay: string;
	lastDay: string;
	/** Start of the next period, at 00:00 UTC. */
	resetsAt: Date;
};

const DAY_MS = Time.days.toMilliseconds;

export function toUtcDay(at: Date): string {
	return at.toISOString().slice(0, 10);
}

/** The UTC day that is `days` after `day`. A negative number goes back. */
export function addUtcDays(day: string, days: number): string {
	return toUtcDay(new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS));
}

/** The period that contains `at`. A week starts on Monday, as in ISO 8601. */
export function periodRange(unit: ExecutionLimitPeriodUnit, at: Date): UsagePeriod {
	const year = at.getUTCFullYear();
	const month = at.getUTCMonth();
	const date = at.getUTCDate();

	let start: number;
	let end: number;
	switch (unit) {
		case 'day':
			start = Date.UTC(year, month, date);
			end = start + DAY_MS;
			break;
		case 'week':
			start = Date.UTC(year, month, date - ((at.getUTCDay() + 6) % 7));
			end = start + 7 * DAY_MS;
			break;
		case 'month':
			start = Date.UTC(year, month, 1);
			end = Date.UTC(year, month + 1, 1);
			break;
	}

	return {
		unit,
		firstDay: toUtcDay(new Date(start)),
		lastDay: toUtcDay(new Date(end - DAY_MS)),
		resetsAt: new Date(end),
	};
}
