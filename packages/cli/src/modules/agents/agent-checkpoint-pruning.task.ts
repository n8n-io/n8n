import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentBackgroundJobService } from './background/agent-background-job.service';

/**
 * Expires agent checkpoints past their TTL, so a stale suspended run can no
 * longer be resumed and the checkpoint table stays small.
 */
@SystemTask()
export class AgentCheckpointPruningTask implements SystemTask {
	readonly name = 'agent-checkpoint-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		runOnTakeover: true,
	};

	readonly retryDelaySeconds = 30;

	// One UPDATE that ignores the signal. A timeout that stops the run before the
	// UPDATE ends lets the next run start a second one, so it waits for the
	// statement timeout first.
	readonly timeoutSeconds = timeoutAfterLimit(
		statementTimeoutSeconds(this.databaseConfig),
		5 * Time.minutes.toSeconds,
	);

	constructor(
		private readonly databaseConfig: DatabaseConfig,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly backgroundJobs: AgentBackgroundJobService,
	) {}

	async run(): Promise<void> {
		await this.checkpointStorage.pruneStaleSuspensions();
		await this.backgroundJobs.pruneExpiredPausedJobs();
	}
}
