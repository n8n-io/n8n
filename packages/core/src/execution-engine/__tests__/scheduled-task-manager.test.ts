import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { CronContext, Workflow } from 'n8n-workflow';

import type { InstanceSettings } from '@/instance-settings';

import { ScheduledTaskManager } from '../scheduled-task-manager';

const logger = mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });

describe('ScheduledTaskManager', () => {
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	const workflow = mock<Workflow>({ timezone: 'GMT' });
	const everyMinute = '0 * * * * *';
	const onTick = jest.fn();

	let scheduledTaskManager: ScheduledTaskManager;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		scheduledTaskManager = new ScheduledTaskManager(instanceSettings, logger, mock());
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

	it('should not invoke on follower instances', () => {
		scheduledTaskManager = new ScheduledTaskManager(
			mock<InstanceSettings>({ isLeader: false }),
			logger,
			mock(),
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
		const ctx: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		scheduledTaskManager.registerCron(ctx, onTick);
		scheduledTaskManager.registerCron(ctx, onTick);
		scheduledTaskManager.registerCron(ctx, onTick);

		expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)).toHaveLength(3);

		scheduledTaskManager.deregisterCrons(workflow.id);

		expect(scheduledTaskManager.cronsByWorkflow.get(workflow.id)).toBeUndefined();

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should not set up log interval when activeInterval is 0', () => {
		const configWithZeroInterval = mock({ activeInterval: 0 });
		const manager = new ScheduledTaskManager(instanceSettings, logger, configWithZeroInterval);

		// @ts-expect-error Private property
		expect(manager.logInterval).toBeUndefined();
	});
});
