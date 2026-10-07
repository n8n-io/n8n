import type { CronExpression } from 'n8n-workflow';

import type { ScheduleTrigger } from '../schedule-phrase';
import { describeSchedule, parseSchedulePhrase, scheduleToCron } from '../schedule-phrase';

type PositiveCase = {
	text: string;
	trigger: ScheduleTrigger;
	description: string;
	cron: string;
	matchedText: string;
};

const day = (hour: number, minute = 0): ScheduleTrigger => ({ mode: 'everyDay', hour, minute });
const weekdays = (hour: number, minute = 0): ScheduleTrigger => ({
	mode: 'weekdays',
	hour,
	minute,
});
const week = (weekday: number, hour = 9, minute = 0): ScheduleTrigger => ({
	mode: 'everyWeek',
	weekday,
	hour,
	minute,
});
const month = (dayOfMonth: number, hour = 9, minute = 0): ScheduleTrigger => ({
	mode: 'everyMonth',
	dayOfMonth,
	hour,
	minute,
});

const POSITIVE_CASES: PositiveCase[] = [
	// Intervals
	{
		text: 'every 15 minutes',
		trigger: { mode: 'everyX', unit: 'minutes', value: 15 },
		description: 'Every 15 minutes',
		cron: '*/15 * * * *',
		matchedText: 'every 15 minutes',
	},
	{
		text: 'Poll the API Every 5 Mins!',
		trigger: { mode: 'everyX', unit: 'minutes', value: 5 },
		description: 'Every 5 minutes',
		cron: '*/5 * * * *',
		matchedText: 'Every 5 Mins',
	},
	{
		text: 'every 1 minute',
		trigger: { mode: 'everyX', unit: 'minutes', value: 1 },
		description: 'Every 1 minute',
		cron: '*/1 * * * *',
		matchedText: 'every 1 minute',
	},
	{
		text: 'every 59min',
		trigger: { mode: 'everyX', unit: 'minutes', value: 59 },
		description: 'Every 59 minutes',
		cron: '*/59 * * * *',
		matchedText: 'every 59min',
	},
	{
		text: 'every 2 hours',
		trigger: { mode: 'everyX', unit: 'hours', value: 2 },
		description: 'Every 2 hours',
		cron: '0 */2 * * *',
		matchedText: 'every 2 hours',
	},
	{
		text: 'EVERY 23 HRS',
		trigger: { mode: 'everyX', unit: 'hours', value: 23 },
		description: 'Every 23 hours',
		cron: '0 */23 * * *',
		matchedText: 'EVERY 23 HRS',
	},
	{
		text: 'every 1 hour',
		trigger: { mode: 'everyX', unit: 'hours', value: 1 },
		description: 'Every 1 hour',
		cron: '0 */1 * * *',
		matchedText: 'every 1 hour',
	},
	{
		text: 'check the queue hourly',
		trigger: { mode: 'everyHour', minute: 0 },
		description: 'Every hour',
		cron: '0 * * * *',
		matchedText: 'hourly',
	},
	{
		text: 'every hour',
		trigger: { mode: 'everyHour', minute: 0 },
		description: 'Every hour',
		cron: '0 * * * *',
		matchedText: 'every hour',
	},
	// "every minute" has its own TriggerTime mode, so the description stays distinct from "every 1 minute".
	{
		text: 'ping it every minute',
		trigger: { mode: 'everyMinute' },
		description: 'Every minute',
		cron: '* * * * *',
		matchedText: 'every minute',
	},
	// Interval phrases take no time of day, so "at 9" stays out of the match.
	{
		text: 'every 2 hours at 9',
		trigger: { mode: 'everyX', unit: 'hours', value: 2 },
		description: 'Every 2 hours',
		cron: '0 */2 * * *',
		matchedText: 'every 2 hours',
	},
	// Days
	{
		text: 'every day',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'every day',
	},
	{
		text: 'Send me the summary daily.',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'daily',
	},
	{
		text: 'each day at 7:45',
		trigger: day(7, 45),
		description: 'Every day at 07:45',
		cron: '45 7 * * *',
		matchedText: 'each day at 7:45',
	},
	{
		text: 'every morning',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'every morning',
	},
	{
		text: 'every evening',
		trigger: day(18),
		description: 'Every day at 18:00',
		cron: '0 18 * * *',
		matchedText: 'every evening',
	},
	// Ambiguous: "at 7" has no am/pm. In the evening it can only mean 19:00.
	{
		text: 'every evening at 7',
		trigger: day(19),
		description: 'Every day at 19:00',
		cron: '0 19 * * *',
		matchedText: 'every evening at 7',
	},
	{
		text: 'each morning at 6:30am',
		trigger: day(6, 30),
		description: 'Every day at 06:30',
		cron: '30 6 * * *',
		matchedText: 'each morning at 6:30am',
	},
	// Ambiguous: a bare "at 8" uses the 24-hour clock, so it means 08:00 and not 20:00.
	{
		text: 'daily at 8',
		trigger: day(8),
		description: 'Every day at 08:00',
		cron: '0 8 * * *',
		matchedText: 'daily at 8',
	},
	{
		text: 'every day at 12am',
		trigger: day(0),
		description: 'Every day at 00:00',
		cron: '0 0 * * *',
		matchedText: 'every day at 12am',
	},
	{
		text: 'every day at 12pm',
		trigger: day(12),
		description: 'Every day at 12:00',
		cron: '0 12 * * *',
		matchedText: 'every day at 12pm',
	},
	{
		text: 'every day at 8.30',
		trigger: day(8, 30),
		description: 'Every day at 08:30',
		cron: '30 8 * * *',
		matchedText: 'every day at 8.30',
	},
	{
		text: 'every day at 8 a.m.',
		trigger: day(8),
		description: 'Every day at 08:00',
		cron: '0 8 * * *',
		matchedText: 'every day at 8 a.m.',
	},
	{
		text: 'every day at 8:00pm',
		trigger: day(20),
		description: 'Every day at 20:00',
		cron: '0 20 * * *',
		matchedText: 'every day at 8:00pm',
	},
	{
		text: 'Every Day, At 8',
		trigger: day(8),
		description: 'Every day at 08:00',
		cron: '0 8 * * *',
		matchedText: 'Every Day, At 8',
	},
	{
		text: 'at 9am every day',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'at 9am every day',
	},
	// Impossible times are ignored: the default time applies and the time stays out of the match.
	{
		text: 'every day at 13pm',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'every day',
	},
	{
		text: 'every day at 25:00',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'every day',
	},
	{
		text: 'every day at 6:75',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'every day',
	},
	// Weekdays
	{
		text: 'every weekday at 8',
		trigger: weekdays(8),
		description: 'Every weekday at 08:00',
		cron: '0 8 * * 1-5',
		matchedText: 'every weekday at 8',
	},
	{
		text: 'on weekdays at 6pm',
		trigger: weekdays(18),
		description: 'Every weekday at 18:00',
		cron: '0 18 * * 1-5',
		matchedText: 'on weekdays at 6pm',
	},
	{
		text: 'every working day',
		trigger: weekdays(9),
		description: 'Every weekday at 09:00',
		cron: '0 9 * * 1-5',
		matchedText: 'every working day',
	},
	{
		text: 'every business day at 17:15',
		trigger: weekdays(17, 15),
		description: 'Every weekday at 17:15',
		cron: '15 17 * * 1-5',
		matchedText: 'every business day at 17:15',
	},
	{
		text: 'every weekday morning',
		trigger: weekdays(9),
		description: 'Every weekday at 09:00',
		cron: '0 9 * * 1-5',
		matchedText: 'every weekday morning',
	},
	{
		text: 'Please summarise my inbox every weekday at 07:00, thanks',
		trigger: weekdays(7),
		description: 'Every weekday at 07:00',
		cron: '0 7 * * 1-5',
		matchedText: 'every weekday at 07:00',
	},
	// Named days
	{
		text: 'each Monday morning',
		trigger: week(1),
		description: 'Every Monday at 09:00',
		cron: '0 9 * * 1',
		matchedText: 'each Monday morning',
	},
	{
		text: 'can you send me this every Monday at 9 please?',
		trigger: week(1),
		description: 'Every Monday at 09:00',
		cron: '0 9 * * 1',
		matchedText: 'every Monday at 9',
	},
	{
		text: 'every Friday evening',
		trigger: week(5, 18),
		description: 'Every Friday at 18:00',
		cron: '0 18 * * 5',
		matchedText: 'every Friday evening',
	},
	{
		text: 'on Sundays at noon',
		trigger: week(0, 12),
		description: 'Every Sunday at 12:00',
		cron: '0 12 * * 0',
		matchedText: 'on Sundays at noon',
	},
	{
		text: 'every saturday at midnight',
		trigger: week(6, 0),
		description: 'Every Saturday at 00:00',
		cron: '0 0 * * 6',
		matchedText: 'every saturday at midnight',
	},
	{
		text: 'every Tuesdays at 14:00',
		trigger: week(2, 14),
		description: 'Every Tuesday at 14:00',
		cron: '0 14 * * 2',
		matchedText: 'every Tuesdays at 14:00',
	},
	{
		text: 'WEEKLY ON THURSDAYS',
		trigger: week(4),
		description: 'Every Thursday at 09:00',
		cron: '0 9 * * 4',
		matchedText: 'WEEKLY ON THURSDAYS',
	},
	{
		text: 'every week on Wednesday at 10am',
		trigger: week(3, 10),
		description: 'Every Wednesday at 10:00',
		cron: '0 10 * * 3',
		matchedText: 'every week on Wednesday at 10am',
	},
	// Ambiguous: a cron weekday field holds one day here, so only the first named day is kept.
	{
		text: 'every Monday and Thursday',
		trigger: week(1),
		description: 'Every Monday at 09:00',
		cron: '0 9 * * 1',
		matchedText: 'every Monday',
	},
	// Weeks and months
	{
		text: 'every week',
		trigger: week(1),
		description: 'Every Monday at 09:00',
		cron: '0 9 * * 1',
		matchedText: 'every week',
	},
	{
		text: 'run it weekly at 08:30',
		trigger: week(1, 8, 30),
		description: 'Every Monday at 08:30',
		cron: '30 8 * * 1',
		matchedText: 'weekly at 08:30',
	},
	{
		text: 'every month',
		trigger: month(1),
		description: 'Every month on day 1 at 09:00',
		cron: '0 9 1 * *',
		matchedText: 'every month',
	},
	{
		text: 'Monthly, please',
		trigger: month(1),
		description: 'Every month on day 1 at 09:00',
		cron: '0 9 1 * *',
		matchedText: 'Monthly',
	},
	{
		text: 'on the 15th of every month',
		trigger: month(15),
		description: 'Every month on day 15 at 09:00',
		cron: '0 9 15 * *',
		matchedText: 'on the 15th of every month',
	},
	{
		text: 'every month on the 15th at 6pm',
		trigger: month(15, 18),
		description: 'Every month on day 15 at 18:00',
		cron: '0 18 15 * *',
		matchedText: 'every month on the 15th at 6pm',
	},
	{
		text: 'monthly on the 1st',
		trigger: month(1),
		description: 'Every month on day 1 at 09:00',
		cron: '0 9 1 * *',
		matchedText: 'monthly on the 1st',
	},
	{
		text: 'the 28th of each month',
		trigger: month(28),
		description: 'Every month on day 28 at 09:00',
		cron: '0 9 28 * *',
		matchedText: 'the 28th of each month',
	},
	// First match in the text wins.
	{
		text: 'every 15 minutes or every day',
		trigger: { mode: 'everyX', unit: 'minutes', value: 15 },
		description: 'Every 15 minutes',
		cron: '*/15 * * * *',
		matchedText: 'every 15 minutes',
	},
	{
		text: 'every day, and every 15 minutes',
		trigger: day(9),
		description: 'Every day at 09:00',
		cron: '0 9 * * *',
		matchedText: 'every day',
	},
	// A rejected adjective ("daily standup") does not hide a later schedule phrase.
	{
		text: 'post the daily standup notes every weekday at 9:15',
		trigger: weekdays(9, 15),
		description: 'Every weekday at 09:15',
		cron: '15 9 * * 1-5',
		matchedText: 'every weekday at 9:15',
	},
];

const NEGATIVE_CASES = [
	'',
	'every time I ask',
	"monday's report",
	'at 8',
	'every one of them',
	'each item',
	'check it again',
	'the daily standup notes',
	'every single row',
	'weekly report attached',
	'hour by hour',
	// Out of range intervals have no exact equivalent in a schedule trigger.
	'every 0 minutes',
	'every 60 minutes',
	'every 24 hours',
	// Day 29 and later does not occur in every month.
	'on the 31st of every month',
	'every month on the 29th',
	'monthly on day 30',
	// Not supported: these have no exact equivalent in a schedule trigger.
	'every other day',
	'every weekend',
	'every 2 days',
	// Ambiguous: a single "on Monday" is a one-off date, not a schedule.
	'on Monday',
	// Not supported: numbers in words.
	'every two hours',
	// "everyday" is an adjective ("everyday tasks"), not "every day".
	'everyday tasks',
	'send daily emails',
	'the monthly-report is late',
];

describe('parseSchedulePhrase', () => {
	it.each(POSITIVE_CASES)('parses "$text"', ({ text, trigger, description, cron, matchedText }) => {
		const result = parseSchedulePhrase(text);

		expect(result).toEqual({ trigger, description, matchedText });
		expect(scheduleToCron(trigger)).toBe(cron);
		expect(text).toContain(matchedText);
	});

	it.each(NEGATIVE_CASES)('returns undefined for "%s"', (text) => {
		expect(parseSchedulePhrase(text)).toBeUndefined();
	});

	it.each(POSITIVE_CASES)('parses its own description for "$text"', ({ trigger, description }) => {
		expect(parseSchedulePhrase(description)?.trigger).toEqual(trigger);
	});

	it('returns undefined instead of throwing for non-string input', () => {
		expect(parseSchedulePhrase(undefined as unknown as string)).toBeUndefined();
		expect(parseSchedulePhrase(null as unknown as string)).toBeUndefined();
		expect(parseSchedulePhrase(42 as unknown as string)).toBeUndefined();
	});

	it('finds a phrase at the end of a very long message', () => {
		const text = `${'lorem ipsum '.repeat(5_000)}every Friday at 17:30`;

		expect(parseSchedulePhrase(text)?.trigger).toEqual(week(5, 17, 30));
	});

	it('keeps a valid time that comes before the phrase when the time after it is impossible', () => {
		expect(parseSchedulePhrase('at 7 every day at 25:00')).toEqual({
			trigger: day(7),
			description: 'Every day at 07:00',
			matchedText: 'at 7 every day',
		});
	});

	it('prefers the time after the phrase to the time before it', () => {
		expect(parseSchedulePhrase('at 7 every day at 8')?.trigger).toEqual(day(8));
	});

	it('keeps an explicit morning time in the evening', () => {
		expect(parseSchedulePhrase('every evening at 7am')?.trigger).toEqual(day(7));
		expect(parseSchedulePhrase('every evening at noon')?.trigger).toEqual(day(12));
		expect(parseSchedulePhrase('every evening at 12')?.trigger).toEqual(day(12));
	});

	it('uses a later schedule when an earlier day of the month is invalid', () => {
		expect(parseSchedulePhrase('every month on the 31st, or every day')?.trigger).toEqual(day(9));
	});
});

describe('scheduleToCron', () => {
	it('builds a cron for modes that the parser does not return', () => {
		expect(scheduleToCron({ mode: 'everyHour', minute: 30 })).toBe('30 * * * *');
		expect(
			scheduleToCron({ mode: 'custom', cronExpression: ' 0 9 * * 1 ' as CronExpression }),
		).toBe('0 9 * * 1');
	});

	it('gives the same cron each time for the same trigger', () => {
		const trigger: ScheduleTrigger = { mode: 'everyX', unit: 'hours', value: 6 };

		expect(scheduleToCron(trigger)).toBe(scheduleToCron(trigger));
		expect(scheduleToCron(trigger)).toBe('0 */6 * * *');
	});
});

describe('describeSchedule', () => {
	it('describes modes that the parser does not return', () => {
		expect(describeSchedule({ mode: 'everyHour', minute: 30 })).toBe(
			'Every hour at 30 minutes past the hour',
		);
		expect(
			describeSchedule({ mode: 'custom', cronExpression: '0 9 * * 1 ' as CronExpression }),
		).toBe('Custom schedule (0 9 * * 1)');
	});

	it('names an out-of-range weekday by its number', () => {
		expect(describeSchedule(week(7))).toBe('Every day 7 at 09:00');
		expect(describeSchedule(week(1.5))).toBe('Every day 1.5 at 09:00');
		expect(describeSchedule(week(-1))).toBe('Every day -1 at 09:00');
	});
});
