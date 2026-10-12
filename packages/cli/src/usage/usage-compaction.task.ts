import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { UsageCompactionService } from './usage-compaction.service';

/** Days only become eligible at UTC midnight, so an hourly run catches each one promptly. */
@SystemTask()
export class UsageCompactionTask implements SystemTask {
	readonly name = 'usage-compaction';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	/** A day already rolled up has no hourly rows left, so a repeated run does nothing. */
	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		runOnTakeover: true,
	};

	constructor(private readonly compactionService: UsageCompactionService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.compactionService.compact(signal);
	}
}
