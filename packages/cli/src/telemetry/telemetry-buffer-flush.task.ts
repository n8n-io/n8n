import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { Telemetry } from '@/telemetry';

/**
 * Sends the usage events this process buffered in memory.
 */
@SystemTask()
export class TelemetryBufferFlushTask implements SystemTask {
	readonly name = 'telemetry-buffer-flush';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: 6 * Time.hours.toSeconds,
	};

	/** A flush sends what it drains, so a repeat can report the same events twice. */
	readonly effects: SystemTaskEffects = 'non-idempotent';

	/** The buffer belongs to this process, so no other instance can drain it. */
	readonly placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['main', 'worker', 'webhook'],
	};

	constructor(private readonly telemetry: Telemetry) {}

	async run(): Promise<void> {
		this.telemetry.flushBuffers();
	}
}
