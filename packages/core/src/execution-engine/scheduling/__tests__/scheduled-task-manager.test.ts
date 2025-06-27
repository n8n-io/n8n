import { mock } from 'jest-mock-extended';
import type { ScheduleInterval, Workflow } from 'n8n-workflow';

import type { InstanceSettings } from '@/instance-settings';

import { ScheduledTask } from '../scheduled-task';
import { ScheduledTaskManager } from '../scheduled-task-manager';

describe('ScheduledTaskManager', () => {
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	const workflow = mock<Workflow>({ id: 'workflow1', timezone: 'UTC' });
	const secondWorkflow = mock<Workflow>({ id: 'workflow2', timezone: 'UTC' });
	const interval: ScheduleInterval = { field: 'minutes', minutesInterval: 1 };
	const onTick = jest.fn();

	let scheduledTaskManager: ScheduledTaskManager;

	beforeEach(() => {
		jest.resetAllMocks();
		jest.useFakeTimers();

		scheduledTaskManager = new ScheduledTaskManager(instanceSettings);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should register valid ScheduledTask', async () => {
		const scheduledTask = new ScheduledTask(interval, workflow);
		scheduledTaskManager.register(scheduledTask, onTick);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should should not invoke on follower instances', async () => {
		const scheduledTask = new ScheduledTask(interval, workflow);
		scheduledTaskManager = new ScheduledTaskManager(mock<InstanceSettings>({ isLeader: false }));
		scheduledTaskManager.register(scheduledTask, onTick);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should deregister ScheduledTask for a workflow', async () => {
		scheduledTaskManager.register(new ScheduledTask(interval, workflow), onTick);
		scheduledTaskManager.register(new ScheduledTask(interval, workflow), onTick);
		scheduledTaskManager.register(new ScheduledTask(interval, workflow), onTick);

		expect(scheduledTaskManager.scheduledTasks.get(workflow.id)?.length).toBe(3);
		expect(onTick).not.toHaveBeenCalled();

		scheduledTaskManager.deregister(workflow.id);

		expect(scheduledTaskManager.scheduledTasks.get(workflow.id)?.length).toBe(0);
		expect(onTick).not.toHaveBeenCalled();

		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should handle multiple workflows with their own tasks', async () => {
		const firstTask = new ScheduledTask(interval, workflow);
		const secondTask = new ScheduledTask(interval, secondWorkflow);
		const secondOnTick = jest.fn();

		scheduledTaskManager.register(firstTask, onTick);
		scheduledTaskManager.register(secondTask, secondOnTick);

		expect(scheduledTaskManager.scheduledTasks.get(workflow.id)?.length).toBe(1);
		expect(scheduledTaskManager.scheduledTasks.get(secondWorkflow.id)?.length).toBe(1);
		expect(onTick).not.toHaveBeenCalled();
		expect(secondOnTick).not.toHaveBeenCalled();

		jest.advanceTimersByTime(60 * 1000); // 1 minute
		expect(onTick).toHaveBeenCalledTimes(1);
		expect(secondOnTick).toHaveBeenCalledTimes(1);

		// Deregister only the first workflow
		scheduledTaskManager.deregister(workflow.id);

		jest.advanceTimersByTime(60 * 1000); // 1 more minute
		expect(onTick).toHaveBeenCalledTimes(1); // Still 1 (didn't increase)
		expect(secondOnTick).toHaveBeenCalledTimes(2); // Increased to 2
	});

	it('should handle deregistering workflows that were never registered', async () => {
		const scheduledTask = new ScheduledTask(interval, workflow);
		// Deregister a workflow that doesn't exist
		expect(() => scheduledTaskManager.deregister('nonexistent')).not.toThrow();

		// Should still work normally for other workflows
		scheduledTaskManager.register(scheduledTask, onTick);
		jest.advanceTimersByTime(60 * 1000); // 1 minute
		expect(onTick).toHaveBeenCalledTimes(1);
	});

	it('should handle leadership changes', async () => {
		const scheduledTask = new ScheduledTask(interval, workflow);
		scheduledTaskManager.register(scheduledTask, onTick);

		jest.advanceTimersByTime(60 * 1000); // 1 minute
		expect(onTick).toHaveBeenCalledTimes(1);

		// Change to follower
		Object.assign(instanceSettings, { isLeader: false });

		jest.advanceTimersByTime(60 * 1000); // 1 more minute
		expect(onTick).toHaveBeenCalledTimes(1); // Still 1 (didn't increase)

		// Change back to leader
		Object.assign(instanceSettings, { isLeader: true });

		jest.advanceTimersByTime(60 * 1000); // 1 more minute
		expect(onTick).toHaveBeenCalledTimes(2); // Now 2
	});

	it('should register multiple tasks with different intervals for the same workflow', async () => {
		const scheduledTask = new ScheduledTask(interval, workflow);
		const hourlyInterval: ScheduleInterval = {
			field: 'hours',
			hoursInterval: 1,
			triggerAtMinute: [0],
		};
		const hourlyTask = new ScheduledTask(hourlyInterval, workflow);
		const hourlyOnTick = jest.fn();

		scheduledTaskManager.register(scheduledTask, onTick); // Every minute
		scheduledTaskManager.register(hourlyTask, hourlyOnTick); // Every hour

		expect(scheduledTaskManager.scheduledTasks.get(workflow.id)?.length).toBe(2);

		// After 1 minute
		jest.advanceTimersByTime(60 * 1000);
		expect(onTick).toHaveBeenCalledTimes(1);
		expect(hourlyOnTick).toHaveBeenCalledTimes(0);

		// After 59 more minutes (1 hour total)
		jest.advanceTimersByTime(59 * 60 * 1000);
		expect(onTick).toHaveBeenCalledTimes(60); // Called every minute
		expect(hourlyOnTick).toHaveBeenCalledTimes(1); // Called at the hour mark
	});

	it('should continue processing other tasks if one task throws an error', async () => {
		const scheduledTask = new ScheduledTask(interval, workflow);
		const errorTask = new ScheduledTask(interval, workflow);
		const errorOnTick = jest.fn().mockImplementation(() => {
			throw new Error('Test error');
		});

		// Register both a normal task and the error task
		scheduledTaskManager.register(scheduledTask, onTick);
		scheduledTaskManager.register(errorTask, errorOnTick);

		// Advance time and check that the normal task still runs
		try {
			jest.advanceTimersByTime(60 * 1000);
		} catch {}

		// The normal task should still have been called
		expect(onTick).toHaveBeenCalledTimes(1);
	});
});
