import { Time } from '@n8n/constants';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';
import { AUTORENEWAL_INTERVAL } from '@n8n_io/license-sdk';

import { License } from '@/license';

/**
 * Renews the license when the SDK reports a renewal as due. An entitlement-end
 * renewal is due only inside a 15-minute window, so a longer interval misses it.
 */
@SystemTask()
export class LicenseRenewalTask implements SystemTask {
	readonly name = 'license-renewal';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(AUTORENEWAL_INTERVAL);

	readonly target = {
		scope: 'cluster',
		scheduler: {
			/** A retry after a failed renewal resends a token the server may have rotated already. */
			maxAttempts: 1,
			/** Kept well under one interval, so two checks are never claimable at once. */
			missedAfterSeconds: 5 * Time.minutes.toSeconds,
			/** A check that missed its grace window still runs once, late. */
			catchUp: true,
		},
		leaderTimer: {
			/** A new leader may inherit a due renewal whose window closes before the next interval. */
			runOnTakeover: true,
		},
	} satisfies SystemTaskTarget;

	constructor(private readonly license: License) {}

	async run(): Promise<void> {
		await this.license.renewIfDue();
	}
}
