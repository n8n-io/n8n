import { Container } from '@n8n/di';
import type { SchedulingFunctions, Workflow, Cron } from 'n8n-workflow';

import { ScheduledTaskManager } from '../../scheduled-task-manager';

const WORKFLOW_SCHEDULE_GROUP_TYPE = 'workflow';

export const getSchedulingFunctions = (
	workflowId: Workflow['id'],
	timezone: Workflow['timezone'],
	nodeId: string,
): SchedulingFunctions => {
	const scheduledTaskManager = Container.get(ScheduledTaskManager);
	return {
		registerCron: ({ expression, recurrence }: Cron, onTick: (scheduledT: Date) => void) => {
			return scheduledTaskManager.register(
				{
					group: { type: WORKFLOW_SCHEDULE_GROUP_TYPE, id: workflowId },
					targetId: nodeId,
					timezone,
					expression,
					recurrence,
				},
				onTick,
			);
		},
	};
};
