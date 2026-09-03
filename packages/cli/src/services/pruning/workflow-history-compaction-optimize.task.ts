import { WorkflowHistoryCompactionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection } from '@n8n/db';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowHistoryCompactionService } from './workflow-history-compaction.service';

/**
 * Removes redundant recent workflow history versions, so auto-saves that hold
 * no meaningful change do not bloat the history table.
 */
@SystemTask()
export class WorkflowHistoryCompactionOptimizeTask implements SystemTask {
	readonly name = 'workflow-history-compaction-optimize';

	// Optimization runs twice per optimizing window, so first and last versions
	// of a window are covered redundantly across restarts and small gaps.
	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: (this.config.optimizingTimeWindowHours / 2) * Time.hours.toSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	constructor(
		private readonly config: WorkflowHistoryCompactionConfig,
		private readonly dbConnection: DbConnection,
		private readonly compactionService: WorkflowHistoryCompactionService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		if (!this.compactionService.isEnabled || !this.dbConnection.connectionState.migrated) return;
		await this.compactionService.optimizeHistories(signal);
	}
}
