import type {
	CatalogSubscription,
	ScheduleDraft,
	ScheduleFrequency,
} from '@/features/catalog/catalog.types';

/**
 * What a card says about the person looking at it: whether they have taken this
 * workflow on, and when it next runs for them.
 *
 * Only ever their own — the listing it reads is scoped to the requesting person
 * server-side. How many other people subscribed is not their business and would
 * not help them either.
 */
export type OwnSchedule =
	| { state: 'none' }
	| { state: 'scheduled'; nextRunAt: string; count: number }
	| { state: 'paused'; count: number };

export function summariseOwnSchedules(subscriptions: CatalogSubscription[]): OwnSchedule {
	if (subscriptions.length === 0) return { state: 'none' };

	const upcoming = subscriptions
		.filter((subscription) => subscription.enabled && subscription.nextRunAt !== null)
		.map((subscription) => subscription.nextRunAt as string)
		.sort();

	// Several schedules for one workflow collapse to the soonest: that is the
	// question the card answers — "when does this next happen for me".
	return upcoming.length > 0
		? { state: 'scheduled', nextRunAt: upcoming[0], count: subscriptions.length }
		: { state: 'paused', count: subscriptions.length };
}

/**
 * Cron is the storage format, not the interface. The people this is for pick a
 * frequency and a time; these two functions are the only place the two
 * representations meet, so a schedule survives a round trip through the API and
 * comes back as the same choice in the form.
 *
 * Six fields, seconds first, which is what the scheduler reads.
 */
export function draftToCron({ frequency, minute, hour, weekday }: ScheduleDraft): string {
	switch (frequency) {
		case 'hourly':
			return `0 ${minute} * * * *`;
		case 'daily':
			return `0 ${minute} ${hour} * * *`;
		case 'weekly':
			return `0 ${minute} ${hour} * * ${weekday}`;
	}
}

export const DEFAULT_SCHEDULE_DRAFT: ScheduleDraft = {
	frequency: 'daily',
	minute: 0,
	hour: 9,
	weekday: 1,
};

/**
 * Read a stored expression back into the form's choices, falling back to the
 * default for anything this form did not write — a cron set through the API can
 * say things the picker cannot, and showing a wrong-but-plausible choice would
 * be worse than showing the default.
 */
export function cronToDraft(cronExpression: string): ScheduleDraft {
	const fields = cronExpression.trim().split(/\s+/);
	if (fields.length !== 6) return DEFAULT_SCHEDULE_DRAFT;

	const [second, minute, hour, dayOfMonth, month, weekday] = fields;
	if (second !== '0' || dayOfMonth !== '*' || month !== '*') return DEFAULT_SCHEDULE_DRAFT;

	const minuteValue = toNumber(minute);
	if (minuteValue === null) return DEFAULT_SCHEDULE_DRAFT;

	if (hour === '*') {
		return weekday === '*'
			? { ...DEFAULT_SCHEDULE_DRAFT, frequency: 'hourly', minute: minuteValue }
			: DEFAULT_SCHEDULE_DRAFT;
	}

	const hourValue = toNumber(hour);
	if (hourValue === null) return DEFAULT_SCHEDULE_DRAFT;

	if (weekday === '*') {
		return { ...DEFAULT_SCHEDULE_DRAFT, frequency: 'daily', minute: minuteValue, hour: hourValue };
	}

	const weekdayValue = toNumber(weekday);
	if (weekdayValue === null) return DEFAULT_SCHEDULE_DRAFT;

	return { frequency: 'weekly', minute: minuteValue, hour: hourValue, weekday: weekdayValue };
}

/** The frequencies the picker offers, in the order they are shown. */
export const SCHEDULE_FREQUENCIES: ScheduleFrequency[] = ['hourly', 'daily', 'weekly'];

/** The zone the person is actually in, which is the one they mean. */
export function resolveBrowserTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function toNumber(field: string): number | null {
	if (!/^\d+$/.test(field)) return null;
	return Number(field);
}
