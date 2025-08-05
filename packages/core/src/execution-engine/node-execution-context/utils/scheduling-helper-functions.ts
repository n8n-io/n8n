import { Container } from '@n8n/di';
import type { SchedulingFunctions, Workflow, CronContext } from 'n8n-workflow';

import { ScheduledTaskManager } from '../../scheduled-task-manager';

export const getSchedulingFunctions = (workflow: Workflow): SchedulingFunctions => {
	const scheduledTaskManager = Container.get(ScheduledTaskManager);
	return {
		registerCron: (nodeCronContext, onTick) => {
			const ctx: CronContext = {
				...nodeCronContext,
				workflowId: workflow.id,
				timezone: workflow.timezone,
			};

			return scheduledTaskManager.registerCron(ctx, onTick);
		},
	};
};
