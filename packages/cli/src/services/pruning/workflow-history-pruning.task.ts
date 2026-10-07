import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
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

	// One DELETE that ignores the signal. A timeout that stops the run before the
	// DELETE ends lets the next run start a second one, so it waits for the
	// statement timeout first.
	readonly timeoutSeconds = timeoutAfterLimit(
		statementTimeoutSeconds(this.databaseConfig),
		5 * Time.minutes.toSeconds,
	);

	constructor(
		private readonly databaseConfig: DatabaseConfig,
		private readonly workflowHistoryManager: WorkflowHistoryManager,
	) {}

	async run(): Promise<void> {
		await this.workflowHistoryManager.prune();
	}
}
