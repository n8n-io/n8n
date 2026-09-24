import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { ExecutionsPruningService } from './executions-pruning.service';

/**
 * Soft-deletes executions past the configured max age or count, marking them
 * for the hard-deletion cycle that removes them and their binary data.
 */
@SystemTask()
export class ExecutionPruningSoftDeleteTask implements SystemTask {
	readonly name = 'execution-pruning-soft-delete';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.executionsConfig.pruneDataIntervals.softDelete * Time.minutes.toMilliseconds,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: false };

	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly pruningService: ExecutionsPruningService,
	) {}

	async run(): Promise<void> {
		await this.pruningService.softDelete();
	}
}
