import { ScheduledJobMisfirePolicy, Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { Telemetry } from '@/telemetry';

/**
 * Sends the `pulse` packet of license and usage counters.
 */
@SystemTask()
export class TelemetryPulseTask implements SystemTask {
	readonly name = 'telemetry-pulse';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: 6 * Time.hours.toSeconds,
	};

	/** The packet carries instance-wide counters, so a repeat over-reports them. */
	readonly effects: SystemTaskEffects = 'non-idempotent';

	/**
	 * A late packet still describes the instance correctly. An hour carries the
	 * occurrence across a restart or a failover, rather than losing the six-hour
	 * window to the default grace of a minute.
	 */
	readonly misfireGraceSeconds = Time.hours.toSeconds;

	/** An outage past the grace still sends one catch-up packet, not none. */
	readonly misfirePolicy = ScheduledJobMisfirePolicy.Coalesce;

	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: true };

	constructor(private readonly telemetry: Telemetry) {}

	async run(): Promise<void> {
		await this.telemetry.sendPulsePacket();
	}
}
