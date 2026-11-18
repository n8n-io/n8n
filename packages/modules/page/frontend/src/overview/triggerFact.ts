import type { PageOverviewTrigger } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

type ScheduleTrigger = Extract<PageOverviewTrigger, { kind: 'schedule' }>;

/** Gives the text of a key, with the values that the text names. */
export type Translate = (key: BaseTextKey, interpolate?: Record<string, string>) => string;

const WEEKDAY_KEYS: BaseTextKey[] = [
	'page.overview.fact.weekday.0',
	'page.overview.fact.weekday.1',
	'page.overview.fact.weekday.2',
	'page.overview.fact.weekday.3',
	'page.overview.fact.weekday.4',
	'page.overview.fact.weekday.5',
	'page.overview.fact.weekday.6',
];

/** The values that the schedule node uses when a rule stores none. */
const SCHEDULE_DEFAULTS = {
	hour: 0,
	minute: 0,
	weekdays: [0],
	minutesInterval: 5,
	hoursInterval: 1,
};

const LAST_HOUR = 23;
const LAST_MINUTE = 59;
const TIME_PART_LENGTH = 2;

function toTimePart(value: number): string {
	return String(value).padStart(TIME_PART_LENGTH, '0');
}

/** Gives the time of a rule as `HH:MM`. Returns `undefined` for a time that does not exist. */
function toTime(trigger: ScheduleTrigger): string | undefined {
	const hour = trigger.triggerAtHour ?? SCHEDULE_DEFAULTS.hour;
	const minute = trigger.triggerAtMinute ?? SCHEDULE_DEFAULTS.minute;
	return hour <= LAST_HOUR && minute <= LAST_MINUTE
		? `${toTimePart(hour)}:${toTimePart(minute)}`
		: undefined;
}

/** Gives the names of the days of a weekly rule. Returns `undefined` when a day does not exist. */
function toWeekdays(trigger: ScheduleTrigger, translate: Translate): string | undefined {
	const days = trigger.triggerAtDay ?? SCHEDULE_DEFAULTS.weekdays;
	return days.every((day) => day < WEEKDAY_KEYS.length)
		? days.map((day) => translate(WEEKDAY_KEYS[day])).join(', ')
		: undefined;
}

/** Tells how often a rule runs. One unit has its own text. */
function toEvery(count: number, oneKey: BaseTextKey, manyKey: BaseTextKey, translate: Translate) {
	return count === 1 ? translate(oneKey) : translate(manyKey, { count: String(count) });
}

function toDailyText(trigger: ScheduleTrigger, translate: Translate): string | undefined {
	const time = toTime(trigger);
	return time === undefined ? undefined : translate('page.overview.fact.schedule.daily', { time });
}

function toWeeklyText(trigger: ScheduleTrigger, translate: Translate): string | undefined {
	const time = toTime(trigger);
	const days = toWeekdays(trigger, translate);
	return time === undefined || days === undefined
		? undefined
		: translate('page.overview.fact.schedule.weekly', { days, time });
}

/** Describes the first rule of a schedule. Returns `undefined` for a rule that it cannot describe. */
function toScheduleText(trigger: ScheduleTrigger, translate: Translate): string | undefined {
	switch (trigger.field) {
		case 'minutes':
			return toEvery(
				trigger.minutesInterval ?? SCHEDULE_DEFAULTS.minutesInterval,
				'page.overview.fact.schedule.everyMinute',
				'page.overview.fact.schedule.minutes',
				translate,
			);
		case 'hours':
			return toEvery(
				trigger.hoursInterval ?? SCHEDULE_DEFAULTS.hoursInterval,
				'page.overview.fact.schedule.everyHour',
				'page.overview.fact.schedule.hours',
				translate,
			);
		case 'days':
			return toDailyText(trigger, translate);
		case 'weeks':
			return toWeeklyText(trigger, translate);
		case 'cronExpression':
			return trigger.expression;
		default:
			return undefined;
	}
}

/** Gives the address of a webhook with one leading slash. */
function toWebhookText(method: string, path: string): string {
	return `${method} /${path.replace(/^\/+/, '')}`;
}

function toFactText(trigger: PageOverviewTrigger, translate: Translate): string | undefined {
	switch (trigger.kind) {
		case 'webhook':
			return toWebhookText(trigger.method, trigger.path);
		case 'schedule':
			return toScheduleText(trigger, translate);
		case 'form':
			return trigger.title;
		case 'appEvent':
			return trigger.events.join(', ');
	}
}

/**
 * Gives the key fact of a trigger as a text.
 * Returns `undefined` for no trigger and for a trigger that it cannot describe.
 */
export function toTriggerFactText(
	trigger: PageOverviewTrigger | undefined,
	translate: Translate,
): string | undefined {
	const text = trigger === undefined ? undefined : toFactText(trigger, translate);
	return text === '' ? undefined : text;
}
