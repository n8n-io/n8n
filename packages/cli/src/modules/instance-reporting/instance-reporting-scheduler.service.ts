import { Logger, ModulesConfig } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { InstanceMonitoringReportRepository } from './database/repositories/instance-monitoring-report.repository';
import { InstanceReportingSettingsService } from './instance-reporting-settings.service';
import { InstanceReportingConfig } from './instance-reporting.config';
import { InstanceReportingService, RETRY_DELAY_MS } from './instance-reporting.service';

import { EventService } from '@/events/event.service';

const MINUTES_PER_DAY = 24 * 60;

/**
 * Fires the daily instance report at this instance's configured report time.
 *
 * Uses a plain in-process timer, the same way pruning and compaction do,
 * because the durable scheduler has no support for system-owned jobs yet. It is
 * the intended home for this job once it does, so this class does one thing:
 * decide *when*, then call {@link InstanceReportingService.sendReport}.
 *
 * Durability comes from elsewhere instead:
 *
 * - **Leader-only.** In multi-main, followers hold no timer, so exactly one
 *   instance reports. Handover moves the timer with leadership.
 * - **Catch-up over precision.** Every tick asks the database whether today's
 *   report has settled rather than trusting that a timer fired, so a restart or
 *   handover that straddles the report time still reports that day.
 * - **Bounded retry, held in the database.** The report row carries the attempts
 *   made and when the last one finished, so a restart resumes that budget rather
 *   than starting a fresh one.
 */
@Service()
export class InstanceReportingScheduler {
	private timeout: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly onServerStarted = () => this.start();

	constructor(
		private readonly config: InstanceReportingConfig,
		private readonly reportingService: InstanceReportingService,
		private readonly reportRepository: InstanceMonitoringReportRepository,
		private readonly settingsService: InstanceReportingSettingsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly modulesConfig: ModulesConfig,
		private readonly eventService: EventService,
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

		// Defer the first tick until the server has finished starting. A boot
		// catch-up report can send right away, but log streaming module was not properly initialized
		if (this.instanceSettings.isLeader) {
			this.eventService.once('server-started', this.onServerStarted);
		}
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
		this.eventService.off('server-started', this.onServerStarted);

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

			// An attempt too soon after the last one arms for the remainder rather
			// than falling through, which would sleep until tomorrow and drop the retry.
			const waitMs = await this.reportingService.msUntilRetryAllowed(new Date());
			if (waitMs > 0) {
				this.scheduleNext(waitMs);
				return;
			}

			// A failed delivery retries; the row decides when the attempts run out,
			// after which the day reads as settled and this waits for the next slot.
			if ((await this.reportIfDue(reportTime)) === 'failed') {
				this.scheduleNext(RETRY_DELAY_MS);
				return;
			}

			this.scheduleNext(msUntilNext(reportTime, new Date()));
		} catch (error) {
			// Reaching here means the report time could not even be resolved (e.g. the
			// database is briefly unavailable), so retry rather than stall until tomorrow.
			this.logger.error('Instance reporting pass failed', { error });
			this.scheduleNext(RETRY_DELAY_MS);
		}
	}

	/**
	 * Report when this day's slot has passed and the day is not settled yet. Both
	 * conditions are re-checked here rather than inferred from the timer having
	 * fired, so an early fire (a backward clock jump) reports nothing and a
	 * duplicate fire is a no-op.
	 */
	private async reportIfDue(reportTime: string): Promise<'sent' | 'skipped' | 'failed'> {
		const now = new Date();
		if (now.getTime() < slotOn(reportTime, now)) return 'skipped';
		if (await this.reportRepository.hasSettledToday(now)) return 'skipped';

		try {
			await this.reportingService.sendReport();
			return 'sent';
		} catch (error) {
			this.logger.warn('Failed to deliver the instance report', { error });
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
	const next =
		today > now.getTime() ? today : today + MINUTES_PER_DAY * Time.minutes.toMilliseconds;

	return next - now.getTime();
}
