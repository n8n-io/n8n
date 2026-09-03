import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { TrustedKeyService } from './trusted-key.service';

/** How often to poll sources to check if any are due for refresh. */
const REFRESH_POLL_INTERVAL_SECONDS = 30;

/**
 * Re-fetches trusted public keys whose refresh interval has lapsed, so JWT
 * verification keeps working when an identity provider rotates its keys.
 */
@SystemTask()
export class TrustedKeyRefreshTask implements SystemTask {
	readonly name = 'trusted-key-refresh';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: REFRESH_POLL_INTERVAL_SECONDS,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	constructor(private readonly trustedKeyService: TrustedKeyService) {}

	async run(): Promise<void> {
		await this.trustedKeyService.refreshDueSources();
	}
}
