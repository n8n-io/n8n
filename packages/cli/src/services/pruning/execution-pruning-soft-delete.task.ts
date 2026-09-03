import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection } from '@n8n/db';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { ExecutionsPruningService } from './executions-pruning.service';

/**
 * Soft-deletes executions past the configured max age or count, marking them
 * for the hard-deletion cycle that removes them and their binary data.
 */
@SystemTask()
export class ExecutionPruningSoftDeleteTask implements SystemTask {
	readonly name = 'execution-pruning-soft-delete';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: this.executionsConfig.pruneDataIntervals.softDelete * Time.minutes.toSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly dbConnection: DbConnection,
		private readonly pruningService: ExecutionsPruningService,
	) {}

	async run(): Promise<void> {
		if (!this.pruningService.isEnabled || !this.dbConnection.connectionState.migrated) return;
		await this.pruningService.softDelete();
	}
}
