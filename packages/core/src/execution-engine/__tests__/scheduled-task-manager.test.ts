import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { CronContext, CronExpression, Workflow } from 'n8n-workflow';

import type { InstanceSettings } from '@/instance-settings';

import { ScheduledTaskManager } from '../scheduled-task-manager';

const logger = mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });

const globalConfigWithMinInterval = (minScheduleIntervalSeconds: number) =>
	mock<GlobalConfig>({ workflows: { minScheduleIntervalSeconds } });

describe('ScheduledTaskManager', () => {
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	const workflow = mock<Workflow>({ timezone: 'GMT' });
	const everyMinute = '0 * * * * *';

	const onTick = jest.fn();

	let scheduledTaskManager: ScheduledTaskManager;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		scheduledTaskManager = new ScheduledTaskManager(
			instanceSettings,
			logger,
			mock(),
			mock(),
			globalConfigWithMinInterval(0),
		);
	});

	it('should not register duplicate crons', () => {
		const ctx: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		scheduledTaskManager.registerCron(ctx, onTick);
		expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)?.size).toBe(1);

		scheduledTaskManager.registerCron(ctx, onTick);
		expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)?.size).toBe(1);
	});

	it('should throw when workflow timezone is invalid', () => {
		expect(() =>
			scheduledTaskManager.registerCron(
				{
					workflowId: workflow.id,
					nodeId: 'test-node-id',
					timezone: 'somewhere',
					expression: everyMinute,
				},
				onTick,
			),
		).toThrow('Invalid timezone.');
	});

	it('should throw when cron expression is invalid', () => {
		expect(() =>
			//@ts-expect-error invalid cron expression is a type-error
			scheduledTaskManager.registerCron(workflow, 'invalid-cron-expression', onTick),
		).toThrow();
	});

	it('should register valid CronJobs', () => {
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'test-node-id',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should invoke onTick with the cron-scheduled fire time, not Date.now()', () => {
		// Freeze wall clock at an arbitrary instant that is NOT aligned to a minute boundary.
		const unaligned = new Date('2024-01-01T00:00:30.500Z');
		jest.setSystemTime(unaligned);

		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'test-node-id',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		jest.advanceTimersByTime(60 * 1000);

		expect(onTick).toHaveBeenCalledTimes(1);
		const firstArg = onTick.mock.calls[0][0];
		expect(firstArg).toBeInstanceOf(Date);
		// The scheduled fire time should fall on a whole-second boundary aligned to the
		// cron expression (every minute at :00 seconds), NOT the unaligned wall-clock time.
		expect((firstArg as Date).getUTCMilliseconds()).toBe(0);
		expect((firstArg as Date).getUTCSeconds()).toBe(0);
		// And it should differ from the unaligned system time.
		expect((firstArg as Date).getTime()).not.toBe(unaligned.getTime());
	});

	it('should not invoke on follower instances', () => {
		scheduledTaskManager = new ScheduledTaskManager(
			mock<InstanceSettings>({ isLeader: false }),
			logger,
			mock(),
			mock(),
			globalConfigWithMinInterval(0),
		);

		const ctx: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		scheduledTaskManager.registerCron(ctx, onTick);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should deregister CronJobs for a workflow', () => {
		const ctx1: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id-1',
			timezone: workflow.timezone,
			expression: everyMinute,
		};
		const ctx2: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id-2',
			timezone: workflow.timezone,
			expression: everyMinute,
		};
		const ctx3: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id-3',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		scheduledTaskManager.registerCron(ctx1, onTick);
		scheduledTaskManager.registerCron(ctx2, onTick);
		scheduledTaskManager.registerCron(ctx3, onTick);

		expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)?.size).toBe(3);

		scheduledTaskManager.deregisterCrons(workflow.id);

		expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)).toBeUndefined();

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should not set up log interval when activeInterval is 0', () => {
		const configWithZeroInterval = mock({ activeInterval: 0 });
		const manager = new ScheduledTaskManager(
			instanceSettings,
			logger,
			configWithZeroInterval,
			mock(),
			globalConfigWithMinInterval(0),
		);

		// @ts-expect-error Private property
		expect(manager.logInterval).toBeUndefined();
	});

	describe('N8N_MIN_SCHEDULE_INTERVAL_SECONDS enforcement', () => {
		const buildCtx = (expression: CronExpression): CronContext => ({
			workflowId: workflow.id,
			nodeId: 'test-node-id',
			timezone: workflow.timezone,
			expression,
		});

		it('does not enforce a minimum when the env var is 0', () => {
			scheduledTaskManager = new ScheduledTaskManager(
				instanceSettings,
				logger,
				mock(),
				mock(),
				globalConfigWithMinInterval(0),
			);

			expect(() =>
				scheduledTaskManager.registerCron(buildCtx('* * * * * *'), onTick),
			).not.toThrow();
		});

		it('throws a UserError when the cron interval is below the configured minimum', () => {
			scheduledTaskManager = new ScheduledTaskManager(
				instanceSettings,
				logger,
				mock(),
				mock(),
				globalConfigWithMinInterval(300),
			);

			expect(() => scheduledTaskManager.registerCron(buildCtx(everyMinute), onTick)).toThrow(
				/Schedule interval too short/,
			);
			expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)).toBeUndefined();
		});

		it('allows cron intervals at or above the configured minimum', () => {
			scheduledTaskManager = new ScheduledTaskManager(
				instanceSettings,
				logger,
				mock(),
				mock(),
				globalConfigWithMinInterval(300),
			);

			expect(() =>
				scheduledTaskManager.registerCron(buildCtx('0 */5 * * * *'), onTick),
			).not.toThrow();
			expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)?.size).toBe(1);
		});
	});
});
