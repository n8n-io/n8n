import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { CredentialsRepository } from '@n8n/db';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

/**
 * Deletes credentials created for an OAuth popup whose authorization never
 * arrived. The editor deletes these itself when its flow ends; this catches the
 * flows it could not end, such as a page reload or a closed tab.
 */
@SystemTask()
export class PendingAuthorizationCleanupTask implements SystemTask {
	name = 'pending-authorization-cleanup';

	/** Rows are hidden while they wait, so they only need to go within a few grace periods. */
	schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: 1 * Time.hours.toSeconds,
	};

	/** A row is either past its deadline or not, so a repeated run deletes nothing new. */
	effects: SystemTaskEffects = 'idempotent';

	durable = false;

	runOnTakeover = true;

	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
	) {
		this.logger = this.logger.scoped('quick-connect');
	}

	async run(): Promise<void> {
		const deleted = await this.credentialsRepository.deleteExpiredPendingAuthorizations(new Date());
		if (deleted > 0) {
			this.logger.debug(`Deleted ${deleted} credentials with expired pending authorization`);
		}
	}
}
