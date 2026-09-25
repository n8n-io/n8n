import { ScheduledJobMisfirePolicy, Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';
import { AUTORENEWAL_INTERVAL } from '@n8n_io/license-sdk';

import { License } from '@/license';

/**
 * Renews the license when the SDK reports a renewal as due. An entitlement-end
 * renewal is due only inside a 15-minute window, so a longer interval misses it.
 */
@SystemTask()
export class LicenseRenewalTask implements SystemTask {
	readonly name = 'license-renewal';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: AUTORENEWAL_INTERVAL / Time.seconds.toMilliseconds,
	};

	/** A retry after a failed renewal resends a token the server may have rotated already. */
	readonly effects: SystemTaskEffects = 'non-idempotent';

	/** A check that missed its grace window still runs once, late. */
	readonly misfirePolicy: ScheduledJobMisfirePolicy = ScheduledJobMisfirePolicy.Coalesce;

	/** Kept well under one interval, so two checks are never claimable at once. */
	readonly misfireGraceSeconds = 5 * Time.minutes.toSeconds;

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		/** A new leader may inherit a due renewal whose window closes before the next interval. */
		runOnTakeover: true,
	};

	constructor(private readonly license: License) {}

	async run(): Promise<void> {
		await this.license.renewIfDue();
	}
}
