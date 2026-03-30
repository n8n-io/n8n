import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { LessThan } from '@n8n/typeorm';

import { InstanceAiWorkflowSnapshotRepository } from './repositories/instance-ai-workflow-snapshot.repository';

@Service()
export class SnapshotPruningService {
	private pruningInterval: NodeJS.Timeout | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly config: InstanceAiConfig,
		private readonly snapshotRepo: InstanceAiWorkflowSnapshotRepository,
	) {
		this.logger = this.logger.scoped('pruning');
	}

	@OnLeaderTakeover()
	startPruning() {
		if (this.config.snapshotPruneInterval <= 0) return;

		const intervalMs = this.config.snapshotPruneInterval * Time.minutes.toMilliseconds;
		this.pruningInterval = setInterval(async () => await this.prune(), intervalMs);
		this.logger.debug('Started snapshot pruning timer');
	}

	@OnLeaderStepdown()
	stopPruning() {
		if (this.pruningInterval) {
			clearInterval(this.pruningInterval);
			this.pruningInterval = undefined;
			this.logger.debug('Stopped snapshot pruning timer');
		}
	}

	@OnShutdown()
	shutdown() {
		this.stopPruning();
	}

	async prune() {
		const retentionMs = this.config.snapshotRetention * Time.minutes.toMilliseconds;
		const cutoff = new Date(Date.now() - retentionMs);

		const { affected } = await this.snapshotRepo.delete({
			updatedAt: LessThan(cutoff),
		});

		if (affected) {
			this.logger.debug('Pruned stale workflow snapshots', { count: affected });
		}
	}
}
