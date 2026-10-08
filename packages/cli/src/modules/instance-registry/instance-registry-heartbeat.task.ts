import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { InstanceRegistryService } from './instance-registry.service';
import { REGISTRY_CONSTANTS } from './instance-registry.types';

/**
 * Refreshes the registry entry of this process before it expires.
 */
@SystemTask()
export class InstanceRegistryHeartbeatTask implements SystemTask {
	readonly name = 'instance-registry-heartbeat';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS,
	);

	/** Only the owning process can refresh its own entry. */
	readonly target = {
		scope: 'instance',
		instanceTypes: ['main', 'worker', 'webhook'],
	} satisfies SystemTaskTarget;

	constructor(private readonly instanceRegistryService: InstanceRegistryService) {}

	async run(): Promise<void> {
		await this.instanceRegistryService.heartbeat();
	}
}
