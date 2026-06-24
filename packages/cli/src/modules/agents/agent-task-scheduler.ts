import { Service } from '@n8n/di';
import { CronRegistry } from 'n8n-core';

const AGENT_TASK_CRON_NAMESPACE = 'agent-task';

@Service()
export class AgentTaskScheduler {
	constructor(private readonly cronRegistry: CronRegistry) {}

	register(
		agentId: string,
		taskId: string,
		expression: string,
		timezone: string,
		onTick: () => void,
	): boolean {
		return this.cronRegistry.register(
			{
				namespace: AGENT_TASK_CRON_NAMESPACE,
				ownerId: agentId,
				targetId: taskId,
				expression,
				timezone,
			},
			onTick,
		);
	}

	deregister(agentId: string, taskId: string): void {
		this.cronRegistry.deregisterTarget(AGENT_TASK_CRON_NAMESPACE, agentId, taskId);
	}
}
