import { Logger, ModulesConfig } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy, Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { CronSchedule } from '@n8n/scheduler';
import { InstanceSettings } from 'n8n-core';
import type { CronExpression } from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { InsightsService } from '@/modules/insights/insights.service';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { OwnershipService } from '@/services/ownership.service';

import type { InstanceReportDataPoint } from './database/entities/central-instance-monitoring-report';
import { InstanceReportTaskHandler } from './instance-report-task-handler';
import { CentralInstanceMonitoringReportRepository } from './database/repositories/central-instance-monitoring-report.repository';
import { InstanceReportingSettingsService } from './instance-reporting-settings.service';
import { InstanceReportingConfig } from './instance-reporting.config';
import {
	INSTANCE_REPORT_JOB_NAME,
	INSTANCE_REPORT_TASK_TYPE,
	INSTANCE_REPORTS_PATH,
} from './instance-reporting.constants';

@Service()
export class InstanceReportingService {
	constructor(
		private readonly config: InstanceReportingConfig,
		private readonly settingsService: InstanceReportingSettingsService,
		private readonly reportRepository: CentralInstanceMonitoringReportRepository,
		private readonly provisioner: DurableJobProvisioner,
		private readonly scheduler: DurableScheduler,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownershipService: OwnershipService,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly modulesConfig: ModulesConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-reporting');
	}

	/**
	 * Register the task handler and provision the daily job.
	 *
	 * Runs from the module entrypoint, which the registry calls before
	 * `DurableScheduler.start()`, so the handler is in place by the time the
	 * scheduler's loops begin.
	 */
	async init(): Promise<void> {
		// The daily report runs as a durable scheduler job, so without the scheduler
		// nothing would ever fire. Fail loudly rather than silently never reporting.
		if (!this.globalConfig.scheduler.enabled) {
			throw new UserError(
				'The `instance-reporting` module requires the durable scheduler, which is off. Set N8N_SCHEDULER_ENABLED=true or remove `instance-reporting` from N8N_ENABLED_MODULES.',
			);
		}

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

		const handler = new InstanceReportTaskHandler(this);
		this.scheduler.registerTaskHandler(handler.taskType, handler);
		await this.scheduleDailyReport();
	}

	/**
	 * Provision the durable job that fires one report per day, at this instance's
	 * persisted time. Idempotent: re-provisioning an unchanged schedule is a no-op,
	 * so this runs on every boot.
	 */
	async scheduleDailyReport(): Promise<void> {
		const reportTime = await this.settingsService.getReportTime();
		const [hour, minute] = reportTime.split(':');

		await this.provisioner.provisionSystemJob(
			INSTANCE_REPORT_JOB_NAME,
			INSTANCE_REPORT_TASK_TYPE,
			{},
			{
				kind: 'cron',
				// Six fields, seconds first.
				cronExpression: `0 ${minute} ${hour} * * *` as CronExpression,
				timezone: 'UTC',
			} satisfies CronSchedule,
			// A backlog from downtime collapses into one late run reporting yesterday,
			// rather than one run per missed day that would each report the same day.
			ScheduledJobMisfirePolicy.Coalesce,
		);

		this.logger.debug('Scheduled the daily instance report', { reportTime });
	}

	/**
	 * Report yesterday's billable executions as a daily data point, plus the
	 * instance's lifetime total as a cumulative one. Only a finished day has a
	 * final number, so the day reported is always the previous completed UTC one.
	 *
	 * The report row is written before the request goes out and carries the
	 * `batchId`, so a redelivery reuses it and the receiver deduplicates. Cumulative
	 * points carry no date; the receiver keeps the most recently received value.
	 *
	 * A retry resends today's pending report exactly as measured instead of taking
	 * fresh numbers. The cumulative point is a lifetime total sampled at this
	 * instance's report time, so its day-to-day difference only lines up with the
	 * daily point while every sample sits 24 hours apart; re-measuring hours later
	 * would stretch one interval and skew the whole series.
	 *
	 * @throws when delivery fails, so the scheduler retries with backoff.
	 */
	async sendReport(): Promise<void> {
		const now = new Date();
		const report =
			(await this.reportRepository.findTodaysPending(now)) ??
			(await this.reportRepository.createPending(await this.collectDataPoints(now)));

		const payload = {
			instanceId: this.instanceSettings.instanceId,
			batchId: report.id,
			...(this.config.instanceReportingIdentifier
				? { label: this.config.instanceReportingIdentifier }
				: {}),
			n8nVersion: N8N_VERSION,
			dataPoints: report.dataPoints,
		};

		try {
			const response = await fetch(this.reportsUrl(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.instanceReportingAuthToken
						? { Authorization: `Bearer ${this.config.instanceReportingAuthToken}` }
						: {}),
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new OperationalError(
					`Instance report was rejected with status ${response.status} ${response.statusText}`,
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			await this.reportRepository.recordFailure(report.id, message);
			throw error;
		}

		await this.reportRepository.markDelivered(report.id, new Date());
		this.logger.debug('Sent instance report', { batchId: report.id });
	}

	/**
	 * The two data points every report carries, for the last completed UTC day.
	 * Only the daily point is scoped to a day; the cumulative one is a running
	 * total with no date.
	 */
	private async collectDataPoints(now: Date): Promise<InstanceReportDataPoint[]> {
		const reportDate = previousUtcDate(now);
		const startDate = new Date(`${reportDate}T00:00:00.000Z`);
		const endDate = new Date(startDate.getTime() + Time.days.toMilliseconds);

		// Report instance-wide numbers, so read as the instance owner, whose global
		// role grants access to every workflow.
		const owner = await this.ownershipService.getInstanceOwner();

		const [summary, { productionRootExecutions }] = await Promise.all([
			this.insightsService.getInsightsSummary({
				user: owner,
				startDate,
				endDate,
				timeZone: 'UTC',
			}),
			// Same source as the `productionRootExecutions` license metric, so the
			// reported total matches what the license server sees.
			this.licenseMetricsRepository.getLicenseRenewalMetrics(),
		]);

		return [
			{ kind: 'cumulative', name: 'billableExecutions', value: productionRootExecutions },
			{ kind: 'daily', name: 'billableExecutions', value: summary.total.value, date: reportDate },
		];
	}

	/** The configured base URL joined with the receiver's endpoint path. */
	private reportsUrl(): string {
		return this.config.instanceReportingBaseUrl.replace(/\/+$/, '') + INSTANCE_REPORTS_PATH;
	}
}

/** The UTC calendar day before `instant`, as `YYYY-MM-DD`. */
function previousUtcDate(instant: Date): string {
	return new Date(instant.getTime() - Time.days.toMilliseconds).toISOString().slice(0, 10);
}
