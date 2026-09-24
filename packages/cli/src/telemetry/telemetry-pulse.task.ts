import { Time } from '@n8n/constants';
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
	 * Each leader takeover restarts the six-hour wait. Delayed or missing packets are
	 * acceptable until this task moves to the durable scheduler.
	 */
	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: false };

	constructor(private readonly telemetry: Telemetry) {}

	async run(): Promise<void> {
		await this.telemetry.sendPulsePacket();
	}
}
