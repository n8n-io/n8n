import { Container } from '@n8n/di';
import type { SchedulingFunctions, Workflow } from 'n8n-workflow';

import { ScheduledTaskManager } from '../../scheduled-task-manager';

export const getSchedulingFunctions = (workflow: Workflow): SchedulingFunctions => {
	const scheduledTaskManager = Container.get(ScheduledTaskManager);
	return {
		registerCron: (cron, onTick) => scheduledTaskManager.registerCron(workflow, cron, onTick),
	};
};
