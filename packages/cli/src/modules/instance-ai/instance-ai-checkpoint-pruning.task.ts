import { DatabaseConfig, InstanceAiConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromMilliseconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { InstanceAiService } from './instance-ai.service';

/**
 * Expires stale Instance AI checkpoints, hard-deletes their tombstones past
 * the GC horizon, and drops expired pending confirmations and conversation
 * threads, so suspended-run state does not pile up forever.
 */
@SystemTask()
export class InstanceAiCheckpointPruningTask implements SystemTask {
	readonly name = 'instance-ai-checkpoint-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.instanceAiConfig.pruneInterval,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		runOnTakeover: true,
	};

	readonly retryDelaySeconds = 30;

	// The checkpoint steps are one UPDATE and one DELETE that ignore the signal. A
	// timeout that stops the run before they end lets the next run start them
	// again, so it waits for the statement timeout first.
	readonly timeoutSeconds = timeoutAfterLimit(
		statementTimeoutSeconds(this.databaseConfig),
		5 * Time.minutes.toSeconds,
	);

	constructor(
		private readonly instanceAiConfig: InstanceAiConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly instanceAiService: InstanceAiService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.instanceAiService.pruneExpiredData(Date.now(), signal);
	}
}
