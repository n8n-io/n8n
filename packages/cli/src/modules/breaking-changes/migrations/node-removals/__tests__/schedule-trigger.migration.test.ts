import { createNode } from '../../../__tests__/test-helpers';
import { cronToScheduleTrigger } from '../schedule-trigger.migration';

const cron = (...items: Array<Record<string, unknown>>) =>
	createNode('Cron', 'n8n-nodes-base.cron', { triggerTimes: { item: items } });

const intervals = (migrated: ReturnType<typeof cronToScheduleTrigger.migrate>) =>
	migrated.node.parameters.rule;

describe('cronToScheduleTrigger migration', () => {
	it('is keyed by the Cron rule id', () => {
		expect(cronToScheduleTrigger.ruleId).toBe('cron-removed-v3');
	});

	it('targets Schedule Trigger 1.4 and writes no missed-run settings, so the defaults skip a missed run', () => {
		const { node } = cronToScheduleTrigger.migrate(cron({ mode: 'everyMinute' }));

		expect(node.type).toBe('n8n-nodes-base.scheduleTrigger');
		expect(node.typeVersion).toBe(1.4);
		expect(Object.keys(node.parameters)).toEqual(['rule']);
	});

	it.each([
		['everyMinute', { mode: 'everyMinute' }, { field: 'minutes', minutesInterval: 1 }],
		[
			'everyHour',
			{ mode: 'everyHour', minute: 15 },
			{ field: 'hours', hoursInterval: 1, triggerAtMinute: 15 },
		],
		[
			'everyDay',
			{ mode: 'everyDay', hour: 9, minute: 30 },
			{ field: 'days', daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 30 },
		],
		[
			'everyWeek, with a string weekday',
			{ mode: 'everyWeek', weekday: '5', hour: 8, minute: 5 },
			{
				field: 'weeks',
				weeksInterval: 1,
				triggerAtDay: [5],
				triggerAtHour: 8,
				triggerAtMinute: 5,
			},
		],
		[
			'everyMonth',
			{ mode: 'everyMonth', dayOfMonth: 31, hour: 0, minute: 0 },
			{
				field: 'months',
				monthsInterval: 1,
				triggerAtDayOfMonth: 31,
				triggerAtHour: 0,
				triggerAtMinute: 0,
			},
		],
		[
			'everyX minutes',
			{ mode: 'everyX', unit: 'minutes', value: 15 },
			{ field: 'minutes', minutesInterval: 15 },
		],
		[
			'everyX hours',
			{ mode: 'everyX', unit: 'hours', value: 6 },
			{ field: 'hours', hoursInterval: 6 },
		],
		[
			'everyX minutes that does not divide 60, accepting an even gap instead of cron */n',
			{ mode: 'everyX', unit: 'minutes', value: 7 },
			{ field: 'minutes', minutesInterval: 7 },
		],
		[
			'everyX hours that does not divide 24, accepting an even gap instead of cron */n',
			{ mode: 'everyX', unit: 'hours', value: 5 },
			{ field: 'hours', hoursInterval: 5 },
		],
		[
			'custom, with the expression trimmed',
			{ mode: 'custom', cronExpression: ' 0 0 9 * * 1-5 ' },
			{ field: 'cronExpression', expression: '0 0 9 * * 1-5' },
		],
	])('maps %s', (_name, item, expected) => {
		const result = cronToScheduleTrigger.migrate(cron(item));

		expect(intervals(result)).toEqual({ interval: [expected] });
		expect(result.unmapped).toBeUndefined();
		expect(result.notes).toBeUndefined();
	});

	it('uses the Cron defaults for values that the saved workflow omits', () => {
		const { node } = cronToScheduleTrigger.migrate(cron({}));

		// Defaults: mode everyDay, hour 14, minute 0.
		expect(node.parameters.rule).toEqual({
			interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 14, triggerAtMinute: 0 }],
		});
	});

	it('maps each trigger time to its own rule, in order', () => {
		const { node } = cronToScheduleTrigger.migrate(
			cron({ mode: 'everyMinute' }, { mode: 'custom', cronExpression: '0 * * * * *' }),
		);

		expect(node.parameters.rule).toEqual({
			interval: [
				{ field: 'minutes', minutesInterval: 1 },
				{ field: 'cronExpression', expression: '0 * * * * *' },
			],
		});
	});

	it('refuses two identical trigger times, because Schedule Trigger registers them once', () => {
		const node = cron({ mode: 'everyMinute' }, { mode: 'everyMinute' });

		expect(() => cronToScheduleTrigger.migrate(node)).toThrow('identical');
	});

	it('refuses trigger times that become equal after defaults apply', () => {
		const node = cron({}, { mode: 'everyDay', hour: 14, minute: 0 });

		expect(() => cronToScheduleTrigger.migrate(node)).toThrow('identical');
	});

	it.each([
		['no trigger times', createNode('Cron', 'n8n-nodes-base.cron', {})],
		['an empty list of trigger times', cron()],
		['an expression for the mode', cron({ mode: '={{ $json.mode }}' })],
		['an expression for the hour', cron({ mode: 'everyDay', hour: '={{ 1 }}' })],
		['an hour out of range', cron({ mode: 'everyDay', hour: 24 })],
		[
			'every 60 minutes, which Schedule Trigger rejects',
			cron({ mode: 'everyX', unit: 'minutes', value: 60 }),
		],
		[
			'every 24 hours, which Schedule Trigger rejects',
			cron({ mode: 'everyX', unit: 'hours', value: 24 }),
		],
		['every 0 hours', cron({ mode: 'everyX', unit: 'hours', value: 0 })],
		['an unknown everyX unit', cron({ mode: 'everyX', unit: 'days', value: 2 })],
		['an unknown mode', cron({ mode: 'everyYear' })],
	])('refuses %s', (_name, node) => {
		expect(() => cronToScheduleTrigger.migrate(node)).toThrow();
	});
});
