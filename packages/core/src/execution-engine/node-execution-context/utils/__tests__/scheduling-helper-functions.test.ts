import { mock } from 'jest-mock-extended';
import type { CronContext, NodeCronContext, Workflow } from 'n8n-workflow';

import { mockInstance } from '@test/utils';

import { ScheduledTaskManager } from '../../../scheduled-task-manager';
import { getSchedulingFunctions } from '../scheduling-helper-functions';

describe('getSchedulingFunctions', () => {
	const workflow = mock<Workflow>({ id: 'test-workflow' });
	const cronExpression = '* * * * * 0';
	const onTick = jest.fn();
	const scheduledTaskManager = mockInstance(ScheduledTaskManager);
	const schedulingFunctions = getSchedulingFunctions(workflow);

	it('should return scheduling functions', () => {
		expect(typeof schedulingFunctions.registerCron).toBe('function');
	});

	describe('registerCron', () => {
		it('should invoke scheduledTaskManager.registerCron', () => {
			const nodeCronContext: NodeCronContext = {
				nodeId: 'test-node',
				expression: cronExpression,
			};

			const cronContext: CronContext = {
				...nodeCronContext,
				workflowId: 'test-workflow',
				timezone: 'Europe/Berlin',
			};

			schedulingFunctions.registerCron(nodeCronContext, onTick);

			expect(scheduledTaskManager.registerCron).toHaveBeenCalledWith(
				cronContext,
				{ expression: cronExpression },
				onTick,
			);
		});
	});
});
