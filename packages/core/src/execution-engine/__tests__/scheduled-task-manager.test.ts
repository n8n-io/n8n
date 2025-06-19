import { mock } from 'jest-mock-extended';
import type { Workflow } from 'n8n-workflow';

import type { InstanceSettings } from '@/instance-settings';

import { ScheduledTaskManager } from '../scheduled-task-manager';

describe('ScheduledTaskManager', () => {
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	const workflow = mock<Workflow>({ timezone: 'GMT' });
	const everyMinute = '0 * * * * *';
	const onTick = jest.fn();

	let scheduledTaskManager: ScheduledTaskManager;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		scheduledTaskManager = new ScheduledTaskManager(instanceSettings);
	});

	it('should throw when workflow timezone is invalid', () => {
		expect(() =>
			scheduledTaskManager.registerCron(
				mock<Workflow>({ timezone: 'somewhere' }),
				everyMinute,
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

	it('should register valid CronJobs', async () => {
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should should not invoke on follower instances', async () => {
		scheduledTaskManager = new ScheduledTaskManager(mock<InstanceSettings>({ isLeader: false }));
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should deregister CronJobs for a workflow', async () => {
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);

		expect(scheduledTaskManager.cronJobs.get(workflow.id)?.length).toBe(3);

		scheduledTaskManager.deregisterCrons(workflow.id);

		expect(scheduledTaskManager.cronJobs.get(workflow.id)?.length).toBe(0);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});
});
