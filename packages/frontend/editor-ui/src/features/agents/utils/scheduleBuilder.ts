import { CronTime } from 'cron';

/**
 * Structured task schedule <-> cron conversion. Lets the Tasks UI offer a
 * friendly frequency + time builder while still storing a standard 5-field cron.
 * Anything the builder can't represent round-trips as a raw "custom" cron.
 */
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ScheduleParts {
	frequency: ScheduleFrequency;
	/** 0-59 */
	minute: number;
	/** 0-23 (ignored for hourly) */
	hour: number;
	/** 0-6, 0 = Sunday (weekly only) */
	dayOfWeek: number;
	/** 1-31 (monthly only) */
	dayOfMonth: number;
}

export const DEFAULT_SCHEDULE_PARTS: ScheduleParts = {
	frequency: 'daily',
	minute: 0,
	hour: 9,
	dayOfWeek: 1,
	dayOfMonth: 1,
};

export function buildCron(parts: ScheduleParts): string {
	const { minute, hour, dayOfWeek, dayOfMonth, frequency } = parts;
	switch (frequency) {
		case 'hourly':
			return `${minute} * * * *`;
		case 'daily':
			return `${minute} ${hour} * * *`;
		case 'weekly':
			return `${minute} ${hour} * * ${dayOfWeek}`;
		case 'monthly':
			return `${minute} ${hour} ${dayOfMonth} * *`;
	}
}

function toIntInRange(value: string, min: number, max: number): number | null {
	if (!/^\d+$/.test(value)) return null;
	const parsed = Number(value);
	return parsed >= min && parsed <= max ? parsed : null;
}

/**
 * Parse a 5-field cron into structured parts, or null when it doesn't match a
 * builder-supported shape (the caller treats null as "custom").
 */
export function parseCron(cron: string): ScheduleParts | null {
	const fields = cron.trim().split(/\s+/);
	if (fields.length !== 5) return null;

	const [minuteField, hourField, domField, monthField, dowField] = fields;
	if (monthField !== '*') return null;

	const minute = toIntInRange(minuteField, 0, 59);
	if (minute === null) return null;

	if (hourField === '*' && domField === '*' && dowField === '*') {
		return { ...DEFAULT_SCHEDULE_PARTS, frequency: 'hourly', minute };
	}

	const hour = toIntInRange(hourField, 0, 23);
	if (hour === null) return null;

	if (domField === '*' && dowField === '*') {
		return { ...DEFAULT_SCHEDULE_PARTS, frequency: 'daily', minute, hour };
	}

	if (domField === '*') {
		// cron allows 7 for Sunday; accept it and normalize to 0 so a valid weekly
		// schedule doesn't fall back to custom mode.
		const dayOfWeek = toIntInRange(dowField, 0, 7);
		if (dayOfWeek === null) return null;
		return {
			...DEFAULT_SCHEDULE_PARTS,
			frequency: 'weekly',
			minute,
			hour,
			dayOfWeek: dayOfWeek === 7 ? 0 : dayOfWeek,
		};
	}

	if (dowField === '*') {
		const dayOfMonth = toIntInRange(domField, 1, 31);
		if (dayOfMonth === null) return null;
		return { ...DEFAULT_SCHEDULE_PARTS, frequency: 'monthly', minute, hour, dayOfMonth };
	}

	return null;
}

/** Next fire time for a cron in the given timezone, or null if the cron is empty/invalid. */
export function getNextScheduleOccurrence(cronExpression: string, timezone: string): Date | null {
	if (!cronExpression.trim()) {
		return null;
	}

	try {
		return new CronTime(cronExpression, timezone).sendAt().toJSDate();
	} catch {
		return null;
	}
}

// ── Display formatting ──────────────────────────────────────────────────────
// Pure, locale-aware helpers (locale `undefined`, timezone passed in) for the
// task schedule controls.

/** Localized weekday name. 0 = Sunday .. 6 = Saturday. */
export function weekdayLabel(dayOfWeek: number, format: 'long' | 'short' = 'long'): string {
	// 2024-01-07 is a Sunday, so dayOfWeek 0..6 maps to Sun..Sat. Format in UTC to
	// match the UTC reference date — otherwise negative-offset timezones render
	// the previous day's name.
	return new Intl.DateTimeFormat(undefined, { weekday: format, timeZone: 'UTC' }).format(
		new Date(Date.UTC(2024, 0, 7 + dayOfWeek)),
	);
}

/** Localized time-of-day, e.g. "9:00 AM". */
export function formatTimeOfDay(hour: number, minute: number): string {
	return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
		new Date(2024, 0, 1, hour, minute),
	);
}

/** Localized run timestamp (weekday + date + time) in the given timezone. */
export function formatScheduleDateTime(date: Date, timezone: string): string {
	return new Intl.DateTimeFormat(undefined, {
		timeZone: timezone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}
