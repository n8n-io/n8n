import { DatabaseConfig, ExecutionsConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { ExecutionsPruningService } from './executions-pruning.service';

/**
 * Soft-deletes executions past the configured max age or count, marking them
 * for the hard-deletion cycle that removes them and their binary data.
 */
@SystemTask()
export class ExecutionPruningSoftDeleteTask implements SystemTask {
	readonly name = 'execution-pruning-soft-delete';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		this.executionsConfig.pruneDataIntervals.softDelete * Time.minutes.toSeconds,
	);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// One UPDATE that ignores the signal. A timeout that stops the run before the
			// UPDATE ends lets the next run start a second one, so it waits for the
			// statement timeout first.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
	});

	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly pruningService: ExecutionsPruningService,
	) {}

	async run(): Promise<void> {
		await this.pruningService.softDelete();
	}
}
