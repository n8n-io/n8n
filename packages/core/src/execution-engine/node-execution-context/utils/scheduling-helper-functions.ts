import { Container } from '@n8n/di';
import { parseCronExpression, type SchedulingFunctions, type Workflow } from 'n8n-workflow';

import { ScheduledTask, ScheduledTaskManager } from '../../scheduling';

export const getSchedulingFunctions = (workflow: Workflow): SchedulingFunctions => {
	const scheduledTaskManager = Container.get(ScheduledTaskManager);
	return {
		registerCron(cronExpression, onTick) {
			const interval = parseCronExpression(cronExpression);
			this.registerScheduledTask(interval, onTick);
		},
		registerScheduledTask: (interval, onTick) => {
			const scheduledTask = new ScheduledTask(interval, workflow);
			scheduledTaskManager.register(scheduledTask, onTick);
		},
	};
};
