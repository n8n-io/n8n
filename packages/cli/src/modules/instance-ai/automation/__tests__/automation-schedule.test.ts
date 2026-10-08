import fc from 'fast-check';

import {
	chooseCron,
	isFiveFieldCron,
	type ScheduleNode,
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

const differs = (given: string, used: string) =>
	`Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${used}".`;

const unreadable = (given: string) =>
	`Ignored the cron expression "${given}". The card shows only a schedule that it reads from the trigger, and no single five-field cron expression says when this schedule trigger runs.`;

const NOT_A_SCHEDULE =
	'Ignored the cron expression, because the workflow does not start with a schedule trigger.';

// A valid five-field cron that is longer than the card shows: sixty minute values.
const LONG_CRON = `${Array.from({ length: 60 }, (_, minute) => minute).join(',')} 8 * * *`;

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
			['a cron that is longer than the card shows', LONG_CRON],
		])('returns nothing for %s', (_label, expression) => {
			expect(cronOf(cronRule(expression))).toBeUndefined();
		});

		it('rejects the long cron only because of its length', () => {
			expect(isFiveFieldCron(LONG_CRON)).toBe(true);
			expect(LONG_CRON.length).toBeGreaterThan(100);
		});
	});

	describe('with the defaults of n8n', () => {
		// n8n fills in each value that the stored workflow leaves out: a rule of days, at hour 0
		// and minute 0. These values come from the Schedule Trigger node.
		it.each([
			['no parameters', undefined],
			['empty parameters', {}],
			['an empty rule', { rule: {} }],
			['an empty interval', { rule: { interval: [{}] } }],
			['a rule of days without values', intervalRule({ field: 'days' })],
		])('runs every day at midnight with %s', (_label, parameters) => {
			expect(cronOf(parameters)).toBe('0 0 * * *');
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
			['a second schedule trigger', scheduleNode(intervalRule({ field: 'minutes' }), { name: 'B' })],
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

describe('chooseCron', () => {
	describe('with a cron that the server read from the trigger', () => {
		it('shows the cron of the trigger', () => {
			expect(chooseCron(scheduleTrigger, undefined, '0 8 * * 1-5')).toStrictEqual({
				cron: '0 8 * * 1-5',
			});
		});

		it('shows the cron without a warning when the model gives the same cron', () => {
			expect(chooseCron(scheduleTrigger, ' 0 8  * * 1-5', '0 8 * * 1-5')).toStrictEqual({
				cron: '0 8 * * 1-5',
			});
		});

		it.each(['0 9 * * *', 'every day at 9', '0 0 8 * * 1-5'])(
			'shows the cron of the trigger and warns when the model gives %j',
			(given) => {
				expect(chooseCron(scheduleTrigger, given, '0 8 * * 1-5')).toStrictEqual({
					cron: '0 8 * * 1-5',
					warning: differs(given, '0 8 * * 1-5'),
				});
			},
		);
	});

	describe('without a cron from the trigger', () => {
		it.each([
			['no cron', undefined],
			['an empty cron', ''],
			['a blank cron', '   '],
		])('shows nothing and says nothing for %s', (_label, cron) => {
			expect(chooseCron(scheduleTrigger, cron, undefined)).toStrictEqual({});
		});

		it.each(['0 8 * * 1-5', 'every weekday at 8', '@daily'])(
			'never shows the cron %j of the model, and warns',
			(given) => {
				expect(chooseCron(scheduleTrigger, given, undefined)).toStrictEqual({
					warning: unreadable(given),
				});
			},
		);

		it('puts the cron of the model in the warning with one space between its fields', () => {
			expect(chooseCron(scheduleTrigger, ' 0  8 * * 1-5 ', undefined)).toStrictEqual({
				warning: unreadable('0 8 * * 1-5'),
			});
		});
	});

	describe('for a trigger that is not a schedule', () => {
		it.each<AutomationTrigger>([
			manualTrigger,
			{ kind: 'webhook', canActivate: true },
			{ kind: 'app-event', canActivate: true },
		])('ignores a cron of a $kind trigger, with a warning', (trigger) => {
			expect(chooseCron(trigger, '0 8 * * 1-5', undefined)).toStrictEqual({
				warning: NOT_A_SCHEDULE,
			});
		});

		it('says nothing when the model gives no cron', () => {
			expect(chooseCron(manualTrigger, '  ', undefined)).toStrictEqual({});
		});
	});

	it('shows only the cron of the trigger, and warns exactly when the model differs (property)', () => {
		const cronArb = fc.oneof(
			fc.constantFrom('0 8 * * 1-5', '0 0 8 * * 1-5', '@daily', ' 5 4 * * * ', ''),
			fc.string({ maxLength: 20 }),
		);
		fc.assert(
			fc.property(
				fc.option(cronArb, { nil: undefined }),
				fc.option(fc.constantFrom('0 8 * * 1-5', '*/5 * * * *'), { nil: undefined }),
				(given, triggerCron) => {
					const choice = chooseCron(scheduleTrigger, given, triggerCron);
					const normalised = (given ?? '').trim().split(/\s+/).join(' ');
					const differsFromTrigger = normalised !== '' && normalised !== triggerCron;

					expect(choice.cron).toBe(triggerCron);
					expect(choice.warning !== undefined).toBe(differsFromTrigger);
				},
			),
			{ numRuns: 300 },
		);
	});
});
