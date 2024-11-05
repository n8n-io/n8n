import { mock } from 'jest-mock-extended';
import type { Workflow } from 'n8n-workflow';
import { Container } from 'typedi';

import { ScheduledTaskManager } from '@/ScheduledTaskManager';

import { SchedulingHelpers } from '../scheduling-helpers';

describe('SchedulingHelpers', () => {
	const scheduledTaskManager = mock<ScheduledTaskManager>();
	Container.set(ScheduledTaskManager, scheduledTaskManager);
	const workflow = mock<Workflow>();
	const schedulingHelpers = new SchedulingHelpers(workflow);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('registerCron', () => {
		it('should call registerCron method of ScheduledTaskManager', () => {
			const cronExpression = '* * * * * *';
			const onTick = jest.fn();

			schedulingHelpers.registerCron(cronExpression, onTick);

			expect(scheduledTaskManager.registerCron).toHaveBeenCalledWith(
				workflow,
				cronExpression,
				onTick,
			);
		});
	});
});
