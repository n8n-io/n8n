import { DatabaseConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask, timeoutAfterLimit } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

/**
 * Expires agent checkpoints past their TTL, so a stale suspended run can no
 * longer be resumed and the checkpoint table stays small.
 */
@SystemTask()
export class AgentCheckpointPruningTask implements SystemTask {
	readonly name = 'agent-checkpoint-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// The checkpoint step is one UPDATE that ignores the signal. A timeout that
			// stops the run before the UPDATE ends lets the next run start a second one,
			// so it waits for the statement timeout first.
			timeoutSeconds: timeoutAfterLimit(
				statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds,
			),
		},
		leaderTimer: {
			runOnTakeover: true,
			retryDelaySeconds: 30,
		},
	});

	constructor(
		private readonly databaseConfig: DatabaseConfig,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly backgroundJobs: AgentBackgroundJobService,
		private readonly agentExecutionRepository: AgentExecutionRepository,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		const threadIds = await this.checkpointStorage.pruneStaleSuspensions();
		await this.agentExecutionRepository.failExpiredWaitingApprovals(threadIds);
		await this.backgroundJobs.pruneExpiredPausedJobs(undefined, signal);
	}
}
