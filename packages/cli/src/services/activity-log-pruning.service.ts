import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ActivityEventRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

/** Activity accrues steadily rather than in bursts, so an hourly sweep is enough to bound it. */
const SWEEP_INTERVAL_MS = 1 * Time.hours.toMilliseconds;

/**
 * Bounds `activity_event`, which gains a row per finished execution and would otherwise grow
 * without limit on a busy instance. Age is the primary cap; the entry count is a backstop for an
 * instance that writes more in the retention window than the window was sized for.
 *
 * Writes happen on every process, but pruning runs only on the leader main — a second sweeper
 * would just contend for the same rows.
 */
@Service()
export class ActivityLogPruningService {
	private timeout: NodeJS.Timeout | undefined;

	private inflightSweep: Promise<void> | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly repository: ActivityEventRepository,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	private get shouldRun() {
		return (
			this.globalConfig.instanceAi.activityLogEnabled &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader &&
			!this.isShuttingDown
		);
	}

	init() {
		if (this.shouldRun) this.start();
	}

	@OnLeaderTakeover()
	start() {
		if (!this.shouldRun || this.timeout !== undefined) return;

		this.scheduleNext(0);
		this.logger.debug('Activity log pruning started');
	}

	@OnLeaderStepdown()
	stop() {
		clearTimeout(this.timeout);
		this.timeout = undefined;
	}

	@OnShutdown()
	async shutdown() {
		this.isShuttingDown = true;
		clearTimeout(this.timeout);
		this.timeout = undefined;
		await this.inflightSweep;
	}

	private scheduleNext(delayMs: number) {
		this.timeout = setTimeout(() => {
			this.inflightSweep = this.sweep().finally(() => {
				this.inflightSweep = undefined;
				if (this.timeout !== undefined) this.scheduleNext(SWEEP_INTERVAL_MS);
			});
		}, delayMs);
		this.timeout.unref();
	}

	/**
	 * Never throws: a failed sweep costs disk, and taking the instance down over it would cost
	 * more. The next tick retries.
	 */
	private async sweep() {
		const { activityLogRetentionDays, activityLogMaxEntries } = this.globalConfig.instanceAi;

		try {
			let deleted = 0;

			if (activityLogRetentionDays > 0) {
				const cutoff = new Date(Date.now() - activityLogRetentionDays * Time.days.toMilliseconds);
				deleted += await this.repository.deleteOlderThan(cutoff);
			}

			if (activityLogMaxEntries > 0) {
				deleted += await this.repository.deleteBeyondNewest(activityLogMaxEntries);
			}

			if (deleted > 0) this.logger.debug(`Pruned ${deleted} activity entries`);
		} catch (error) {
			this.logger.warn('Activity log pruning failed', { error });
		}
	}
}
