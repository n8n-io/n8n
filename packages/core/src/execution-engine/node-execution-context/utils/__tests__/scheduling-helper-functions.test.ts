import { mock } from 'jest-mock-extended';
import type { CronContext, Workflow } from 'n8n-workflow';

import { mockInstance } from '@test/utils';

import { ScheduledTaskManager } from '../../../scheduled-task-manager';
import { getSchedulingFunctions } from '../scheduling-helper-functions';

describe('getSchedulingFunctions', () => {
	const workflow = mock<Workflow>({ id: 'test-workflow', timezone: 'Europe/Berlin' });
	const cronExpression = '* * * * * 0';
	const onTick = jest.fn();
	const scheduledTaskManager = mockInstance(ScheduledTaskManager);
	const schedulingFunctions = getSchedulingFunctions(
		workflow.id,
		workflow.timezone,
		'test-node-id',
	);

	it('should return scheduling functions', () => {
		expect(typeof schedulingFunctions.registerCron).toBe('function');
	});

	describe('registerCron', () => {
		it('should invoke scheduledTaskManager.registerCron', () => {
			const ctx: CronContext = {
				nodeId: 'test-node-id',
				expression: cronExpression,
				workflowId: 'test-workflow',
				timezone: 'Europe/Berlin',
			};

			schedulingFunctions.registerCron({ expression: cronExpression }, onTick);

			expect(scheduledTaskManager.registerCron).toHaveBeenCalledWith(ctx, onTick);
		});

		it('should forward the scheduledT Date to the user-provided onTick', () => {
			const userOnTick = jest.fn();
			schedulingFunctions.registerCron({ expression: cronExpression }, userOnTick);

			// Capture the onTick that getSchedulingFunctions passed down to
			// scheduledTaskManager.registerCron, then invoke it with a Date to
			// confirm the Date flows through unchanged.
			const forwardedOnTick = (scheduledTaskManager.registerCron as jest.Mock).mock.calls.at(
				-1,
			)![1];
			const scheduledT = new Date('2024-01-01T00:01:00.000Z');
			forwardedOnTick(scheduledT);

			expect(userOnTick).toHaveBeenCalledWith(scheduledT);
		});
	});
});
