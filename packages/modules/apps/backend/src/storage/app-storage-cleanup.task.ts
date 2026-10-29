import { Logger } from '@n8n/backend-common';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { AppArtifactService } from './app-artifact.service';
import { AppRetentionService } from './app-retention.service';
import { AppRepository } from '../app.repository';

@SystemTask()
export class AppStorageCleanupTask implements SystemTask {
	readonly name = 'app-storage-cleanup';
	readonly schedule: SystemTaskSchedule = intervalFromSeconds(15 * 60);
	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: { retryDelaySeconds: 60 },
	});

	constructor(
		private readonly apps: AppRepository,
		private readonly retention: AppRetentionService,
		private readonly artifacts: AppArtifactService,
		private readonly logger: Logger,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		let after: string | undefined;
		while (true) {
			signal.throwIfAborted();
			const ids = await this.apps.listIdsAfter(after);
			if (!ids.length) break;
			for (const id of ids) {
				try {
					await this.retention.prune(id, signal);
				} catch (error) {
					signal.throwIfAborted();
					this.logger.warn('Could not prune app history.', { appId: id, error });
				}
			}
			after = ids.at(-1);
		}
		await this.artifacts.cleanup(signal);
	}
}
