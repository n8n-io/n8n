import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

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

	readonly target = {
		scope: 'cluster',
		scheduler: {
			maxAttempts: 3,
			// One UPDATE that ignores the signal. A timeout that stops the run before the
			// UPDATE ends lets the next run start a second one, so it waits for the
			// statement timeout first.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
		leaderTimer: {
			runOnTakeover: true,
			retryDelaySeconds: 30,
		},
	} satisfies SystemTaskTarget;

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
