import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { UnassignedBinaryDataBackfillService } from './unassigned-binary-data-backfill.service';

const BACKFILL_INTERVAL_SECONDS = 60;

/** Ends a run before the next occurrence, so a long backfill does not cause overlap skips. */
const RUN_BUDGET_MS = (BACKFILL_INTERVAL_SECONDS - 15) * Time.seconds.toMilliseconds;

/**
 * Assigns the database files of past webhook executions to their execution, so
 * that the editor can read them and pruning can delete them.
 */
@SystemTask()
export class UnassignedBinaryDataBackfillTask implements SystemTask {
	readonly name = 'unassigned-binary-data-backfill';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(BACKFILL_INTERVAL_SECONDS);

	readonly target = clusterTarget({
		/** A file is assigned only while it has no execution, so a repeated run changes nothing. */
		scheduler: { retryOnFailure: true },
	});

	constructor(private readonly backfillService: UnassignedBinaryDataBackfillService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.backfillService.backfill(signal, RUN_BUDGET_MS);
	}
}
