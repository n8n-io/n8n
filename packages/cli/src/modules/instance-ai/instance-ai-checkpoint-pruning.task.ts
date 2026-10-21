import { DatabaseConfig, InstanceAiConfig, statementTimeoutSeconds } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	clusterTarget,
	intervalFromMilliseconds,
	SystemTask,
	timeoutAfterLimit,
} from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { InstanceAiService } from './instance-ai.service';
import {
	SelfHealingTemporaryWorkflowService,
	SELF_HEALING_CLEANUP_BUDGET_MS,
} from './self-healing/self-healing-temporary-workflow.service';

/**
 * Expires stale Instance AI checkpoints, hard-deletes their tombstones past
 * the GC horizon, and drops expired pending confirmations and conversation
 * threads. Also removes abandoned Assistant verification workflows.
 */
@SystemTask()
export class InstanceAiCheckpointPruningTask implements SystemTask {
	readonly name = 'instance-ai-checkpoint-pruning';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.instanceAiConfig.pruneInterval,
	);

	readonly target = clusterTarget({
		scheduler: {
			retryOnFailure: true,
			// Budget pruning and bounded workflow cleanup. Keep time for in-flight calls to finish.
			timeoutSeconds: timeoutAfterLimit(
				3 * statementTimeoutSeconds(this.databaseConfig),
				5 * Time.minutes.toSeconds + SELF_HEALING_CLEANUP_BUDGET_MS / 1000,
			),
		},
		leaderTimer: {
			runOnTakeover: true,
			retryDelaySeconds: 30,
		},
	});

	constructor(
		private readonly instanceAiConfig: InstanceAiConfig,
		private readonly databaseConfig: DatabaseConfig,
		private readonly instanceAiService: InstanceAiService,
		private readonly temporaryWorkflows: SelfHealingTemporaryWorkflowService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.instanceAiService.pruneExpiredData(Date.now(), signal);

		await this.temporaryWorkflows.cleanupAbandoned(signal);
	}
}
