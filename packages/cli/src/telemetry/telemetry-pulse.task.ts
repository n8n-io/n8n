import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { Telemetry } from '@/telemetry';

/**
 * Sends the `pulse` packet of license and usage counters.
 */
@SystemTask()
export class TelemetryPulseTask implements SystemTask {
	readonly name = 'telemetry-pulse';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(6 * Time.hours.toSeconds);

	readonly target = {
		scope: 'cluster',
		scheduler: {
			/** The packet carries instance-wide counters, so a repeat over-reports them. */
			maxAttempts: 1,
			/**
			 * A late packet still describes the instance correctly. An hour carries the
			 * occurrence across a restart or a failover, rather than losing the six-hour
			 * window to the default grace of a minute.
			 */
			missedAfterSeconds: Time.hours.toSeconds,
			/** An outage past the grace still sends one catch-up packet, not none. */
			catchUp: true,
		},
	} satisfies SystemTaskTarget;

	constructor(private readonly telemetry: Telemetry) {}

	async run(): Promise<void> {
		await this.telemetry.sendPulsePacket();
	}
}
