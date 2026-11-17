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
			'everyX hours, with a minute that the migration picks',
			{ mode: 'everyX', unit: 'hours', value: 6 },
			{ field: 'hours', hoursInterval: 6, triggerAtMinute: expect.any(Number) },
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

	it.each([
		['minutes', 7, { field: 'minutes', minutesInterval: 7 }],
		['minutes', 50, { field: 'minutes', minutesInterval: 50 }],
		['hours', 5, { field: 'hours', hoursInterval: 5, triggerAtMinute: expect.any(Number) }],
		['hours', 18, { field: 'hours', hoursInterval: 18, triggerAtMinute: expect.any(Number) }],
	])(
		'maps everyX %s with value %i to an even gap and reports a note, because cron */n did not divide the period',
		(unit, value, expected) => {
			const result = cronToScheduleTrigger.migrate(cron({ mode: 'everyX', unit, value }));

			expect(intervals(result)).toEqual({ interval: [expected] });
			expect(result.notes).toHaveLength(1);
		},
	);

	it('reports one note for a Cron node with several uneven everyX trigger times', () => {
		const { notes } = cronToScheduleTrigger.migrate(
			cron(
				{ mode: 'everyX', unit: 'minutes', value: 7 },
				{ mode: 'everyX', unit: 'hours', value: 5 },
			),
		);

		expect(notes).toHaveLength(1);
	});

	it.each([
		['minutes', 30],
		['hours', 12],
	])(
		'reports no note for everyX %s with value %i, because cron */n divides the period',
		(unit, value) => {
			const { notes } = cronToScheduleTrigger.migrate(cron({ mode: 'everyX', unit, value }));

			expect(notes).toBeUndefined();
		},
	);

	describe('minute of everyX hours', () => {
		const everyThreeHours = { mode: 'everyX', unit: 'hours', value: 3 };
		const minuteOf = (node: ReturnType<typeof cron>, index = 0) => {
			const { interval } = cronToScheduleTrigger.migrate(node).node.parameters.rule as {
				interval: Array<{ triggerAtMinute: number }>;
			};
			return interval[index].triggerAtMinute;
		};

		it('is a whole minute from 0 to 59', () => {
			const minute = minuteOf(cron(everyThreeHours));

			expect(Number.isInteger(minute)).toBe(true);
			expect(minute).toBeGreaterThanOrEqual(0);
			expect(minute).toBeLessThanOrEqual(59);
		});

		it('stays the same when the same node migrates again', () => {
			expect(minuteOf(cron(everyThreeHours))).toBe(minuteOf(cron(everyThreeHours)));
		});

		it('differs between nodes, so migrated workflows do not start together', () => {
			const minutes = new Set(
				Array.from({ length: 30 }, (_, i) =>
					minuteOf(
						createNode(`Cron ${i}`, 'n8n-nodes-base.cron', {
							triggerTimes: { item: [everyThreeHours] },
						}),
					),
				),
			);

			expect(minutes.size).toBeGreaterThan(10);
		});

		it('differs between the rules of one node, as Cron picked a minute for each', () => {
			const node = cron(everyThreeHours, { ...everyThreeHours, value: 5 });

			expect(minuteOf(node, 0)).not.toBe(minuteOf(node, 1));
		});

		it('gives two identical everyX hours trigger times different minutes', () => {
			const node = cron(everyThreeHours, everyThreeHours);

			expect(minuteOf(node, 0)).not.toBe(minuteOf(node, 1));
		});

		it('does not add a minute to everyX minutes', () => {
			const { node } = cronToScheduleTrigger.migrate(
				cron({ mode: 'everyX', unit: 'minutes', value: 15 }),
			);

			expect(node.parameters.rule).toEqual({
				interval: [{ field: 'minutes', minutesInterval: 15 }],
			});
		});
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

	describe('trigger times that fire at the same moment', () => {
		// Schedule Trigger gives one execution for them. We accept this change.
		it('migrates two identical trigger times to two rules', () => {
			const { node } = cronToScheduleTrigger.migrate(
				cron({ mode: 'everyMinute' }, { mode: 'everyMinute' }),
			);

			expect(node.parameters.rule).toEqual({
				interval: [
					{ field: 'minutes', minutesInterval: 1 },
					{ field: 'minutes', minutesInterval: 1 },
				],
			});
		});

		it('migrates trigger times that become equal after defaults apply', () => {
			const { node } = cronToScheduleTrigger.migrate(
				cron({}, { mode: 'everyDay', hour: 14, minute: 0 }),
			);

			expect(node.parameters.rule).toEqual({
				interval: [
					{ field: 'days', daysInterval: 1, triggerAtHour: 14, triggerAtMinute: 0 },
					{ field: 'days', daysInterval: 1, triggerAtHour: 14, triggerAtMinute: 0 },
				],
			});
		});

		it('migrates overlapping trigger times and reports no note', () => {
			const result = cronToScheduleTrigger.migrate(
				cron({ mode: 'everyX', unit: 'minutes', value: 5 }, { mode: 'everyHour', minute: 0 }),
			);

			expect(intervals(result)).toEqual({
				interval: [
					{ field: 'minutes', minutesInterval: 5 },
					{ field: 'hours', hoursInterval: 1, triggerAtMinute: 0 },
				],
			});
			expect(result.notes).toBeUndefined();
		});
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
