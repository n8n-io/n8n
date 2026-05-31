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
		const dayOfWeek = toIntInRange(dowField, 0, 6);
		if (dayOfWeek === null) return null;
		return { ...DEFAULT_SCHEDULE_PARTS, frequency: 'weekly', minute, hour, dayOfWeek };
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

/**
 * Expand a single cron field (single value, comma list, range, or step) into the
 * explicit sorted set of values it matches, or null when it can't be parsed. A
 * bare `*` returns null so callers decide what "every value" means in context.
 */
export function expandCronField(field: string, min: number, max: number): number[] | null {
	const values = new Set<number>();

	for (const token of field.split(',')) {
		const stepMatch = token.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
		if (stepMatch) {
			const [, rangePart, stepStr] = stepMatch;
			const step = Number(stepStr);
			if (step <= 0) return null;
			let start = min;
			let end = max;
			if (rangePart !== '*') {
				const bounds = rangePart.match(/^(\d+)(?:-(\d+))?$/);
				if (!bounds) return null;
				start = Number(bounds[1]);
				end = bounds[2] !== undefined ? Number(bounds[2]) : max;
			}
			if (start < min || end > max || start > end) return null;
			for (let value = start; value <= end; value += step) values.add(value);
			continue;
		}

		const rangeMatch = token.match(/^(\d+)-(\d+)$/);
		if (rangeMatch) {
			const start = Number(rangeMatch[1]);
			const end = Number(rangeMatch[2]);
			if (start < min || end > max || start > end) return null;
			for (let value = start; value <= end; value++) values.add(value);
			continue;
		}

		if (/^\d+$/.test(token)) {
			const value = Number(token);
			if (value < min || value > max) return null;
			values.add(value);
			continue;
		}

		return null;
	}

	return values.size > 0 ? [...values].sort((a, b) => a - b) : null;
}

/**
 * Human-readable description of a cron the simple frequency builder can't model
 * (ranges, lists, steps). The structured result is rendered to localized text by
 * the caller.
 */
export type ScheduleDescription =
	| { kind: 'everyNMinutes'; minutes: number }
	| { kind: 'weekdays'; minute: number; hour: number }
	| { kind: 'weekends'; minute: number; hour: number }
	| { kind: 'daysOfWeek'; minute: number; hour: number; days: number[] }
	| { kind: 'daysOfMonth'; minute: number; hour: number; days: number[] };

function arraysEqual(a: number[], b: number[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Describe common crons that {@link parseCron} can't represent (day-of-week
 * ranges/lists, day-of-month lists, even minute steps) so the UI can render them
 * in words instead of raw cron. Returns null for shapes we don't summarise, so
 * the caller can fall back to the raw expression.
 */
export function describeSchedule(cron: string): ScheduleDescription | null {
	const fields = cron.trim().split(/\s+/);
	if (fields.length !== 5) return null;
	const [minuteField, hourField, domField, monthField, dowField] = fields;
	if (monthField !== '*') return null;

	// `every N minutes` only reads accurately when N divides the hour evenly.
	const minuteStep = minuteField.match(/^\*\/(\d+)$/);
	if (minuteStep && hourField === '*' && domField === '*' && dowField === '*') {
		const minutes = Number(minuteStep[1]);
		return minutes >= 2 && 60 % minutes === 0 ? { kind: 'everyNMinutes', minutes } : null;
	}

	// The day-based shapes need a single fire time.
	const minute = toIntInRange(minuteField, 0, 59);
	const hour = toIntInRange(hourField, 0, 23);
	if (minute === null || hour === null) return null;

	if (domField === '*' && dowField !== '*') {
		const expanded = expandCronField(dowField, 0, 7);
		if (!expanded) return null;
		// cron allows 7 for Sunday; normalize to 0 so day sets compare cleanly.
		const days = [...new Set(expanded.map((day) => (day === 7 ? 0 : day)))].sort((a, b) => a - b);
		if (days.length === 0 || days.length === 7) return null;
		if (arraysEqual(days, [1, 2, 3, 4, 5])) return { kind: 'weekdays', minute, hour };
		if (arraysEqual(days, [0, 6])) return { kind: 'weekends', minute, hour };
		return { kind: 'daysOfWeek', minute, hour, days };
	}

	if (dowField === '*' && domField !== '*') {
		const days = expandCronField(domField, 1, 31);
		if (!days || days.length < 2) return null;
		return { kind: 'daysOfMonth', minute, hour, days };
	}

	return null;
}
