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
