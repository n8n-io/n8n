import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { UnassignedBinaryDataCleanupService } from './unassigned-binary-data-cleanup.service';

/** Deletes the database files that no execution owns, so that they do not stay forever. */
@SystemTask()
export class UnassignedBinaryDataCleanupTask implements SystemTask {
	readonly name = 'unassigned-binary-data-cleanup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly target = clusterTarget({
		/** A file is either past the age limit or not, so a repeated run deletes nothing new. */
		scheduler: { retryOnFailure: true },
	});

	constructor(
		private readonly logger: Logger,
		private readonly cleanupService: UnassignedBinaryDataCleanupService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		const deleted = await this.cleanupService.deleteStaleFiles(signal);

		if (deleted > 0) {
			this.logger.info('Deleted binary data files that no execution owns', { count: deleted });
		}
	}
}
