import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { InstanceAiPendingConfirmationRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@Service()
export class PendingConfirmationPruningService {
	private pruningInterval: NodeJS.Timeout | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly repo: InstanceAiPendingConfirmationRepository,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	init() {
		if (this.instanceSettings.isLeader) this.startPruning();
	}

	@OnLeaderTakeover()
	startPruning() {
		this.pruningInterval = setInterval(
			async () => await this.prune(),
			1 * Time.minutes.toMilliseconds,
		);
	}

	@OnLeaderStepdown()
	stopPruning() {
		if (this.pruningInterval) {
			clearInterval(this.pruningInterval);
			this.pruningInterval = undefined;
		}
	}

	@OnShutdown()
	shutdown() {
		this.stopPruning();
	}

	async prune(): Promise<void> {
		try {
			const deleted = await this.repo.deleteExpired();
			if (deleted > 0) {
				this.logger.debug('Pruned expired HITL pending confirmations', { count: deleted });
			}
		} catch (error) {
			this.logger.warn('Failed to prune expired HITL pending confirmations', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
