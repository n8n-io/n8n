import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { UsageRepository } from '@n8n/db';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { UsageConfig } from './usage.config';

const BATCH_SIZE = 5000;

/** Bounds `usage_ledger`, which gains one row per finished run or agent message. */
@SystemTask()
export class UsageLedgerPruningTask implements SystemTask {
	readonly name = 'usage-ledger-pruning';

	/** Hourly, so each sweep deletes about an hour of rows instead of a day at once. */
	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		runOnTakeover: true,
	};

	constructor(
		private readonly logger: Logger,
		private readonly usageRepository: UsageRepository,
		private readonly usageConfig: UsageConfig,
	) {
		this.logger = this.logger.scoped('usage');
	}

	async run(signal: AbortSignal): Promise<void> {
		const { ledgerRetentionDays } = this.usageConfig;
		// 0 keeps rows forever, so a config typo cannot empty the ledger.
		if (ledgerRetentionDays <= 0) return;

		const cutoff = new Date(Date.now() - ledgerRetentionDays * Time.days.toMilliseconds);
		const deleted = await this.usageRepository.deleteLedgerOlderThan(cutoff, BATCH_SIZE, signal);
		if (deleted > 0) this.logger.debug(`Pruned ${deleted} usage ledger rows`);
	}
}
