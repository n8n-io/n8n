import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { idempotencyKeyTtlMs } from '@n8n/db';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { IdempotencyKeyService } from '@/public-api/idempotency-key.service';

/** One hour is enough. Keys stay readable for 12 hours, and the table grows only on keyed writes. */
const cleanupIntervalSeconds = Time.hours.toSeconds;

/**
 * Deletes idempotency keys older than 12 hours.
 * The table would otherwise keep every keyed Public API write.
 */
@SystemTask()
export class IdempotencyKeyCleanupTask implements SystemTask {
	readonly name = 'idempotency-key-cleanup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(cleanupIntervalSeconds);

	/** Deleting a row that is already gone is a no-op, so a repeated run is harmless. */
	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: false,
		/** A new leader clears keys that expired while no leader was sweeping. */
		runOnTakeover: true,
	};

	constructor(
		private readonly logger: Logger,
		private readonly idempotencyKeyService: IdempotencyKeyService,
	) {
		this.logger = this.logger.scoped('idempotency-key');
	}

	async run(signal: AbortSignal): Promise<void> {
		const cutoff = new Date(Date.now() - idempotencyKeyTtlMs);
		const deleted = await this.idempotencyKeyService.deleteOlderThan(cutoff, signal);

		if (deleted > 0) {
			this.logger.debug('Cleaned up expired idempotency keys', { count: deleted });
		}
	}
}
