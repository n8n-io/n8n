import { InstanceAiConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { InstanceAiService } from './instance-ai.service';

/**
 * Expires stale Instance AI checkpoints, hard-deletes their tombstones past
 * the GC horizon, and drops expired pending confirmations and conversation
 * threads, so suspended-run state does not pile up forever.
 */
@SystemTask()
export class InstanceAiCheckpointPruningTask implements SystemTask {
	readonly name = 'instance-ai-checkpoint-pruning';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: Math.max(
			1,
			Math.round(this.instanceAiConfig.pruneInterval * Time.milliseconds.toSeconds),
		),
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	readonly runOnTakeover = true;

	readonly retryDelaySeconds = 30;

	constructor(
		private readonly instanceAiConfig: InstanceAiConfig,
		private readonly instanceAiService: InstanceAiService,
	) {}

	async run(): Promise<void> {
		await this.instanceAiService.pruneExpiredData();
	}
}
