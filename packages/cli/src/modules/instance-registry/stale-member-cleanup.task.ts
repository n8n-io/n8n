import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { InstanceRegistryService } from './instance-registry.service';
import { REGISTRY_CONSTANTS } from './instance-registry.types';

/**
 * Removes instance-registry entries of processes that stopped reporting, so
 * crashed or shut-down instances do not linger in the shared member list.
 */
@SystemTask()
export class StaleMemberCleanupTask implements SystemTask {
	readonly name = 'instance-registry-stale-member-cleanup';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS / Time.seconds.toMilliseconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly instanceRegistryService: InstanceRegistryService,
	) {
		this.logger = logger.scoped('instance-registry');
	}

	async run(): Promise<void> {
		const removed = await this.instanceRegistryService.cleanupStaleMembers();
		if (removed > 0) {
			this.logger.info('Cleaned up stale registry members', { removed });
		}
	}
}
