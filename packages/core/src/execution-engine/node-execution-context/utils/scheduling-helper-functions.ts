import { Container } from '@n8n/di';
import type { SchedulingFunctions, Workflow, CronContext, Cron } from 'n8n-workflow';

import { ScheduledTaskManager } from '../../scheduled-task-manager';

export const getSchedulingFunctions = (
	workflowId: Workflow['id'],
	timezone: Workflow['timezone'],
	nodeId: string,
): SchedulingFunctions => {
	const scheduledTaskManager = Container.get(ScheduledTaskManager);
	return {
		registerCron: ({ expression, recurrence }: Cron, onTick) => {
			const ctx: CronContext = {
				expression,
				recurrence,
				nodeId,
				workflowId,
				timezone,
			};

			return scheduledTaskManager.registerCron(ctx, onTick);
		},
	};
};
