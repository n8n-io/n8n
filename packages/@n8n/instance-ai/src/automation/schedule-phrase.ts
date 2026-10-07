import type { TriggerTime } from 'n8n-workflow';

/** Monday to Friday. `TriggerTime` has no mode for this, so the Assistant adds one. */
export type WeekdaysTrigger = { mode: 'weekdays'; hour: number; minute: number };

export type ScheduleTrigger = TriggerTime | WeekdaysTrigger;

export type SchedulePhrase = {
	/** Never `mode: 'custom'`. */
	trigger: ScheduleTrigger;
	/** en-GB text with a 24-hour clock, for example "Every weekday at 08:00". */
	description: string;
	/** The exact part of the input that matched, so the UI can show it as evidence. */
	matchedText: string;
};

type Clock = { hour: number; minute: number };
/** `isBareHour` is true for "at 7" or "at 7:30", which have no "am", "pm" or word such as "noon". */
type ExplicitTime = Clock & { isBareHour: boolean };
type Groups = Partial<Record<string, string>>;

type Rule = {
	pattern: RegExp;
	/** Day, week and month phrases take a time of day. Interval phrases do not. */
	timed: boolean;
	build: (groups: Groups, clock: Clock) => ScheduleTrigger | undefined;
};

type Found = { rule: Rule; groups: Groups; start: number; end: number };

const DEFAULT_CLOCK: Clock = { hour: 9, minute: 0 };
const EVENING_CLOCK: Clock = { hour: 18, minute: 0 };
const WORD_CLOCKS: Partial<Record<string, Clock>> = {
	noon: { hour: 12, minute: 0 },
	midday: { hour: 12, minute: 0 },
	midnight: { hour: 0, minute: 0 },
};

/** Index 0 is Sunday, as in cron and `TriggerTime`. */
const DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
] as const;

const DAY = `(?<day>${DAY_NAMES.join('|')})`;
const EVERY = /\b(?:every|each)\s+/.source;
const PERIOD = /(?:\s+(?<period>morning|evening)\b)?/.source;
const ORDINAL = /(?<dom>\d+)(?:st|nd|rd|th)?\b/.source;
// "daily" and similar are adverbs only when no noun follows: "send it daily", but not "the daily standup".
const ADVERB_END =
	/(?=\s*(?:$|[.,!?;:)\]"”]|(?:at|on|please|and|or|from|starting|until|then|thanks|too|instead|to|for|in|via)\b))/
		.source;
const TIME =
	/\bat\s+(?:(?<word>noon|midday|midnight)\b|(?<h>\d{1,2})(?!\d)(?:[:.](?<m>\d{2})(?!\d))?(?:\s*(?<ampm>[ap])\.?m\b\.?)?)/
		.source;

const TIME_AFTER = new RegExp(String.raw`^[\s,]+${TIME}`, 'i');
const TIME_BEFORE = new RegExp(String.raw`${TIME}[\s,]+$`, 'i');

const rule = (source: string, timed: boolean, build: Rule['build']): Rule => ({
	pattern: new RegExp(source, 'gi'),
	timed,
	build,
});

function toInt(value: string | undefined): number | undefined {
	return value === undefined ? undefined : Number.parseInt(value, 10);
}

function inRange(value: number | undefined, min: number, max: number): value is number {
	return value !== undefined && value >= min && value <= max;
}

function weekdayIndex(name: string | undefined): number {
	const lower = name?.toLowerCase();
	return DAY_NAMES.findIndex((day) => day.toLowerCase() === lower);
}

const everyMinutes: Rule['build'] = (groups) => {
	const value = toInt(groups.n);
	return inRange(value, 1, 59) ? { mode: 'everyX', unit: 'minutes', value } : undefined;
};

const everyHours: Rule['build'] = (groups) => {
	const value = toInt(groups.n);
	return inRange(value, 1, 23) ? { mode: 'everyX', unit: 'hours', value } : undefined;
};

const onWeekday: Rule['build'] = (groups, clock) => {
	const weekday = weekdayIndex(groups.day);
	return weekday < 0 ? undefined : { mode: 'everyWeek', weekday, ...clock };
};

const onDayOfMonth: Rule['build'] = (groups, clock) => {
	const dayOfMonth = toInt(groups.dom);
	// Day 29 and later does not occur in every month, so these phrases are not schedules.
	return inRange(dayOfMonth, 1, 28) ? { mode: 'everyMonth', dayOfMonth, ...clock } : undefined;
};

/** The earliest match in the text wins. At the same position, the longest match wins. */
const RULES: readonly Rule[] = [
	rule(/\bevery\s+(?<n>\d+)\s*(?:minutes?|mins?)\b/.source, false, everyMinutes),
	rule(String.raw`${EVERY}minute\b`, false, () => ({ mode: 'everyMinute' })),
	rule(/\bevery\s+(?<n>\d+)\s*(?:hours?|hrs?)\b/.source, false, everyHours),
	rule(String.raw`(?:${EVERY}hour\b|\bhourly${ADVERB_END})`, false, () => ({
		mode: 'everyHour',
		minute: 0,
	})),
	rule(String.raw`(?:${EVERY}day\b|\bdaily${ADVERB_END})`, true, (_, clock) => ({
		mode: 'everyDay',
		...clock,
	})),
	rule(String.raw`${EVERY}(?<period>morning|evening)\b`, true, (_, clock) => ({
		mode: 'everyDay',
		...clock,
	})),
	rule(
		String.raw`(?:${EVERY}(?:weekday|working\s+day|business\s+day)s?\b|\bon\s+weekdays\b)${PERIOD}`,
		true,
		(_, clock) => ({ mode: 'weekdays', ...clock }),
	),
	rule(String.raw`${EVERY}${DAY}s?\b${PERIOD}`, true, onWeekday),
	rule(String.raw`\bon\s+${DAY}s\b${PERIOD}`, true, onWeekday),
	rule(String.raw`(?:\bweekly|${EVERY}week)\s+on\s+${DAY}s?\b${PERIOD}`, true, onWeekday),
	rule(String.raw`(?:${EVERY}week\b|\bweekly${ADVERB_END})`, true, (_, clock) => ({
		mode: 'everyWeek',
		weekday: 1,
		...clock,
	})),
	rule(
		String.raw`\b(?:on\s+)?the\s+${ORDINAL}\s+of\s+(?:every|each)\s+month\b`,
		true,
		onDayOfMonth,
	),
	rule(
		String.raw`(?:${EVERY}month|\bmonthly)\s+on\s+(?:the\s+)?(?:day\s+)?${ORDINAL}`,
		true,
		onDayOfMonth,
	),
	// Skip "every month" when a day of the month belongs to it, so an invalid day stays unparsed.
	rule(
		String.raw`(?<!\bof\s+)(?:${EVERY}month\b|\bmonthly${ADVERB_END})(?!\s+on\s+(?:the\s+)?(?:day\s+)?\d)`,
		true,
		(_, clock) => ({ mode: 'everyMonth', dayOfMonth: 1, ...clock }),
	),
];

function firstValidMatch(text: string, candidate: Rule): Found | undefined {
	for (const match of text.matchAll(candidate.pattern)) {
		const groups: Groups = match.groups ?? {};
		if (candidate.build(groups, DEFAULT_CLOCK)) {
			return { rule: candidate, groups, start: match.index, end: match.index + match[0].length };
		}
	}
	return undefined;
}

function isBetter(found: Found, best: Found | undefined): boolean {
	if (!best) return true;
	return found.start < best.start || (found.start === best.start && found.end > best.end);
}

function findEarliestMatch(text: string): Found | undefined {
	let best: Found | undefined;
	for (const candidate of RULES) {
		const found = firstValidMatch(text, candidate);
		if (found && isBetter(found, best)) best = found;
	}
	return best;
}

function toTwentyFourHour(hour: number, isPm: boolean): number | undefined {
	if (!inRange(hour, 1, 12)) return undefined;
	return (hour % 12) + (isPm ? 12 : 0);
}

/** Returns undefined for an impossible time such as "13pm" or "25:00", so the caller uses the default. */
function toExplicitTime(groups: Groups): ExplicitTime | undefined {
	const word = WORD_CLOCKS[groups.word?.toLowerCase() ?? ''];
	if (word) return { ...word, isBareHour: false };
	const minute = toInt(groups.m) ?? 0;
	const ampm = groups.ampm?.toLowerCase();
	const hour = ampm ? toTwentyFourHour(toInt(groups.h) ?? 0, ampm === 'p') : toInt(groups.h);
	if (!inRange(hour, 0, 23) || !inRange(minute, 0, 59)) return undefined;
	return { hour, minute, isBareHour: ampm === undefined };
}

type TimedSpan = { time: ExplicitTime; start: number; end: number };

/** A time can come straight after the phrase ("every day at 8") or straight before it ("at 8 every day"). */
function findTime(text: string, found: Found): TimedSpan | undefined {
	const after = TIME_AFTER.exec(text.slice(found.end));
	const timeAfter = after?.groups ? toExplicitTime(after.groups) : undefined;
	if (after && timeAfter) {
		return { time: timeAfter, start: found.start, end: found.end + after[0].length };
	}

	const before = TIME_BEFORE.exec(text.slice(0, found.start));
	const timeBefore = before?.groups ? toExplicitTime(before.groups) : undefined;
	if (before && timeBefore) return { time: timeBefore, start: before.index, end: found.end };
	return undefined;
}

function resolveClock(period: string | undefined, time: ExplicitTime | undefined): Clock {
	const isEvening = period?.toLowerCase() === 'evening';
	if (!time) return isEvening ? EVENING_CLOCK : DEFAULT_CLOCK;
	// "every evening at 7" means 19:00. An explicit "am" keeps the morning hour.
	const shift = isEvening && time.isBareHour && inRange(time.hour, 1, 11) ? 12 : 0;
	return { hour: time.hour + shift, minute: time.minute };
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function clockText(clock: Clock): string {
	return `${pad(clock.hour)}:${pad(clock.minute)}`;
}

function weekdayName(weekday: number): string {
	return Number.isInteger(weekday) && inRange(weekday, 0, 6)
		? DAY_NAMES[weekday]
		: `day ${weekday}`;
}

function describeInterval(unit: 'minutes' | 'hours', value: number): string {
	const noun = unit === 'minutes' ? 'minute' : 'hour';
	return `Every ${value} ${value === 1 ? noun : `${noun}s`}`;
}

function describeHourly(minute: number): string {
	return minute === 0 ? 'Every hour' : `Every hour at ${minute} minutes past the hour`;
}

/** en-GB description with a zero-padded 24-hour clock. */
export function describeSchedule(trigger: ScheduleTrigger): string {
	switch (trigger.mode) {
		case 'everyMinute':
			return 'Every minute';
		case 'everyX':
			return describeInterval(trigger.unit, trigger.value);
		case 'everyHour':
			return describeHourly(trigger.minute);
		case 'everyDay':
			return `Every day at ${clockText(trigger)}`;
		case 'weekdays':
			return `Every weekday at ${clockText(trigger)}`;
		case 'everyWeek':
			return `Every ${weekdayName(trigger.weekday)} at ${clockText(trigger)}`;
		case 'everyMonth':
			return `Every month on day ${trigger.dayOfMonth} at ${clockText(trigger)}`;
		case 'custom':
			return `Custom schedule (${trigger.cronExpression.trim()})`;
	}
}

/**
 * Deterministic 5-field cron. n8n-workflow `toCronExpression` adds a random
 * seconds field, so the same phrase would give a different cron each time.
 * A custom trigger keeps its own expression.
 */
export function scheduleToCron(trigger: ScheduleTrigger): string {
	switch (trigger.mode) {
		case 'everyMinute':
			return '* * * * *';
		case 'everyX':
			return trigger.unit === 'minutes'
				? `*/${trigger.value} * * * *`
				: `0 */${trigger.value} * * *`;
		case 'everyHour':
			return `${trigger.minute} * * * *`;
		case 'everyDay':
			return `${trigger.minute} ${trigger.hour} * * *`;
		case 'weekdays':
			return `${trigger.minute} ${trigger.hour} * * 1-5`;
		case 'everyWeek':
			return `${trigger.minute} ${trigger.hour} * * ${trigger.weekday}`;
		case 'everyMonth':
			return `${trigger.minute} ${trigger.hour} ${trigger.dayOfMonth} * *`;
		case 'custom':
			return trigger.cronExpression.trim();
	}
}

/**
 * Finds the first schedule phrase in a message, for example "every weekday at 8"
 * or "each Monday morning". Returns undefined when the message has none. Never throws.
 */
export function parseSchedulePhrase(text: string): SchedulePhrase | undefined {
	if (typeof text !== 'string') return undefined;
	const found = findEarliestMatch(text);
	if (!found) return undefined;

	const span = found.rule.timed ? findTime(text, found) : undefined;
	const trigger = found.rule.build(found.groups, resolveClock(found.groups.period, span?.time));
	if (!trigger) return undefined;

	return {
		trigger,
		description: describeSchedule(trigger),
		matchedText: text.slice(span?.start ?? found.start, span?.end ?? found.end),
	};
}
