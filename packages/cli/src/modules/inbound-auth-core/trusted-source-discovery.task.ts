import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { TrustedSourceDiscoveryService } from './trusted-source-discovery.service';

/** How often to look for sources whose discovery is due. */
const DISCOVERY_POLL_INTERVAL_SECONDS = 60;

/**
 * Refreshes the discovered metadata of trusted sources whose refresh interval has lapsed, so
 * JWT verification keeps working when an identity provider rotates its keys.
 */
@SystemTask()
export class TrustedSourceDiscoveryTask implements SystemTask {
	readonly name = 'trusted-source-discovery';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(DISCOVERY_POLL_INTERVAL_SECONDS);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: true };

	constructor(private readonly discovery: TrustedSourceDiscoveryService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.discovery.refreshDue(signal);
	}
}
