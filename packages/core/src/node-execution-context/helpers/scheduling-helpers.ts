import { Container } from 'typedi';
import { CronExpression, Workflow } from 'n8n-workflow';
import type { SchedulingFunctions } from 'n8n-workflow';

import { ScheduledTaskManager } from '@/ScheduledTaskManager';

export class SchedulingHelpers implements SchedulingFunctions {
	private readonly scheduledTaskManager = Container.get(ScheduledTaskManager);

	constructor(private readonly workflow: Workflow) {}

	registerCron(cronExpression: CronExpression, onTick: () => void) {
		this.scheduledTaskManager.registerCron(this.workflow, cronExpression, onTick);
	}
}
