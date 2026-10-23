import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { IDEMPOTENCY_KEY_TTL_MS } from '@n8n/db';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { IdempotencyKeyService } from '@/public-api/idempotency-key.service';

@SystemTask()
export class IdempotencyKeyCleanupTask implements SystemTask {
	readonly name = 'idempotency-key-cleanup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly target = clusterTarget({
		/** A key is either past the cutoff or not, so a repeated run deletes nothing new. */
		scheduler: { retryOnFailure: true },
		leaderTimer: {
			/** A new leader on the fallback timer sweeps at once instead of waiting an hour. */
			runOnTakeover: true,
		},
	});

	constructor(
		private readonly logger: Logger,
		private readonly idempotencyKeyService: IdempotencyKeyService,
	) {
		this.logger = this.logger.scoped('idempotency-key');
	}

	async run(signal: AbortSignal): Promise<void> {
		const cutoff = new Date(Date.now() - IDEMPOTENCY_KEY_TTL_MS);
		const deleted = await this.idempotencyKeyService.deleteOlderThan(cutoff, signal);

		if (deleted > 0) {
			this.logger.debug('Cleaned up expired idempotency keys', { count: deleted });
		}
	}
}
