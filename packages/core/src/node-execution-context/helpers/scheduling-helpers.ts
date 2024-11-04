import type { CronExpression, Workflow, SchedulingFunctions } from 'n8n-workflow';
import { Container } from 'typedi';

import { ScheduledTaskManager } from '@/ScheduledTaskManager';

export class SchedulingHelpers {
	private readonly scheduledTaskManager = Container.get(ScheduledTaskManager);

	constructor(private readonly workflow: Workflow) {}

	get exported(): SchedulingFunctions {
		return {
			registerCron: this.registerCron.bind(this),
		};
	}

	registerCron(cronExpression: CronExpression, onTick: () => void) {
		this.scheduledTaskManager.registerCron(this.workflow, cronExpression, onTick);
	}
}
