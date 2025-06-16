import { captor, mock } from 'jest-mock-extended';
import type { ScheduleInterval, Workflow } from 'n8n-workflow';

import { mockInstance } from '@test/utils';

import { type ScheduledTask, ScheduledTaskManager } from '../../../scheduling';
import { getSchedulingFunctions } from '../scheduling-helper-functions';

describe('getSchedulingFunctions', () => {
	const workflow = mock<Workflow>({ id: 'test-workflow' });
	const interval: ScheduleInterval = { field: 'minutes', minutesInterval: 30 };
	const onTick = jest.fn();
	const scheduledTaskManager = mockInstance(ScheduledTaskManager);
	const schedulingFunctions = getSchedulingFunctions(workflow);

	it('should return scheduling functions', () => {
		expect(typeof schedulingFunctions.registerScheduledTask).toBe('function');
	});

	describe('registerScheduledTask', () => {
		it('should invoke scheduledTaskManager.registerScheduledTask', () => {
			schedulingFunctions.registerScheduledTask(interval, onTick);

			const scheduledTaskCaptor = captor<ScheduledTask>();
			expect(scheduledTaskManager.register).toHaveBeenCalledWith(scheduledTaskCaptor, onTick);
			expect(scheduledTaskCaptor.value.workflowId).toEqual(workflow.id);
			expect(scheduledTaskCaptor.value.interval).toEqual(interval);
		});
	});
});
