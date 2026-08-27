import { Logger, ModulesConfig } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { CentralInstanceMonitoringReportRepository } from './database/repositories/central-instance-monitoring-report.repository';
import { InstanceReportingSettingsService } from './instance-reporting-settings.service';
import { InstanceReportingConfig } from './instance-reporting.config';
import { InstanceReportingService } from './instance-reporting.service';

const MINUTES_PER_DAY = 24 * 60;

/** How long to wait before re-attempting a delivery that failed. */
const RETRY_DELAY_MS = 5 * Time.minutes.toMilliseconds;

/** Attempts within one day before giving up until the next day's slot. */
const MAX_ATTEMPTS_PER_DAY = 3;

/**
 * Fires the daily instance report at this instance's configured report time.
 *
 * **Deliberately not built on the durable scheduler.** That framework has no
 * first-class support for system-owned jobs yet; rather than bend it into a
 * shape its owners would have to unpick later, this uses a plain in-process
 * timer, the same way pruning and compaction do. It is the intended home for
 * this job once the scheduler grows that support, so the surface here is kept
 * deliberately small: decide *when*, and call
 * {@link InstanceReportingService.sendReport}.
 *
 * What replaces the durability the scheduler would have given:
 *
 * - **Leader-only.** In multi-main, followers hold no timer, so exactly one
 *   instance reports. Handover moves the timer with leadership.
 * - **Catch-up over precision.** Every tick asks the database whether today's
 *   report has been delivered rather than trusting that a timer fired, so a
 *   restart or handover that straddles the report time still reports that day.
 * - **Bounded retry.** A failed delivery is re-attempted a few times before the
 *   day is left to the next slot.
 */
@Service()
export class InstanceReportingScheduler {
	private timeout: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	/** Delivery attempts for the current day; reset once a day is done with. */
	private attemptsToday = 0;

	constructor(
		private readonly config: InstanceReportingConfig,
		private readonly reportingService: InstanceReportingService,
		private readonly reportRepository: CentralInstanceMonitoringReportRepository,
		private readonly settingsService: InstanceReportingSettingsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly modulesConfig: ModulesConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-reporting');
	}

	/**
	 * Validate what the module needs, then start reporting if this instance leads.
	 *
	 * Runs from the module entrypoint, which the registry calls after
	 * `initOrchestration` has settled this instance's role, so `isLeader` is
	 * already meaningful here.
	 */
	async init(): Promise<void> {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		// The daily figure is read from insights, so the reporter cannot run without it.
		if (this.modulesConfig.disabledModules.includes('insights')) {
			throw new UserError(
				'The `instance-reporting` module requires the `insights` module, but it is listed in N8N_DISABLED_MODULES. Remove `insights` from N8N_DISABLED_MODULES or remove `instance-reporting` from N8N_ENABLED_MODULES.',
			);
		}

		if (!this.config.instanceReportingBaseUrl) {
			this.logger.warn(
				'Instance reporting is enabled but N8N_INSTANCE_REPORTING_BASE_URL is unset, so no reports will be sent',
			);
			return;
		}

		if (this.instanceSettings.isLeader) this.start();
	}

	get isEnabled(): boolean {
		return (
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader &&
			this.config.instanceReportingBaseUrl !== ''
		);
	}

	/**
	 * Begin reporting. The first tick runs immediately: it reports if this day's
	 * slot has already passed and nothing was delivered for it, then arms the timer
	 * for the next slot. That is what makes a restart, or taking over from a main
	 * that died before its slot, still report the day.
	 */
	@OnLeaderTakeover()
	start(): void {
		if (!this.isEnabled || this.isShuttingDown || this.timeout !== undefined) return;

		this.logger.debug('Started the instance reporting timer');
		void this.tick();
	}

	@OnLeaderStepdown()
	stop(): void {
		if (this.timeout === undefined) return;

		clearTimeout(this.timeout);
		this.timeout = undefined;
		this.logger.debug('Stopped the instance reporting timer');
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stop();
	}

	/**
	 * One pass: report if due, then arm the next one. Never throws — a pass that
	 * fails still re-arms, otherwise one bad day would stop reporting for good.
	 */
	private async tick(): Promise<void> {
		try {
			const reportTime = await this.settingsService.getReportTime();
			const sent = await this.reportIfDue(reportTime);

			// A failed delivery retries within the day; anything else waits for the
			// next slot. `attemptsToday` is only ever raised by a failure, so a day
			// that reported cleanly resets it here.
			if (sent === 'failed' && this.attemptsToday < MAX_ATTEMPTS_PER_DAY) {
				this.scheduleNext(RETRY_DELAY_MS);
				return;
			}

			if (sent === 'failed') {
				this.logger.error(
					'Giving up on the instance report for today after repeated delivery failures',
					{ attempts: this.attemptsToday },
				);
			}

			this.attemptsToday = 0;
			this.scheduleNext(msUntilNext(reportTime, new Date()));
		} catch (error) {
			// Reaching here means the report time could not even be resolved (e.g. the
			// database is briefly unavailable), so retry rather than stall until tomorrow.
			this.logger.error('Instance reporting pass failed', { error });
			this.scheduleNext(RETRY_DELAY_MS);
		}
	}

	/**
	 * Report when this day's slot has passed and nothing has been delivered for it
	 * yet. Both conditions are re-checked here rather than inferred from the timer
	 * having fired, so an early fire (a backward clock jump) reports nothing and a
	 * duplicate fire is a no-op.
	 */
	private async reportIfDue(reportTime: string): Promise<'sent' | 'skipped' | 'failed'> {
		const now = new Date();
		if (now.getTime() < slotOn(reportTime, now)) return 'skipped';
		if (await this.reportRepository.hasDeliveredToday(now)) return 'skipped';

		try {
			await this.reportingService.sendReport();
			return 'sent';
		} catch (error) {
			this.attemptsToday++;
			this.logger.warn('Failed to deliver the instance report', {
				attempt: this.attemptsToday,
				error,
			});
			return 'failed';
		}
	}

	private scheduleNext(delayMs: number): void {
		if (!this.isEnabled || this.isShuttingDown) return;

		this.timeout = setTimeout(async () => await this.tick(), delayMs);
	}
}

/** Epoch ms of `reportTime` on `now`'s UTC day. */
function slotOn(reportTime: string, now: Date): number {
	const [hour, minute] = reportTime.split(':').map(Number);

	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0);
}

/**
 * Milliseconds until the next `reportTime` strictly after `now` — later today if
 * the slot is still ahead, otherwise tomorrow. Recomputed from the wall clock on
 * every pass, so a clock correction shifts the next fire instead of accumulating
 * drift.
 */
function msUntilNext(reportTime: string, now: Date): number {
	const today = slotOn(reportTime, now);
	const next = today > now.getTime() ? today : today + MINUTES_PER_DAY * Time.minutes.toMilliseconds;

	return next - now.getTime();
}
