import { Service } from '@n8n/di';
import type { CronContext, Workflow } from 'n8n-workflow';

import { CronRegistry } from './cron-registry';

const WORKFLOW_CRON_NAMESPACE = 'workflow';

@Service()
export class ScheduledTaskManager {
	constructor(private readonly cronRegistry: CronRegistry) {}

	/**
	 * @param onTick - Callback invoked when the cron fires.
	 */
	registerCron(ctx: CronContext, onTick: (scheduledTime: Date) => void): boolean {
		return this.cronRegistry.register(
			{
				namespace: WORKFLOW_CRON_NAMESPACE,
				ownerId: ctx.workflowId,
				targetId: ctx.nodeId,
				timezone: ctx.timezone,
				expression: ctx.expression,
				recurrence: ctx.recurrence,
			},
			onTick,
		);
	}

	/** Returns whether any crons were registered for the workflow and got stopped. */
	deregisterCrons(workflowId: string): boolean {
		return this.cronRegistry.deregisterOwner(WORKFLOW_CRON_NAMESPACE, workflowId);
	}

	/** Ids of workflows that currently have crons registered. */
	getWorkflowIdsWithCrons(): Array<Workflow['id']> {
		return this.cronRegistry.getOwnerIds(WORKFLOW_CRON_NAMESPACE);
	}

	/** Distinct node ids that currently have crons registered for the workflow. */
	getCronNodeIds(workflowId: string): string[] {
		return this.cronRegistry.getTargetIds(WORKFLOW_CRON_NAMESPACE, workflowId);
	}

	/** Deregister the crons registered for a single node of a workflow. */
	deregisterCron(workflowId: string, nodeId: string) {
		this.cronRegistry.deregisterTarget(WORKFLOW_CRON_NAMESPACE, workflowId, nodeId);
	}

	/** Whether any crons are currently registered for the workflow. */
	hasCrons(workflowId: string) {
		return this.cronRegistry.hasOwner(WORKFLOW_CRON_NAMESPACE, workflowId);
	}

	deregisterAllCrons() {
		this.cronRegistry.deregisterNamespace(WORKFLOW_CRON_NAMESPACE);
	}
}
