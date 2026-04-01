import type { CronExpression } from 'n8n-workflow';
import {
	buildScheduleHeatmapCells,
	buildScheduleOverview,
	buildScheduleTimelineData,
	buildScheduleTriggerDefinitions,
	buildScheduleTriggerRows,
	calculateExecutionStats,
	CRON_TRIGGER_NODE_TYPE,
	cronExpressionHitsWindow,
	describeScheduleInterval,
	extractScheduleIntervalsFromNode,
	getScheduleTriggerClass,
	INTERVAL_TRIGGER_NODE_TYPE,
	parseCronExpression,
	SCHEDULE_TRIGGER_NODE_TYPE,
	toScheduleCronExpression,
} from './schedule.utils';
import type { ScheduleTriggerDefinition } from './types';

describe('schedule.utils', () => {
	describe('toScheduleCronExpression', () => {
		it('should create deterministic cron expressions for generated intervals', () => {
			expect(
				toScheduleCronExpression({
					field: 'hours',
					hoursInterval: 2,
					triggerAtMinute: 15,
				}),
			).toBe('0 15 */2 * * *');

			expect(
				toScheduleCronExpression({
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [1, 3],
					triggerAtHour: 9,
					triggerAtMinute: 30,
				}),
			).toBe('0 30 9 * * 1,3');
		});
	});

	describe('getScheduleTriggerClass', () => {
		it('should classify interval styles for grouping', () => {
			expect(
				getScheduleTriggerClass({
					field: 'cronExpression',
					expression: '15 30 9 * * 1-5' as CronExpression,
				}),
			).toBe('custom-cron');
			expect(getScheduleTriggerClass({ field: 'minutes', minutesInterval: 5 })).toBe(
				'fixed-interval',
			);
			expect(
				getScheduleTriggerClass({
					field: 'months',
					monthsInterval: 1,
					triggerAtDayOfMonth: 1,
				}),
			).toBe('calendar');
		});
	});

	describe('describeScheduleInterval', () => {
		it('should generate readable descriptions for trigger rows', () => {
			expect(
				describeScheduleInterval({
					field: 'days',
					daysInterval: 2,
					triggerAtHour: 8,
					triggerAtMinute: 5,
				}),
			).toBe('Every 2 days at 08:05');

			expect(
				describeScheduleInterval({
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [1, 5],
					triggerAtHour: 9,
					triggerAtMinute: 30,
				}),
			).toBe('Every 1 week on Mon, Fri at 09:30');
		});
	});

	describe('parseCronExpression', () => {
		it('should support five-field cron expressions and weekday aliases', () => {
			const parsed = parseCronExpression('30 9 * * MON-FRI');

			expect(parsed.seconds.values).toEqual([0]);
			expect(parsed.minutes.values).toEqual([30]);
			expect(parsed.hours.values).toEqual([9]);
			expect(parsed.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
		});
	});

	describe('cronExpressionHitsWindow', () => {
		it('should detect a cron hit inside a window', () => {
			expect(
				cronExpressionHitsWindow(
					'10 0 10 * * *',
					new Date('2025-01-01T10:00:00.000Z'),
					new Date('2025-01-01T10:00:11.000Z'),
				),
			).toBe(true);

			expect(
				cronExpressionHitsWindow(
					'10 0 10 * * *',
					new Date('2025-01-01T10:00:11.000Z'),
					new Date('2025-01-01T10:01:00.000Z'),
				),
			).toBe(false);
		});
	});

	describe('buildScheduleOverview', () => {
		it('should aggregate workflow count, predicted activations, and peak slot load', () => {
			const triggers: ScheduleTriggerDefinition[] = [
				{
					triggerId: 'trigger-a',
					workflowId: 'workflow-a',
					workflowName: 'Workflow A',
					triggerName: 'Trigger A',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'minutes', minutesInterval: 15 },
				},
				{
					triggerId: 'trigger-b',
					workflowId: 'workflow-b',
					workflowName: 'Workflow B',
					triggerName: 'Trigger B',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'days', daysInterval: 1, triggerAtHour: 8 },
				},
			];
			const heatmapCells = [
				{
					slotStart: '2025-01-01T08:00:00.000Z',
					slotEnd: '2025-01-01T08:15:00.000Z',
					activationCount: 3,
					triggerCount: 2,
					triggers: [],
				},
				{
					slotStart: '2025-01-01T08:15:00.000Z',
					slotEnd: '2025-01-01T08:30:00.000Z',
					activationCount: 1,
					triggerCount: 1,
					triggers: [],
				},
			];

			expect(buildScheduleOverview(triggers, heatmapCells)).toEqual({
				trackedWorkflows: 2,
				scheduledActivations: 4,
				busiestSlotActivations: 3,
			});
		});
	});

	describe('buildScheduleTriggerDefinitions', () => {
		it('should normalize schedule trigger defaults when workflow parameters omit them', () => {
			expect(
				extractScheduleIntervalsFromNode({
					type: SCHEDULE_TRIGGER_NODE_TYPE,
					parameters: {},
				}),
			).toEqual([
				{
					field: 'days',
					daysInterval: 1,
					triggerAtHour: 0,
					triggerAtMinute: 0,
				},
			]);

			expect(
				extractScheduleIntervalsFromNode({
					type: SCHEDULE_TRIGGER_NODE_TYPE,
					parameters: {
						rule: {
							interval: [{}],
						},
					},
				}),
			).toEqual([
				{
					field: 'days',
					daysInterval: 1,
					triggerAtHour: 0,
					triggerAtMinute: 0,
				},
			]);

			expect(
				extractScheduleIntervalsFromNode({
					type: SCHEDULE_TRIGGER_NODE_TYPE,
					parameters: {
						rule: {
							interval: [
								{
									field: 'hours',
								},
							],
						},
					},
				}),
			).toEqual([
				{
					field: 'hours',
					hoursInterval: 1,
					triggerAtMinute: 0,
				},
			]);

			expect(
				extractScheduleIntervalsFromNode({
					type: SCHEDULE_TRIGGER_NODE_TYPE,
					parameters: {
						rule: {
							interval: [
								{
									hoursInterval: 6,
									triggerAtMinute: 10,
								},
							],
						},
					},
				}),
			).toEqual([
				{
					field: 'hours',
					hoursInterval: 6,
					triggerAtMinute: 10,
				},
			]);
		});

		it('should extract one trigger row per schedule-capable trigger interval', () => {
			const triggers = buildScheduleTriggerDefinitions([
				{
					id: 'workflow-a',
					name: 'Schedule workflow',
					active: true,
					nodes: [
						{
							name: 'Daily trigger',
							type: SCHEDULE_TRIGGER_NODE_TYPE,
							parameters: {
								rule: {
									interval: [
										{
											field: 'days',
											daysInterval: 1,
											triggerAtHour: 8,
											triggerAtMinute: 15,
										},
									],
								},
							},
						},
					],
				},
				{
					id: 'workflow-b',
					name: 'Legacy workflow',
					nodes: [
						{
							name: 'Cron trigger',
							type: CRON_TRIGGER_NODE_TYPE,
							parameters: {
								triggerTimes: {
									item: [{ mode: 'everyDay', hour: 9, minute: 30 }],
								},
							},
						},
						{
							name: 'Interval trigger',
							type: INTERVAL_TRIGGER_NODE_TYPE,
							parameters: {
								interval: 2,
								unit: 'hours',
							},
						},
					],
				},
			]);

			expect(triggers).toHaveLength(3);
			expect(triggers[0]).toMatchObject({
				workflowId: 'workflow-b',
				triggerName: 'Cron trigger',
				triggerSource: 'cron',
				interval: {
					field: 'days',
					daysInterval: 1,
					triggerAtHour: 9,
					triggerAtMinute: 30,
				},
			});
			expect(triggers[2]).toMatchObject({
				workflowId: 'workflow-a',
				triggerName: 'Daily trigger',
				workflowActive: true,
				triggerActive: true,
				triggerSource: 'scheduleTrigger',
			});
		});
	});

	describe('buildScheduleTimelineData', () => {
		it('should build day rows and timeline counts for trigger-based data', () => {
			const timelineStart = new Date('2025-01-01T08:00:00.000Z');
			const timelineEnd = new Date('2025-01-01T09:00:00.000Z');
			const triggers: ScheduleTriggerDefinition[] = [
				{
					triggerId: 'trigger-a',
					workflowId: 'workflow-a',
					workflowName: 'Schedule workflow',
					triggerName: 'Quarter-hour trigger',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'minutes', minutesInterval: 15 },
				},
			];

			const timelineData = buildScheduleTimelineData(triggers, {
				start: timelineStart,
				end: timelineEnd,
				slotMinutes: 15,
				upcomingFrom: new Date('2025-01-01T08:16:00.000Z'),
			});

			expect(timelineData.rows).toEqual([
				{
					triggerId: 'trigger-a',
					workflowId: 'workflow-a',
					workflowName: 'Schedule workflow',
					triggerName: 'Quarter-hour trigger',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerLogic: 'Every 15 minutes',
					triggerSource: 'scheduleTrigger',
					cronExpression: '0 */15 * * * *',
					startTime: '2025-01-01T08:00:00.000Z',
					nextActivation: '2025-01-01T08:30:00.000Z',
					activationsInRange: 4,
				},
			]);
			expect(timelineData.heatmapCells).toHaveLength(4);
			expect(timelineData.heatmapCells[0]).toMatchObject({
				slotStart: '2025-01-01T08:00:00.000Z',
				slotEnd: '2025-01-01T08:15:00.000Z',
				activationCount: 1,
				triggerCount: 1,
			});
		});

		it('should preserve hour-based schedule variants that include an explicit start hour', () => {
			const timelineData = buildScheduleTimelineData(
				[
					{
						triggerId: 'trigger-nightly',
						workflowId: 'workflow-nightly',
						workflowName: 'Nightly workflow',
						triggerName: 'Every Night at 8pm',
						projectName: null,
						workflowActive: true,
						triggerActive: true,
						triggerSource: 'scheduleTrigger',
						interval: {
							field: 'hours',
							hoursInterval: 24,
							triggerAtHour: 20,
							triggerAtMinute: 0,
						},
					},
				],
				{
					start: new Date('2025-01-01T00:00:00.000Z'),
					end: new Date('2025-01-02T00:00:00.000Z'),
					slotMinutes: 15,
					upcomingFrom: new Date('2025-01-01T12:00:00.000Z'),
				},
			);

			expect(timelineData.rows).toEqual([
				expect.objectContaining({
					triggerId: 'trigger-nightly',
					triggerLogic: 'Every 1 day at 20:00',
					cronExpression: '0 0 20 * * *',
					startTime: '2025-01-01T20:00:00.000Z',
					nextActivation: '2025-01-01T20:00:00.000Z',
					activationsInRange: 1,
				}),
			]);
		});
	});

	describe('buildScheduleHeatmapCells', () => {
		it('should place predicted trigger activations into deterministic 15-minute slots', () => {
			const triggers: ScheduleTriggerDefinition[] = [
				{
					triggerId: 'trigger-a',
					workflowId: 'workflow-a',
					workflowName: 'Quarter-hour workflow',
					triggerName: 'Quarter-hour trigger',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'minutes', minutesInterval: 15 },
				},
				{
					triggerId: 'trigger-b',
					workflowId: 'workflow-b',
					workflowName: 'Cron workflow',
					triggerName: 'Cron trigger',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'cron',
					interval: {
						field: 'cronExpression',
						expression: '0 15 9 * * MON-FRI' as CronExpression,
					},
				},
			];

			const cells = buildScheduleHeatmapCells(triggers, {
				start: new Date('2025-01-06T09:00:00.000Z'),
				end: new Date('2025-01-06T09:30:00.000Z'),
				slotMinutes: 15,
			});

			expect(cells).toEqual([
				{
					slotStart: '2025-01-06T09:00:00.000Z',
					slotEnd: '2025-01-06T09:15:00.000Z',
					activationCount: 1,
					triggerCount: 1,
					triggers: [
						{
							triggerId: 'trigger-a',
							workflowId: 'workflow-a',
							workflowName: 'Quarter-hour workflow',
							triggerName: 'Quarter-hour trigger',
							activationCount: 1,
						},
					],
				},
				{
					slotStart: '2025-01-06T09:15:00.000Z',
					slotEnd: '2025-01-06T09:30:00.000Z',
					activationCount: 2,
					triggerCount: 2,
					triggers: [
						{
							triggerId: 'trigger-b',
							workflowId: 'workflow-b',
							workflowName: 'Cron workflow',
							triggerName: 'Cron trigger',
							activationCount: 1,
						},
						{
							triggerId: 'trigger-a',
							workflowId: 'workflow-a',
							workflowName: 'Quarter-hour workflow',
							triggerName: 'Quarter-hour trigger',
							activationCount: 1,
						},
					],
				},
			]);
		});

		it('should build exactly 96 quarter-hour slots for one day', () => {
			const cells = buildScheduleHeatmapCells([], {
				start: new Date('2025-01-06T00:00:00.000Z'),
				end: new Date('2025-01-07T00:00:00.000Z'),
				slotMinutes: 15,
			});

			expect(cells).toHaveLength(96);
			expect(cells[0]).toMatchObject({
				slotStart: '2025-01-06T00:00:00.000Z',
				slotEnd: '2025-01-06T00:15:00.000Z',
			});
			expect(cells[95]).toMatchObject({
				slotStart: '2025-01-06T23:45:00.000Z',
				slotEnd: '2025-01-07T00:00:00.000Z',
			});
		});
	});

	describe('buildScheduleTriggerRows', () => {
		it('should return trigger rows without requiring a separate heatmap input', () => {
			const triggers: ScheduleTriggerDefinition[] = [
				{
					triggerId: 'trigger-a',
					workflowId: 'workflow-a',
					workflowName: 'Workflow A',
					triggerName: 'Trigger A',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'days', daysInterval: 1, triggerAtHour: 8, triggerAtMinute: 15 },
				},
			];

			const rows = buildScheduleTriggerRows(triggers, {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-02T00:00:00.000Z'),
				slotMinutes: 15,
				upcomingFrom: new Date('2025-01-01T06:00:00.000Z'),
			});

			expect(rows[0]).toMatchObject({
				workflowName: 'Workflow A',
				triggerName: 'Trigger A',
				workflowActive: true,
				triggerActive: true,
				startTime: '2025-01-01T08:15:00.000Z',
				nextActivation: '2025-01-01T08:15:00.000Z',
				activationsInRange: 1,
			});
		});

		it('should keep disabled triggers in rows but exclude them from the timeline load', () => {
			const triggers: ScheduleTriggerDefinition[] = [
				{
					triggerId: 'trigger-enabled',
					workflowId: 'workflow-a',
					workflowName: 'Workflow A',
					triggerName: 'Enabled Trigger',
					projectName: null,
					workflowActive: true,
					triggerActive: true,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'hours', hoursInterval: 1, triggerAtMinute: 0 },
				},
				{
					triggerId: 'trigger-disabled',
					workflowId: 'workflow-a',
					workflowName: 'Workflow A',
					triggerName: 'Disabled Trigger',
					projectName: null,
					workflowActive: true,
					triggerActive: false,
					triggerSource: 'scheduleTrigger',
					interval: { field: 'hours', hoursInterval: 1, triggerAtMinute: 15 },
				},
			];

			const timelineData = buildScheduleTimelineData(triggers, {
				start: new Date('2025-01-01T08:00:00.000Z'),
				end: new Date('2025-01-01T10:00:00.000Z'),
				slotMinutes: 15,
			});

			expect(
				timelineData.heatmapCells.reduce((total, cell) => total + cell.activationCount, 0),
			).toBe(2);
			expect(timelineData.rows).toEqual([
				expect.objectContaining({
					triggerId: 'trigger-enabled',
					workflowActive: true,
					triggerActive: true,
					activationsInRange: 2,
				}),
				expect.objectContaining({
					triggerId: 'trigger-disabled',
					workflowActive: true,
					triggerActive: false,
					startTime: null,
					nextActivation: null,
					activationsInRange: 0,
				}),
			]);
		});
	});

	describe('calculateExecutionStats', () => {
		it('should summarize run outcomes and timing', () => {
			expect(
				calculateExecutionStats([
					{ status: 'success', runTimeMs: 1_000 },
					{ status: 'error', runTimeMs: 3_000 },
					{ status: 'running' },
				]),
			).toEqual({
				totalRuns: 3,
				successRuns: 1,
				failedRuns: 1,
				successRate: 33.33,
				averageRunTimeMs: 2_000,
			});
		});
	});
});
