import type { Workflow } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { ScheduledTaskManager } from '@/ScheduledTaskManager';

describe('ScheduledTaskManager', () => {
	const workflow = mock<Workflow>({ timezone: 'GMT' });
	const everyMinute = '0 * * * * *';
	const onTick = jest.fn();

	let scheduledTaskManager: ScheduledTaskManager;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		scheduledTaskManager = new ScheduledTaskManager();
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

	it('should deregister CronJobs for a workflow', async () => {
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);
		scheduledTaskManager.registerCron(workflow, everyMinute, onTick);
		scheduledTaskManager.deregisterCrons(workflow.id);

		expect(onTick).not.toHaveBeenCalled();
		jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});
});
