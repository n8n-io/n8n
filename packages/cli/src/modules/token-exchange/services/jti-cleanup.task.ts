import { Logger } from '@n8n/backend-common';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { TokenExchangeJtiRepository } from '../database/repositories/token-exchange-jti.repository';
import { TokenExchangeConfig } from '../token-exchange.config';

/**
 * Deletes expired token-exchange JTI records in batches, so the
 * replay-protection table does not grow unbounded.
 */
@SystemTask()
export class JtiCleanupTask implements SystemTask {
	readonly name = 'jti-cleanup';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: this.config.jtiCleanupIntervalSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly config: TokenExchangeConfig,
		private readonly jtiRepository: TokenExchangeJtiRepository,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	async run(signal: AbortSignal): Promise<void> {
		const batchSize = this.config.jtiCleanupBatchSize;
		let totalDeleted = 0;
		let deleted: number;
		do {
			deleted = await this.jtiRepository.deleteExpiredBatch(batchSize);
			totalDeleted += deleted;
		} while (deleted > 0 && deleted >= batchSize && !signal.aborted);

		if (totalDeleted > 0) {
			this.logger.debug('Cleaned up expired JTIs', { count: totalDeleted });
		}
	}
}
