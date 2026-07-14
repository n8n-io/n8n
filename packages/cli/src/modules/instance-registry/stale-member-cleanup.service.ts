import { Logger } from '@n8n/backend-common';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { InstanceRegistryService } from './instance-registry.service';
import { REGISTRY_CONSTANTS } from './instance-registry.types';

@Service()
export class StaleMemberCleanupService {
	private cleanupInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly instanceRegistryService: InstanceRegistryService,
	) {
		this.logger = logger.scoped('instance-registry');
	}

	init() {
		if (this.instanceSettings.isLeader) this.startCleanup();
	}

	@OnLeaderTakeover()
	startCleanup() {
		if (this.isShuttingDown) return;

		this.cleanupInterval = setInterval(
			async () => await this.cleanup(),
			REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS,
		);

		this.logger.debug('Stale member cleanup scheduled');
	}

	@OnLeaderStepdown()
	stopCleanup() {
		clearInterval(this.cleanupInterval);
		this.cleanupInterval = undefined;
	}

	private async cleanup() {
		try {
			const removed = await this.instanceRegistryService.cleanupStaleMembers();
			if (removed > 0) {
				this.logger.info('Cleaned up stale registry members', { removed });
			}
		} catch (error) {
			this.logger.warn('Failed to clean up stale registry members', { error });
		}
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopCleanup();
	}
}
