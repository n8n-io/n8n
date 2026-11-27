import { Time } from '@n8n/constants';
import { instanceTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { Telemetry } from '@/telemetry';

/**
 * Sends the usage events this process buffered in memory.
 */
@SystemTask()
export class TelemetryBufferFlushTask implements SystemTask {
	readonly name = 'telemetry-buffer-flush';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(6 * Time.hours.toSeconds);

	/** The buffer belongs to this process, so no other instance can drain it. */
	readonly target = instanceTarget(['main', 'worker', 'webhook']);

	constructor(private readonly telemetry: Telemetry) {}

	async run(): Promise<void> {
		this.telemetry.flushBuffers();
	}
}
