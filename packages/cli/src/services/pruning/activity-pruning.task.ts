import { Logger } from '@n8n/backend-common';
import { ActivityLogConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ActivityEventRepository } from '@n8n/db';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

/** Activity accrues steadily rather than in bursts, so an hourly sweep is enough to bound it. */
const sweepIntervalSeconds = 1 * Time.hours.toSeconds;

/**
 * Bounds `activity_event`, which is append-only and would otherwise grow for as long as the
 * instance is used. Age is the primary cap; the entry count is a backstop for an instance that
 * writes more inside the retention window than the window was sized for.
 *
 * Writes happen wherever the mutation lands, but the runner gives this one leader at a time — a
 * second sweeper would only contend for the same rows.
 */
@SystemTask()
export class ActivityPruningTask implements SystemTask {
	name = 'activity-pruning';

	schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: sweepIntervalSeconds };

	/** Deleting rows already deleted is a no-op, so a repeated or retried run is harmless. */
	effects: SystemTaskEffects = 'idempotent';

	durable = false;

	/** A new leader inherits whatever backlog built up while nobody was sweeping. */
	runOnTakeover = true;

	constructor(
		private readonly logger: Logger,
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly activityLogConfig: ActivityLogConfig,
	) {
		this.logger = this.logger.scoped('activity-log');
	}

	async run(signal: AbortSignal): Promise<void> {
		const { enabled, retentionDays, maxEntries } = this.activityLogConfig;

		// Nothing accrues while the flag is off, so there is nothing to sweep. Whatever a previous
		// enabled period left behind is pruned when it is turned back on.
		if (!enabled) return;

		let deleted = 0;

		// Both caps are opt-out with 0, as `EXECUTIONS_DATA_PRUNE_MAX_COUNT` is. Reading 0 as
		// "keep nothing" would empty the table on a config typo.
		if (retentionDays > 0) {
			const cutoff = new Date(Date.now() - retentionDays * Time.days.toMilliseconds);
			deleted += await this.activityEventRepository.deleteOlderThan(cutoff);
		}

		// Checked between the two sweeps rather than inside one: the repository walks its own
		// batches, and each is short enough that stopping at the boundary is soon enough.
		if (signal.aborted) return;

		if (maxEntries > 0) {
			deleted += await this.activityEventRepository.deleteBeyondNewest(maxEntries);
		}

		if (deleted > 0) this.logger.debug(`Pruned ${deleted} activity entries`);
	}
}
