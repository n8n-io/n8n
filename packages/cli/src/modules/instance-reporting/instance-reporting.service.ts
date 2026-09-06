import { Logger } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { InsightsService } from '@/modules/insights/insights.service';
import { OwnershipService } from '@/services/ownership.service';

import type { InstanceReportDataPoint } from './database/entities/central-instance-monitoring-report';
import { CentralInstanceMonitoringReportRepository } from './database/repositories/central-instance-monitoring-report.repository';
import { InstanceReportingConfig } from './instance-reporting.config';
import { INSTANCE_REPORTS_PATH } from './instance-reporting.constants';

/**
 * Measures and delivers one instance report. *When* that happens is
 * {@link InstanceReportingScheduler}'s concern.
 */
/** A hung receiver must not hold a delivery open until the next report is due. */
const REQUEST_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds;

@Service()
export class InstanceReportingService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly config: InstanceReportingConfig,
		private readonly reportRepository: CentralInstanceMonitoringReportRepository,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownershipService: OwnershipService,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly logger: Logger,
		outboundHttp: OutboundHttp,
	) {
		this.logger = this.logger.scoped('instance-reporting');

		this.http = outboundHttp.requests({
			// The receiver is set by the operator and may legitimately be an internal
			// collector, so the URL is never user-controlled.
			useDefaultSsrfPolicy: 'unsafe',
			baseURL: this.config.instanceReportingBaseUrl.replace(/\/+$/, ''),
			// An unset token drops the header, so an unauthenticated receiver works.
			headers: () => ({
				authorization: this.config.instanceReportingAuthToken
					? `Bearer ${this.config.instanceReportingAuthToken}`
					: undefined,
			}),
			timeout: REQUEST_TIMEOUT_MS,
		});
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
			const response = await this.http.request<unknown>({
				url: INSTANCE_REPORTS_PATH,
				method: 'POST',
				body: payload,
				json: true,
				returnFullResponse: true,
				// Inspect the status here rather than catching a generic request error.
				ignoreHttpStatusErrors: true,
				// A redirect would forward the auth token to whatever host it names.
				disableFollowRedirect: true,
			});

			// The endpoint answers 201 on success. Anything else, including a 2xx or a
			// 3xx (redirects are not followed), means the report did not land.
			if (response.statusCode !== 201) {
				throw new OperationalError(
					`Instance report was rejected with status ${response.statusCode}`,
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
}

/** The UTC calendar day before `instant`, as `YYYY-MM-DD`. */
function previousUtcDate(instant: Date): string {
	return new Date(instant.getTime() - Time.days.toMilliseconds).toISOString().slice(0, 10);
}
