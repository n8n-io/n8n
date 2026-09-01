import { Time } from '@n8n/constants';
import { DbConnection } from '@n8n/db';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowHistoryCompactionService } from './workflow-history-compaction.service';

/**
 * Trims long-running workflow histories down to one version per time bucket,
 * so old histories keep their shape without keeping every auto-save.
 */
@SystemTask()
export class WorkflowHistoryCompactionTrimTask implements SystemTask {
	readonly name = 'workflow-history-compaction-trim';

	// Hourly tick with a 3am gate in run() mirrors the legacy timer, which had
	// to survive leader changes. CAT-4173 replaces this with a cron schedule.
	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: Time.hours.toSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	constructor(
		private readonly dbConnection: DbConnection,
		private readonly compactionService: WorkflowHistoryCompactionService,
	) {}

	async run(): Promise<void> {
		if (!this.compactionService.isEnabled || !this.dbConnection.connectionState.migrated) return;
		if (!this.compactionService.isTrimmingEnabled) return;
		if (new Date().getHours() !== 3) return;
		await this.compactionService.trimLongRunningHistories();
	}
}
