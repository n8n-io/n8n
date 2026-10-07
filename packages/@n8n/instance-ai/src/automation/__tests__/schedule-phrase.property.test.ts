import fc from 'fast-check';

import type { ScheduleTrigger } from '../schedule-phrase';
import { parseSchedulePhrase, scheduleToCron } from '../schedule-phrase';

type Clock = { hour: number; minute: number };
type TimeOfDay = Clock & { text: string; isBareHour: boolean };
type Period = 'morning' | 'evening' | undefined;
type GeneratedPhrase = { text: string; expected: ScheduleTrigger };

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (value: number) => String(value).padStart(2, '0');

const timeArb: fc.Arbitrary<TimeOfDay> = fc.oneof(
	fc
		.record({
			hour: fc.integer({ min: 0, max: 23 }),
			minute: fc.integer({ min: 0, max: 59 }),
			padded: fc.boolean(),
		})
		.map(({ hour, minute, padded }) => ({
			text: `at ${padded ? pad(hour) : hour}:${pad(minute)}`,
			hour,
			minute,
			isBareHour: true,
		})),
	fc
		.record({ hour: fc.integer({ min: 1, max: 12 }), pm: fc.boolean(), space: fc.boolean() })
		.map(({ hour, pm, space }) => ({
			text: `at ${hour}${space ? ' ' : ''}${pm ? 'pm' : 'am'}`,
			hour: (hour % 12) + (pm ? 12 : 0),
			minute: 0,
			isBareHour: false,
		})),
	fc
		.integer({ min: 0, max: 23 })
		.map((hour) => ({ text: `at ${hour}`, hour, minute: 0, isBareHour: true })),
	fc.constantFrom<TimeOfDay>(
		{ text: 'at noon', hour: 12, minute: 0, isBareHour: false },
		{ text: 'at midnight', hour: 0, minute: 0, isBareHour: false },
	),
);

// The documented rules: 09:00 by default, 18:00 in the evening, and "evening at 7" is 19:00.
function expectedClock(period: Period, time: TimeOfDay | undefined): Clock {
	if (!time) return { hour: period === 'evening' ? 18 : 9, minute: 0 };
	const isEveningHour = period === 'evening' && time.isBareHour && time.hour >= 1 && time.hour < 12;
	return { hour: time.hour + (isEveningHour ? 12 : 0), minute: time.minute };
}

const placementArb = fc.option(fc.record({ time: timeArb, before: fc.boolean() }), {
	nil: undefined,
});

/** Adds an optional time before or after a day, week or month phrase. */
function timed(
	core: fc.Arbitrary<{ text: string; period: Period; build: (clock: Clock) => ScheduleTrigger }>,
): fc.Arbitrary<GeneratedPhrase> {
	return fc.tuple(core, placementArb).map(([phrase, placement]) => {
		const expected = phrase.build(expectedClock(phrase.period, placement?.time));
		if (!placement) return { text: phrase.text, expected };
		const text = placement.before
			? `${placement.time.text} ${phrase.text}`
			: `${phrase.text} ${placement.time.text}`;
		return { text, expected };
	});
}

const periodArb = fc.constantFrom<Period>(undefined, 'morning', 'evening');
const withPeriod = (text: string, period: Period) => (period ? `${text} ${period}` : text);

const intervalArb: fc.Arbitrary<GeneratedPhrase> = fc.oneof(
	fc
		.record({
			value: fc.integer({ min: 1, max: 59 }),
			word: fc.constantFrom('minutes', 'minute', 'mins', 'min'),
		})
		.map(
			({ value, word }): GeneratedPhrase => ({
				text: `every ${value} ${word}`,
				expected: { mode: 'everyX', unit: 'minutes', value },
			}),
		),
	fc
		.record({
			value: fc.integer({ min: 1, max: 23 }),
			word: fc.constantFrom('hours', 'hour', 'hrs', 'hr'),
		})
		.map(
			({ value, word }): GeneratedPhrase => ({
				text: `every ${value} ${word}`,
				expected: { mode: 'everyX', unit: 'hours', value },
			}),
		),
	fc
		.constantFrom('every hour', 'each hour', 'hourly')
		.map((text): GeneratedPhrase => ({ text, expected: { mode: 'everyHour', minute: 0 } })),
);

const dayArb = timed(
	fc.oneof(
		fc.constantFrom('every day', 'each day', 'daily').map((text) => ({
			text,
			period: undefined,
			build: (clock: Clock): ScheduleTrigger => ({ mode: 'everyDay', ...clock }),
		})),
		fc
			.tuple(fc.constantFrom('every', 'each'), fc.constantFrom<Period>('morning', 'evening'))
			.map(([every, period]) => ({
				text: `${every} ${period}`,
				period,
				build: (clock: Clock): ScheduleTrigger => ({ mode: 'everyDay', ...clock }),
			})),
	),
);

const weekdaysArb = timed(
	fc
		.tuple(
			fc.constantFrom(
				'every weekday',
				'each weekday',
				'on weekdays',
				'every working day',
				'every business day',
				'every week day',
				'every working days',
			),
			periodArb,
		)
		.map(([text, period]) => ({
			text: withPeriod(text, period),
			period,
			build: (clock: Clock): ScheduleTrigger => ({ mode: 'weekdays', ...clock }),
		})),
);

const namedDayArb = timed(
	fc
		.tuple(
			fc.integer({ min: 0, max: 6 }),
			fc.constantFrom(
				(name: string) => `every ${name}`,
				(name: string) => `each ${name}`,
				(name: string) => `every ${name}s`,
				(name: string) => `on ${name}s`,
				(name: string) => `weekly on ${name}s`,
				(name: string) => `every week on ${name}`,
				(name: string) => `weekly, on ${name}s`,
				(name: string) => `every week, on ${name}`,
			),
			periodArb,
		)
		.map(([weekday, form, period]) => ({
			text: withPeriod(form(DAY_NAMES[weekday]), period),
			period,
			build: (clock: Clock): ScheduleTrigger => ({ mode: 'everyWeek', weekday, ...clock }),
		})),
);

const weekArb = timed(
	fc.constantFrom('every week', 'each week', 'weekly').map((text) => ({
		text,
		period: undefined,
		build: (clock: Clock): ScheduleTrigger => ({ mode: 'everyWeek', weekday: 1, ...clock }),
	})),
);

const ordinal = (day: number) => {
	if (day === 1 || day === 21) return `${day}st`;
	if (day === 2 || day === 22) return `${day}nd`;
	if (day === 3 || day === 23) return `${day}rd`;
	return `${day}th`;
};

const monthArb = timed(
	fc.oneof(
		fc
			.tuple(
				fc.integer({ min: 1, max: 28 }),
				fc.constantFrom(
					(day: number) => `on the ${ordinal(day)} of every month`,
					(day: number) => `the ${ordinal(day)} of each month`,
					(day: number) => `every month on the ${ordinal(day)}`,
					(day: number) => `monthly on the ${ordinal(day)}`,
					(day: number) => `every month on day ${day}`,
					(day: number) => `every month, on the ${ordinal(day)}`,
					(day: number) => `monthly, on day ${day}`,
				),
			)
			.map(([dayOfMonth, form]) => ({
				text: form(dayOfMonth),
				period: undefined,
				build: (clock: Clock): ScheduleTrigger => ({ mode: 'everyMonth', dayOfMonth, ...clock }),
			})),
		fc.constantFrom('every month', 'each month', 'monthly').map((text) => ({
			text,
			period: undefined,
			build: (clock: Clock): ScheduleTrigger => ({ mode: 'everyMonth', dayOfMonth: 1, ...clock }),
		})),
	),
);

const casingArb = fc.constantFrom(
	(text: string) => text,
	(text: string) => text.toUpperCase(),
	(text: string) => text.toLowerCase(),
	(text: string) => text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()),
);

const validPhraseArb: fc.Arbitrary<GeneratedPhrase> = fc
	.tuple(fc.oneof(intervalArb, dayArb, weekdaysArb, namedDayArb, weekArb, monthArb), casingArb)
	.map(([phrase, casing]) => ({ text: casing(phrase.text), expected: phrase.expected }));

// A trigger cannot skip weeks, so these phrases make a schedule next to them unsupported.
const skippedWeeksArb = fc.oneof(
	fc.constantFrom('every other week', 'every second week', 'every 2nd week', 'fortnightly'),
	fc.integer({ min: 2, max: 52 }).map((weeks) => `every ${weeks} weeks`),
);
const separatorArb = fc.constantFrom(' ', ', ', '  ');

// Times that end with a dot, as at the end of a sentence.
const sentenceEndArb = fc.oneof(
	fc
		.record({ hour: fc.integer({ min: 1, max: 12 }), pm: fc.boolean(), space: fc.boolean() })
		.map(({ hour, pm, space }) => ({
			text: `The demo was at ${hour}${space ? ' ' : ''}${pm ? 'pm' : 'am'}.`,
			isAbbreviation: false,
		})),
	fc.record({ hour: fc.integer({ min: 1, max: 12 }), pm: fc.boolean() }).map(({ hour, pm }) => ({
		text: `The demo was at ${hour} ${pm ? 'p.m.' : 'a.m.'}`,
		isAbbreviation: true,
	})),
);

const capitalise = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const SCHEDULE_WORDS = new Set(
	[
		...DAY_NAMES.flatMap((name) => [name, `${name}s`]),
		...['every', 'each', 'on', 'at', 'of', 'the', 'day', 'days', 'week', 'weeks', 'month'],
		...['daily', 'weekly', 'monthly', 'hourly', 'hour', 'hours', 'hr', 'hrs'],
		...['minute', 'minutes', 'min', 'mins', 'morning', 'evening', 'noon', 'midday', 'midnight'],
		...['weekday', 'weekdays', 'working', 'business', 'am', 'pm', 'a', 'p', 'm'],
	].map((word) => word.toLowerCase()),
);

const unrelatedWordsArb = fc
	.array(
		fc.stringMatching(/^[a-z]{1,8}$/).filter((word) => !SCHEDULE_WORDS.has(word)),
		{ minLength: 1, maxLength: 5 },
	)
	.map((words) => words.join(' '));

const SCHEDULE_TOKENS = [
	'every',
	'each',
	'on',
	'at',
	'the',
	'of',
	'day',
	'daily',
	'weekly',
	'monthly',
	'hourly',
	'Monday',
	'Fridays',
	'weekdays',
	'month',
	'morning',
	'evening',
	'15th',
	'31st',
	'9',
	'13pm',
	'25:00',
	'8:30',
	'60',
	'minutes',
	'hours',
	'noon',
	',',
	'.',
	'?',
	'\n',
	'é',
	'🙂',
];

const isCronFieldInRange = (field: string, min: number, max: number, step: number) => {
	if (field === '*') return true;
	const stepMatch = /^\*\/(\d+)$/.exec(field);
	if (stepMatch) return Number(stepMatch[1]) >= 1 && Number(stepMatch[1]) <= step;
	if (field === '1-5') return min === 0 && max === 6;
	return /^\d+$/.test(field) && Number(field) >= min && Number(field) <= max;
};

function expectValidCron(cron: string) {
	const fields = cron.split(' ');
	expect(fields).toHaveLength(5);
	const [minute, hour, dayOfMonth, monthField, weekday] = fields;
	expect(isCronFieldInRange(minute, 0, 59, 59)).toBe(true);
	expect(isCronFieldInRange(hour, 0, 23, 23)).toBe(true);
	expect(isCronFieldInRange(dayOfMonth, 1, 28, 0)).toBe(true);
	expect(monthField).toBe('*');
	expect(isCronFieldInRange(weekday, 0, 6, 0)).toBe(true);
}

describe('parseSchedulePhrase properties', () => {
	it('never throws for any string and only matches text from the input', () => {
		fc.assert(
			fc.property(
				fc.oneof(fc.string({ maxLength: 2_000 }), fc.fullUnicodeString({ maxLength: 2_000 })),
				(text) => {
					const result = parseSchedulePhrase(text);
					if (result) expect(text).toContain(result.matchedText);
				},
			),
		);
	});

	it('returns a valid schedule or undefined for text built from schedule words', () => {
		fc.assert(
			fc.property(
				fc.array(fc.constantFrom(...SCHEDULE_TOKENS), { maxLength: 40 }).map((t) => t.join(' ')),
				(text) => {
					const result = parseSchedulePhrase(text);
					if (!result) return;
					expect(text).toContain(result.matchedText);
					expectValidCron(scheduleToCron(result.trigger));
					expect(parseSchedulePhrase(result.description)?.trigger).toEqual(result.trigger);
				},
			),
		);
	});

	it('parses every generated phrase into the expected trigger and a valid cron', () => {
		fc.assert(
			fc.property(validPhraseArb, ({ text, expected }) => {
				const result = parseSchedulePhrase(text);

				expect(result?.trigger).toEqual(expected);
				expect(result?.matchedText).toBe(text);
				expectValidCron(scheduleToCron(expected));
			}),
		);
	});

	it('parses its own description back into the same trigger', () => {
		fc.assert(
			fc.property(validPhraseArb, ({ text }) => {
				const result = parseSchedulePhrase(text);
				const reparsed = parseSchedulePhrase(result?.description ?? '');

				expect(reparsed?.trigger).toEqual(result?.trigger);
				expect(reparsed?.description).toBe(result?.description);
			}),
		);
	});

	it('never parses a phrase next to a skipped-week phrase', () => {
		fc.assert(
			fc.property(
				validPhraseArb,
				skippedWeeksArb,
				separatorArb,
				fc.boolean(),
				({ text }, skipped, separator, before) => {
					const input = before ? `${skipped}${separator}${text}` : `${text}${separator}${skipped}`;

					expect(parseSchedulePhrase(input)).toBeUndefined();
				},
			),
		);
	});

	// A plain "3pm." always ends a sentence. "3 p.m." ends one only before a capital letter.
	it('never takes a time from an earlier sentence', () => {
		fc.assert(
			fc.property(validPhraseArb, sentenceEndArb, ({ text }, sentence) => {
				const phrase = sentence.isAbbreviation ? capitalise(text) : text;
				const expected = parseSchedulePhrase(phrase);

				expect(parseSchedulePhrase(`${sentence.text} ${phrase}`)?.trigger).toEqual(
					expected?.trigger,
				);
			}),
		);
	});

	// "daily", "weekly" and similar at the very end are left out: a following noun
	// makes them adjectives ("weekly report"), which is the intended behaviour.
	it('ignores unrelated words before and after the phrase', () => {
		fc.assert(
			fc.property(
				validPhraseArb.filter(({ text }) => !/(daily|weekly|monthly|hourly)$/i.test(text)),
				unrelatedWordsArb,
				unrelatedWordsArb,
				({ text }, prefix, suffix) => {
					expect(parseSchedulePhrase(`${prefix} ${text} ${suffix}`)).toEqual(
						parseSchedulePhrase(text),
					);
				},
			),
		);
	});
});
