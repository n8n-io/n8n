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
const SLACK = 'n8n-nodes-base.slack';

const scheduleTrigger: AutomationTrigger = {
	kind: 'schedule',
	node: { name: 'Every weekday', type: SCHEDULE },
	canActivate: true,
};
const manualTrigger: AutomationTrigger = { kind: 'manual', canActivate: false };

const cronRule = (expression: string) => ({
	rule: { interval: [{ field: 'cronExpression', expression }] },
});

const scheduleNode = (
	parameters: unknown,
	overrides: Partial<ScheduleNode> = {},
): ScheduleNode => ({
	name: 'Every weekday',
	type: SCHEDULE,
	parameters,
	...overrides,
});

const notValid = (cron: string) =>
	`Ignored the cron expression "${cron}", because it is not a valid five-field cron expression.`;

const differs = (given: string, used: string) =>
	`Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${used}".`;

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
	it('reads the one cron rule of the Schedule Trigger', () => {
		const nodes = [scheduleNode(cronRule('0 8 * * 1-5'))];

		expect(triggerCronOf(nodes, scheduleTrigger)).toBe('0 8 * * 1-5');
	});

	it('puts one space between the fields of the rule', () => {
		const nodes = [scheduleNode(cronRule('  0   8 *\t* 1-5 '))];

		expect(triggerCronOf(nodes, scheduleTrigger)).toBe('0 8 * * 1-5');
	});

	it('reads the trigger node, not another schedule node', () => {
		const nodes = [
			scheduleNode(cronRule('0 9 * * *'), { name: 'Other schedule' }),
			scheduleNode(cronRule('0 8 * * 1-5')),
		];

		expect(triggerCronOf(nodes, scheduleTrigger)).toBe('0 8 * * 1-5');
	});

	it.each([
		[
			'two rules',
			{
				rule: {
					interval: [
						cronRule('0 8 * * *').rule.interval[0],
						cronRule('0 9 * * *').rule.interval[0],
					],
				},
			},
		],
		['an interval rule', { rule: { interval: [{ field: 'hours', hoursInterval: 2 }] } }],
		['no rules', { rule: { interval: [] } }],
		['no rule', {}],
		['no parameters', undefined],
		['an expression', cronRule('={{ $json.cron }}')],
		['a blank cron', cronRule('   ')],
		[
			'a cron that is not text',
			{ rule: { interval: [{ field: 'cronExpression', expression: 8 }] } },
		],
	])('returns nothing for a Schedule Trigger with %s', (_label, parameters) => {
		expect(triggerCronOf([scheduleNode(parameters)], scheduleTrigger)).toBeUndefined();
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

describe('chooseCron', () => {
	describe('without a cron rule in the trigger', () => {
		it.each([
			['no cron', undefined],
			['an empty cron', ''],
			['a blank cron', '   '],
		])('returns nothing for %s', (_label, cron) => {
			expect(chooseCron(scheduleTrigger, cron, undefined)).toStrictEqual({});
		});

		it('keeps a valid cron of the model with one space between its fields', () => {
			expect(chooseCron(scheduleTrigger, ' 0  8 * * 1-5 ', undefined)).toStrictEqual({
				cron: '0 8 * * 1-5',
			});
		});

		it.each([
			'every weekday at 8',
			'0 9 30 2 *',
			'@daily',
			'* * * *',
			'61 * * * *',
			'0 0 8 * * 1-5',
		])('ignores the cron %j that is not a valid five-field cron, with a warning', (cron) => {
			expect(chooseCron(scheduleTrigger, cron, undefined)).toStrictEqual({
				warning: notValid(cron),
			});
		});
	});

	describe('with a cron rule in the trigger', () => {
		it('shows the rule of the trigger', () => {
			expect(chooseCron(scheduleTrigger, undefined, '0 8 * * 1-5')).toStrictEqual({
				cron: '0 8 * * 1-5',
			});
		});

		it('shows the rule without a warning when the model gives the same cron', () => {
			expect(chooseCron(scheduleTrigger, ' 0 8  * * 1-5', '0 8 * * 1-5')).toStrictEqual({
				cron: '0 8 * * 1-5',
			});
		});

		it.each(['0 9 * * *', 'every day at 9'])(
			'shows the rule and warns when the model gives %j',
			(given) => {
				expect(chooseCron(scheduleTrigger, given, '0 8 * * 1-5')).toStrictEqual({
					cron: '0 8 * * 1-5',
					warning: differs(given, '0 8 * * 1-5'),
				});
			},
		);

		it('shows no cron for a rule with seconds, which the card cannot show', () => {
			expect(chooseCron(scheduleTrigger, undefined, '0 0 8 * * 1-5')).toStrictEqual({});
		});

		it('warns about the cron of the model also when the card cannot show the rule', () => {
			expect(chooseCron(scheduleTrigger, '0 8 * * 1-5', '0 0 8 * * 1-5')).toStrictEqual({
				warning: differs('0 8 * * 1-5', '0 0 8 * * 1-5'),
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
				warning:
					'Ignored the cron expression, because the workflow does not start with a schedule trigger.',
			});
		});

		it('says nothing when the model gives no cron', () => {
			expect(chooseCron(manualTrigger, '  ', undefined)).toStrictEqual({});
		});
	});

	it('never shows a cron that is not a valid five-field cron (property)', () => {
		const cronArb = fc.oneof(
			fc.constantFrom('0 8 * * 1-5', '0 0 8 * * 1-5', '@daily', ' 5 4 * * * ', ''),
			fc.string({ maxLength: 20 }),
		);
		fc.assert(
			fc.property(
				fc.option(cronArb, { nil: undefined }),
				fc.option(
					cronArb.map((cron) => cron.trim()),
					{ nil: undefined },
				),
				(given, triggerCron) => {
					const { cron } = chooseCron(scheduleTrigger, given, triggerCron);

					if (cron !== undefined) expect(isFiveFieldCron(cron)).toBe(true);
					// The rule of the trigger always wins over the cron of the model.
					if (triggerCron !== undefined) expect(cron ?? triggerCron).toBe(triggerCron);
				},
			),
			{ numRuns: 300 },
		);
	});
});
