import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { TrustedKeyService } from './trusted-key.service';

/** How often to poll sources to check if any are due for refresh. */
const REFRESH_POLL_INTERVAL_SECONDS = 60;

/**
 * Re-fetches trusted public keys whose refresh interval has lapsed, so JWT
 * verification keeps working when an identity provider rotates its keys.
 */
@SystemTask()
export class TrustedKeyRefreshTask implements SystemTask {
	readonly name = 'trusted-key-refresh';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(REFRESH_POLL_INTERVAL_SECONDS);

	readonly target = { scope: 'cluster', scheduler: { maxAttempts: 3 } } satisfies SystemTaskTarget;

	constructor(private readonly trustedKeyService: TrustedKeyService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.trustedKeyService.refreshDueSources(signal);
	}
}
