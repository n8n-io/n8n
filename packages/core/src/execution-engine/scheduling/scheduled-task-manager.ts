import { Service } from '@n8n/di';

import { InstanceSettings } from '@/instance-settings';

import type { ScheduledTask } from './scheduled-task';

@Service()
export class ScheduledTaskManager {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	readonly scheduledTasks = new Map<string, ScheduledTask[]>();

	register(scheduledTask: ScheduledTask, onTick: () => void) {
		const { workflowId } = scheduledTask;
		const { instanceSettings, scheduledTasks } = this;

		const scheduledTasksForWorkflow = scheduledTasks.get(workflowId);
		if (scheduledTasksForWorkflow) {
			scheduledTasksForWorkflow.push(scheduledTask);
		} else {
			scheduledTasks.set(workflowId, [scheduledTask]);
		}

		if (instanceSettings.isLeader)
			scheduledTask.start(() => {
				if (instanceSettings.isLeader) onTick();
			});
	}

	deregister(workflowId: string) {
		const scheduledTasks = this.scheduledTasks.get(workflowId) ?? [];
		scheduledTasks.map((scheduledTask) => scheduledTask.stop());
		this.scheduledTasks.set(workflowId, []);
	}
}
