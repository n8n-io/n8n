import fc from 'fast-check';

import { automationProposalCardSchema } from '@n8n/api-types';

import {
	chooseCron,
	isFiveFieldCron,
	readTriggerSchedule,
	type ScheduleGap,
	type ScheduleNode,
	scheduleTimezoneOf,
	type TriggerSchedule,
	triggerCronOf,
} from '../automation-schedule';
import type { AutomationTrigger } from '../automation-trigger';

const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
const CRON_NODE = 'n8n-nodes-base.cron';
const WEBHOOK = 'n8n-nodes-base.webhook';
const MANUAL = 'n8n-nodes-base.manualTrigger';
const SLACK = 'n8n-nodes-base.slack';

const scheduleTrigger: AutomationTrigger = {
	kind: 'schedule',
	node: { name: 'Every weekday', type: SCHEDULE },
	canActivate: true,
};
const manualTrigger: AutomationTrigger = { kind: 'manual', canActivate: false };

const cronRule = (expression: unknown) => ({
	rule: { interval: [{ field: 'cronExpression', expression }] },
});

const intervalRule = (rule: Record<string, unknown>) => ({ rule: { interval: [rule] } });

const scheduleNode = (
	parameters: unknown,
	overrides: Partial<ScheduleNode> = {},
): ScheduleNode => ({
	name: 'Every weekday',
	type: SCHEDULE,
	parameters,
	...overrides,
});

const cronOf = (parameters: unknown) => triggerCronOf([scheduleNode(parameters)], scheduleTrigger);

const LONDON = 'Europe/London';
const NEW_YORK = 'America/New_York';

const differs = (given: string, used: string) =>
	`Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${used}".`;

const unreadable = (given: string) =>
	`Ignored the cron expression "${given}". The card shows only a schedule that it reads from the trigger, and no single five-field cron expression says when this schedule trigger runs.`;

const notASchedule = (given: string) =>
	`Ignored the cron expression "${given}", because the workflow does not start with a schedule trigger.`;

const otherStarters = (given: string) =>
	`Ignored the cron expression "${given}", because another trigger also starts the workflow. The card shows a schedule only when the schedule trigger alone starts the workflow.`;

const invalidZone = (given: string) =>
	`Ignored the cron expression "${given}", because the time zone in the workflow settings is not valid.`;

const notValid = (given: string) =>
	` The cron expression "${given}" is not a valid five-field cron expression.`;

// Valid five-field crons of exactly 100 and 101 characters, at the limit of the card.
const MINUTES = Array.from({ length: 34 }, (_, minute) => minute).join(',');
const CRON_OF_100 = `${MINUTES} 18 * * *`;
const CRON_OF_101 = `${MINUTES} 18 10 * *`;

describe('isFiveFieldCron', () => {
	it.each(['0 8 * * 1-5', '*/5 * * * *', '30 23 1 * *'])('accepts %j', (cron) => {
		expect(isFiveFieldCron(cron)).toBe(true);
	});

	it.each([
		['six fields with seconds', '0 0 8 * * 1-5'],
		['four fields', '* * * *'],
		['a nickname', '@daily'],
		['a minute out of range', '61 * * * *'],
		['a date that never comes', '0 9 30 2 *'],
		['words', 'every weekday at 8'],
		['nothing', ''],
	])('rejects %s', (_label, cron) => {
		expect(isFiveFieldCron(cron)).toBe(false);
	});
});

describe('triggerCronOf', () => {
	describe('with a cron rule', () => {
		it('reads the one cron rule of the Schedule Trigger', () => {
			expect(cronOf(cronRule('0 8 * * 1-5'))).toBe('0 8 * * 1-5');
		});

		it('puts one space between the fields of the rule', () => {
			expect(cronOf(cronRule('  0   8 *\t* 1-5 '))).toBe('0 8 * * 1-5');
		});

		it.each([
			['an expression', '={{ $json.cron }}'],
			['an expression that looks like a cron', '=0 8 * * *'],
			['a blank cron', '   '],
			['no cron', undefined],
			['a cron that is not text', 8],
			['a cron with seconds', '0 0 8 * * 1-5'],
			['words', 'every weekday at 8'],
			['a cron that is longer than the card shows', CRON_OF_101],
		])('returns nothing for %s', (_label, expression) => {
			expect(cronOf(cronRule(expression))).toBeUndefined();
		});

		it('reads a cron of 100 characters, the most that the card shows', () => {
			expect(CRON_OF_100).toHaveLength(100);
			expect(cronOf(cronRule(CRON_OF_100))).toBe(CRON_OF_100);
		});

		it('rejects the cron of 101 characters only because of its length', () => {
			expect(CRON_OF_101).toHaveLength(101);
			expect(isFiveFieldCron(CRON_OF_101)).toBe(true);
		});
	});

	describe('with the defaults of n8n', () => {
		// n8n fills in each value that the stored workflow leaves out: a rule of days, at hour 0
		// and minute 0. These values come from the Schedule Trigger node.
		it.each([
			['no parameters', undefined],
			['empty parameters', {}],
			['an empty interval', { rule: { interval: [{}] } }],
			['a rule of days without values', intervalRule({ field: 'days' })],
		])('runs every day at midnight with %s', (_label, parameters) => {
			expect(cronOf(parameters)).toBe('0 0 * * *');
		});

		// The editor stores `rule: {}` when the user deletes the last rule. n8n adds no defaults
		// to it, and takes the hour and the minute from the ids of the workflow and the node.
		it.each([
			['a rule without an interval', { rule: {} }],
			['an interval that is not set', { rule: { interval: undefined } }],
			['an interval of null', { rule: { interval: null } }],
		])('returns nothing for %s, which n8n runs at a time of its own', (_label, parameters) => {
			expect(cronOf(parameters)).toBeUndefined();
		});
	});

	describe('with an interval rule', () => {
		it.each([
			['every five minutes by default', { field: 'minutes' }, '*/5 * * * *'],
			['every minute', { field: 'minutes', minutesInterval: 1 }, '* * * * *'],
			['every 15 minutes', { field: 'minutes', minutesInterval: 15 }, '*/15 * * * *'],
			['every hour by default', { field: 'hours' }, '0 * * * *'],
			['every hour at minute 30', { field: 'hours', triggerAtMinute: 30 }, '30 * * * *'],
			[
				'every 6 hours at minute 15',
				{ field: 'hours', hoursInterval: 6, triggerAtMinute: 15 },
				'15 */6 * * *',
			],
			['every day at 8', { field: 'days', triggerAtHour: 8 }, '0 8 * * *'],
			[
				'every day at 8:30',
				{ field: 'days', daysInterval: 1, triggerAtHour: 8, triggerAtMinute: 30 },
				'30 8 * * *',
			],
			['every Sunday at midnight by default', { field: 'weeks' }, '0 0 * * 0'],
			[
				'every weekday at 9',
				{ field: 'weeks', triggerAtDay: [1, 2, 3, 4, 5], triggerAtHour: 9 },
				'0 9 * * 1,2,3,4,5',
			],
			[
				'every day of a week without chosen days',
				{ field: 'weeks', triggerAtDay: [], triggerAtHour: 9 },
				'0 9 * * *',
			],
			[
				'chosen days in order, each one time',
				{ field: 'weeks', triggerAtDay: [5, 1, 3, 1, 5], triggerAtHour: 9 },
				'0 9 * * 1,3,5',
			],
			[
				'days that sort by number, not by text',
				{ field: 'weeks', triggerAtDay: [6, 0, 2] },
				'0 0 * * 0,2,6',
			],
			['the first day of each month by default', { field: 'months' }, '0 0 1 * *'],
			[
				'every 3 months on day 15 at 7:45',
				{
					field: 'months',
					monthsInterval: 3,
					triggerAtDayOfMonth: 15,
					triggerAtHour: 7,
					triggerAtMinute: 45,
				},
				'45 7 15 */3 *',
			],
			['once a year', { field: 'months', monthsInterval: 12 }, '0 0 1 */12 *'],
		])('reads %s', (_label, rule, cron) => {
			expect(cronOf(intervalRule(rule))).toBe(cron);
		});

		it('reads a week rule that repeats one day many times as a short cron the card accepts', () => {
			const cron = cronOf(intervalRule({ field: 'weeks', triggerAtDay: Array(60).fill(1) }));

			expect(cron).toBe('0 0 * * 1');
			const trigger = { kind: 'schedule', cron, timezone: LONDON };
			expect(automationProposalCardSchema.shape.trigger.safeParse(trigger).success).toBe(true);
		});

		it.each([
			['seconds', { field: 'seconds', secondsInterval: 30 }],
			['minutes that do not divide the hour', { field: 'minutes', minutesInterval: 7 }],
			['hours that do not divide the day', { field: 'hours', hoursInterval: 5 }],
			['more than one day', { field: 'days', daysInterval: 2, triggerAtHour: 8 }],
			['more than one week', { field: 'weeks', weeksInterval: 2 }],
			['months that do not divide the year', { field: 'months', monthsInterval: 5 }],
			['months over a year', { field: 'months', monthsInterval: 24 }],
		])('returns nothing for %s, which n8n runs with skips', (_label, rule) => {
			expect(cronOf(intervalRule(rule))).toBeUndefined();
		});

		it.each([
			['an expression for the hour', { field: 'days', triggerAtHour: '={{ 8 }}' }],
			['an hour as text', { field: 'days', triggerAtHour: '8' }],
			['hour 24', { field: 'days', triggerAtHour: 24 }],
			['a negative minute', { field: 'hours', triggerAtMinute: -1 }],
			['minute 60', { field: 'hours', triggerAtMinute: 60 }],
			['a minute that is not whole', { field: 'hours', triggerAtMinute: 7.5 }],
			['zero minutes', { field: 'minutes', minutesInterval: 0 }],
			['60 minutes', { field: 'minutes', minutesInterval: 60 }],
			['24 hours', { field: 'hours', hoursInterval: 24 }],
			['32 days', { field: 'days', daysInterval: 32 }],
			['zero weeks', { field: 'weeks', weeksInterval: 0 }],
			['zero months', { field: 'months', monthsInterval: 0 }],
			['day of week 7', { field: 'weeks', triggerAtDay: [7] }],
			['day of month 0', { field: 'months', triggerAtDayOfMonth: 0 }],
			['day of month 32', { field: 'months', triggerAtDayOfMonth: 32 }],
			['an unknown interval', { field: 'years' }],
			['a rule that is not an object', 'daily'],
		])('returns nothing for a value that n8n does not accept: %s', (_label, rule) => {
			expect(cronOf({ rule: { interval: [rule] } })).toBeUndefined();
		});
	});

	describe('returns nothing for a Schedule Trigger with', () => {
		it.each([
			[
				'two rules',
				{
					rule: {
						interval: [
							{ field: 'days', triggerAtHour: 8 },
							{ field: 'days', triggerAtHour: 17 },
						],
					},
				},
			],
			['no rules', { rule: { interval: [] } }],
			['rules in an expression', { rule: '={{ $json.rules }}' }],
			['an interval in an expression', { rule: { interval: '={{ $json.interval }}' } }],
			['parameters that are not an object', 'daily'],
		])('%s', (_label, parameters) => {
			expect(cronOf(parameters)).toBeUndefined();
		});
	});

	describe('trigger nodes', () => {
		it('reads the trigger node, not a disabled schedule node', () => {
			const nodes = [
				scheduleNode(cronRule('0 9 * * *'), { name: 'Old schedule', disabled: true }),
				scheduleNode(cronRule('0 8 * * 1-5')),
			];

			expect(triggerCronOf(nodes, scheduleTrigger)).toBe('0 8 * * 1-5');
		});

		it('still reads the schedule when the workflow also has a manual trigger', () => {
			const nodes = [
				{ name: 'Click', type: MANUAL },
				scheduleNode(cronRule('0 8 * * 1-5')),
				{ name: 'Send', type: SLACK },
			];

			expect(triggerCronOf(nodes, scheduleTrigger)).toBe('0 8 * * 1-5');
		});

		it.each([
			[
				'a second schedule trigger',
				scheduleNode(intervalRule({ field: 'minutes' }), { name: 'B' }),
			],
			['a webhook', { name: 'Hook', type: WEBHOOK }],
		])('returns nothing when %s also starts the workflow', (_label, other) => {
			const nodes = [scheduleNode(cronRule('0 8 * * 1-5')), other];

			expect(triggerCronOf(nodes, scheduleTrigger)).toBeUndefined();
		});

		it('returns nothing for a trigger that is not a Schedule Trigger', () => {
			const nodes = [scheduleNode(cronRule('0 8 * * *'), { type: CRON_NODE })];
			const trigger: AutomationTrigger = {
				kind: 'schedule',
				node: { name: 'Every weekday', type: CRON_NODE },
				canActivate: true,
			};

			expect(triggerCronOf(nodes, trigger)).toBeUndefined();
		});

		it('returns nothing for a workflow without a trigger node', () => {
			const nodes = [scheduleNode(cronRule('0 8 * * *'), { type: SLACK })];

			expect(triggerCronOf(nodes, manualTrigger)).toBeUndefined();
		});
	});
});

describe('scheduleTimezoneOf', () => {
	it('takes the time zone of the workflow settings', () => {
		expect(scheduleTimezoneOf({ timezone: LONDON }, NEW_YORK)).toBe(LONDON);
	});

	it.each([
		['no settings', undefined],
		['settings without a time zone', { availableInMCP: true }],
		['the default marker', { timezone: 'DEFAULT' }],
		['an empty time zone', { timezone: '' }],
		['a time zone that is not text', { timezone: 1 }],
		['settings that are not an object', 'Europe/London'],
	])('takes the default time zone of the instance for %s', (_label, settings) => {
		expect(scheduleTimezoneOf(settings, NEW_YORK)).toBe(NEW_YORK);
	});

	it.each([
		['a workflow', { timezone: 'Mars/Olympus_Mons' }, NEW_YORK],
		['the instance', {}, 'Not/A_Zone'],
	])('returns nothing for a time zone of %s that does not exist', (_label, settings, zone) => {
		expect(scheduleTimezoneOf(settings, zone)).toBeUndefined();
	});
});

describe('readTriggerSchedule', () => {
	const read = (nodes: ScheduleNode[], settings?: unknown, trigger = scheduleTrigger) =>
		readTriggerSchedule({ nodes, settings }, trigger, NEW_YORK);

	it('reads the cron of the trigger and the time zone of the workflow', () => {
		const schedule = read([scheduleNode(cronRule('0 8 * * 1-5'))], { timezone: LONDON });

		expect(schedule).toStrictEqual({ cron: '0 8 * * 1-5', timezone: LONDON });
	});

	it('uses the default time zone of the instance when the workflow sets none', () => {
		expect(read([scheduleNode(cronRule('0 8 * * 1-5'))])).toStrictEqual({
			cron: '0 8 * * 1-5',
			timezone: NEW_YORK,
		});
	});

	it.each<[string, ScheduleNode[], AutomationTrigger, TriggerSchedule]>([
		[
			'a trigger that is not a schedule',
			[{ name: 'Hook', type: WEBHOOK }],
			{ kind: 'webhook', node: { name: 'Hook', type: WEBHOOK }, canActivate: true },
			{ gap: 'not-schedule' },
		],
		[
			'a schedule node behind a trigger of another kind',
			[scheduleNode(cronRule('0 8 * * *'))],
			{ kind: 'webhook', node: { name: 'Every weekday', type: SCHEDULE }, canActivate: true },
			{ gap: 'not-schedule' },
		],
		[
			'a second trigger',
			[scheduleNode(cronRule('0 8 * * 1-5')), { name: 'Hook', type: WEBHOOK }],
			scheduleTrigger,
			{ gap: 'other-starters' },
		],
		[
			'a second trigger and two rules',
			[
				scheduleNode({ rule: { interval: [{ field: 'days' }, { field: 'weeks' }] } }),
				{ name: 'Hook', type: WEBHOOK },
			],
			scheduleTrigger,
			{ gap: 'other-starters' },
		],
		[
			'two rules',
			[scheduleNode({ rule: { interval: [{ field: 'days' }, { field: 'weeks' }] } })],
			scheduleTrigger,
			{ gap: 'unreadable' },
		],
		[
			'the legacy cron node',
			[scheduleNode(cronRule('0 8 * * *'), { type: CRON_NODE })],
			{ kind: 'schedule', node: { name: 'Every weekday', type: CRON_NODE }, canActivate: true },
			{ gap: 'unreadable' },
		],
	])('says why it shows no schedule for %s', (_label, nodes, trigger, gap) => {
		expect(read(nodes, { timezone: LONDON }, trigger)).toStrictEqual(gap);
	});

	it('shows no schedule when the time zone of the workflow does not exist', () => {
		const schedule = read([scheduleNode(cronRule('0 8 * * 1-5'))], {
			timezone: 'Mars/Olympus_Mons',
		});

		expect(schedule).toStrictEqual({ gap: 'invalid-timezone' });
	});
});

describe('chooseCron', () => {
	const weekdays: TriggerSchedule = { cron: '0 8 * * 1-5', timezone: LONDON };

	describe('with a schedule that the server read from the workflow', () => {
		it('shows the schedule of the trigger', () => {
			expect(chooseCron(undefined, weekdays)).toStrictEqual({ shown: weekdays });
		});

		it('shows the schedule without a warning when the model gives the same cron', () => {
			expect(chooseCron(' 0 8  * * 1-5', weekdays)).toStrictEqual({ shown: weekdays });
		});

		it('shows the schedule of the trigger and warns when the model gives another cron', () => {
			expect(chooseCron('0 9 * * *', weekdays)).toStrictEqual({
				shown: weekdays,
				warning: differs('0 9 * * *', '0 8 * * 1-5'),
			});
		});

		it.each(['every day at 9', '0 0 8 * * 1-5', '0 25 * * *'])(
			'also says that the cron %j of the model is not valid',
			(given) => {
				expect(chooseCron(given, weekdays)).toStrictEqual({
					shown: weekdays,
					warning: differs(given, '0 8 * * 1-5') + notValid(given),
				});
			},
		);
	});

	describe('without a schedule from the workflow', () => {
		it.each([
			['no cron', undefined],
			['an empty cron', ''],
			['a blank cron', '   '],
		])('shows nothing and says nothing for %s', (_label, cron) => {
			expect(chooseCron(cron, { gap: 'unreadable' })).toStrictEqual({});
		});

		it.each<[ScheduleGap, (given: string) => string]>([
			['not-schedule', notASchedule],
			['other-starters', otherStarters],
			['unreadable', unreadable],
			['invalid-timezone', invalidZone],
		])('never shows the cron of the model, and says why for the gap %s', (gap, warning) => {
			expect(chooseCron('0 8 * * 1-5', { gap })).toStrictEqual({
				warning: warning('0 8 * * 1-5'),
			});
		});

		it.each(['every weekday at 8', '@daily'])(
			'also says that the cron %j of the model is not valid',
			(given) => {
				expect(chooseCron(given, { gap: 'unreadable' })).toStrictEqual({
					warning: unreadable(given) + notValid(given),
				});
			},
		);

		it('puts the cron of the model in the warning with one space between its fields', () => {
			expect(chooseCron(' 0  8 * * 1-5 ', { gap: 'unreadable' })).toStrictEqual({
				warning: unreadable('0 8 * * 1-5'),
			});
		});
	});

	it('shows only the schedule of the workflow, and warns exactly when the model differs (property)', () => {
		const cronArb = fc.oneof(
			fc.constantFrom('0 8 * * 1-5', '0 0 8 * * 1-5', '@daily', ' 5 4 * * * ', ''),
			fc.string({ maxLength: 20 }),
		);
		const scheduleArb = fc.constantFrom<TriggerSchedule>(
			{ cron: '0 8 * * 1-5', timezone: LONDON },
			{ cron: '*/5 * * * *', timezone: NEW_YORK },
			{ gap: 'not-schedule' },
			{ gap: 'other-starters' },
			{ gap: 'unreadable' },
			{ gap: 'invalid-timezone' },
		);
		fc.assert(
			fc.property(fc.option(cronArb, { nil: undefined }), scheduleArb, (given, schedule) => {
				const choice = chooseCron(given, schedule);
				const shown = 'cron' in schedule ? schedule : undefined;
				const normalised = (given ?? '').trim().split(/\s+/).join(' ');
				const differsFromTrigger = normalised !== '' && normalised !== shown?.cron;

				expect(choice.shown).toStrictEqual(shown);
				expect(choice.warning !== undefined).toBe(differsFromTrigger);
				if (choice.warning !== undefined) {
					expect(choice.warning.endsWith(notValid(normalised))).toBe(!isFiveFieldCron(normalised));
				}
			}),
			{ numRuns: 300 },
		);
	});
});
