import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { N8N_VERSION } from '@/constants';
import { OwnershipService } from '@/services/ownership.service';

import { InsightsService } from '../insights.service';
import { InstanceMonitoringConfig } from './instance-monitoring.config';

@Service()
export class InstanceReportingService {
	private reportingTimer: NodeJS.Timeout | undefined;

	constructor(
		private readonly config: InstanceMonitoringConfig,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly ownershipService: OwnershipService,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	startReporting(): void {
		if (!this.config.instanceReportingWebhookUrl) {
			this.logger.warn(
				'Instance reporting is enabled but N8N_INSTANCE_REPORTING_WEBHOOK_URL is unset, so no reports will be sent',
			);
			return;
		}

		this.stopReporting();
		this.reportingTimer = setInterval(
			async () => await this.sendReport(),
			this.config.instanceReportingIntervalMinutes * Time.minutes.toMilliseconds,
		);
		this.logger.debug('Started instance reporting timer');
	}

	@OnShutdown()
	stopReporting(): void {
		if (this.reportingTimer !== undefined) {
			clearInterval(this.reportingTimer);
			this.reportingTimer = undefined;
			this.logger.debug('Stopped instance reporting timer');
		}
	}

	/**
	 * Reports yesterday's billable executions as a daily data point, plus the
	 * instance's lifetime total as a cumulative one. The receiver only accepts
	 * daily values scoped to one UTC calendar day, and only a completed day has
	 * a final number — so "today" is never reported, no matter how often the
	 * timer fires. Re-sending the same day is expected: the receiver
	 * deduplicates on `batchId`. Cumulative points carry no batchId or date;
	 * the receiver keeps the most recently received value.
	 */
	async sendReport(): Promise<void> {
		const startDate = previousUtcMidnight();
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

		const payload = {
			instanceId: this.instanceSettings.instanceId,
			...(this.config.instanceReportingIdentifier
				? { label: this.config.instanceReportingIdentifier }
				: {}),
			n8nVersion: N8N_VERSION,
			dataPoints: [
				{
					kind: 'daily',
					name: 'billableExecutionPerDay',
					value: summary.total.value,
					batchId: randomUUID(),
					date: toUtcDateString(startDate),
				},
				{
					kind: 'cumulative',
					name: 'billableExecutionTotal',
					value: productionRootExecutions,
				},
			],
		};

		try {
			await fetch(this.config.instanceReportingWebhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.instanceReportingAuthToken
						? { Authorization: `Bearer ${this.config.instanceReportingAuthToken}` }
						: {}),
				},
				body: JSON.stringify(payload),
			});
		} catch (error) {
			this.logger.error('Failed to send instance report', { error });
		}
	}
}

/** UTC midnight that starts the day before today. */
function previousUtcMidnight(): Date {
	const now = new Date();

	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0),
	);
}

function toUtcDateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}
