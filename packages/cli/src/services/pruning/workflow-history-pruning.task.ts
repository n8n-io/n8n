import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';

/** Deletes workflow versions older than the retention period, except the ones a workflow still points to. */
@SystemTask()
export class WorkflowHistoryPruningTask implements SystemTask {
	readonly name = 'workflow-history-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		// Only the leader prunes, so a new leader runs once at takeover instead of waiting an hour.
		runOnTakeover: true,
	};

	constructor(private readonly workflowHistoryManager: WorkflowHistoryManager) {}

	async run(): Promise<void> {
		await this.workflowHistoryManager.prune();
	}
}
