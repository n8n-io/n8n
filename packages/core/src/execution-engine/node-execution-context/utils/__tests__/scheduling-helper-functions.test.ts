import type { Workflow } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { mockInstance } from '@test/utils';

import { ScheduledTaskManager } from '../../../scheduled-task-manager';
import { getSchedulingFunctions } from '../scheduling-helper-functions';

describe('getSchedulingFunctions', () => {
	const workflow = mock<Workflow>({ id: 'test-workflow', timezone: 'Europe/Berlin' });
	const cronExpression = '* * * * * 0';
	const onTick = vi.fn();
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
		it('should invoke scheduledTaskManager.register', () => {
			const ctx = {
				group: { type: 'workflow', id: 'test-workflow' },
				targetId: 'test-node-id',
				expression: cronExpression,
				timezone: 'Europe/Berlin',
			};

			schedulingFunctions.registerCron({ expression: cronExpression }, onTick);

			expect(scheduledTaskManager.register).toHaveBeenCalledWith(ctx, onTick);
		});

		it('should forward the scheduledT Date to the user-provided onTick', () => {
			const userOnTick = vi.fn();
			schedulingFunctions.registerCron({ expression: cronExpression }, userOnTick);

			// Capture the onTick that getSchedulingFunctions passed down to
			// scheduledTaskManager.register, then invoke it with a Date to
			// confirm the Date flows through unchanged.
			const forwardedOnTick = (scheduledTaskManager.register as Mock).mock.calls.at(-1)![1];
			const scheduledT = new Date('2024-01-01T00:01:00.000Z');
			forwardedOnTick(scheduledT);

			expect(userOnTick).toHaveBeenCalledWith(scheduledT);
		});
	});
});
