import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';
import { AUTORENEWAL_INTERVAL } from '@n8n_io/license-sdk';

import { License } from '@/license';

/**
 * Renews the license before it expires. Each pass asks the license SDK
 * whether a renewal is due, close to expiry or to the end of an entitlement,
 * and renews against the license server when it is.
 * The SDK reports an entitlement-end renewal as due only inside a 15-minute
 * window, so a longer interval misses those renewals.
 */
@SystemTask()
export class LicenseRenewalTask implements SystemTask {
	readonly name = 'license-renewal';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: AUTORENEWAL_INTERVAL / Time.seconds.toMilliseconds,
	};

	readonly effects: SystemTaskEffects = 'non-idempotent';

	readonly durable = false;

	constructor(private readonly license: License) {}

	async run(): Promise<void> {
		await this.license.renewIfDue();
	}
}
