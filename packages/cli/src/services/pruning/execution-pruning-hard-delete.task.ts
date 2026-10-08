import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { ExecutionsPruningService } from './executions-pruning.service';

/**
 * Hard-deletes the soft-deleted executions and their binary data, draining the
 * backlog in batches within one run.
 */
@SystemTask()
export class ExecutionPruningHardDeleteTask implements SystemTask {
	readonly name = 'execution-pruning-hard-delete';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		this.executionsConfig.pruneDataIntervals.hardDelete * Time.minutes.toSeconds,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: true };

	constructor(
		private readonly executionsConfig: ExecutionsConfig,
		private readonly pruningService: ExecutionsPruningService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.pruningService.hardDelete(signal);
	}
}
