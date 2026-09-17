import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';

/**
 * Expires agent checkpoints past their TTL, so a stale suspended run can no
 * longer be resumed and the checkpoint table stays small.
 */
@SystemTask()
export class AgentCheckpointPruningTask implements SystemTask {
	readonly name = 'agent-checkpoint-pruning';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: Time.hours.toSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	readonly runOnTakeover = true;

	readonly retryDelaySeconds = 30;

	constructor(private readonly checkpointStorage: N8NCheckpointStorage) {}

	async run(): Promise<void> {
		await this.checkpointStorage.pruneStaleSuspensions();
	}
}
