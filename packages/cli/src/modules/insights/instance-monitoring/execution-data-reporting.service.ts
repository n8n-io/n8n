import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';

import { InsightsService } from '../insights.service';
import { InstanceMonitoringConfig } from './instance-monitoring.config';

@Service()
export class ExecutionDataReportingService {
	private reportingTimer: NodeJS.Timeout | undefined;

	constructor(
		private readonly config: InstanceMonitoringConfig,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	startReporting(): void {
		if (!this.config.executionDataReportingWebhookUrl) return;

		this.stopReporting();
		this.reportingTimer = setInterval(
			async () => await this.sendReport(),
			this.config.executionDataReportingIntervalMinutes * Time.minutes.toMilliseconds,
		);
		this.logger.debug('Started execution data reporting timer');
	}

	stopReporting(): void {
		if (this.reportingTimer !== undefined) {
			clearInterval(this.reportingTimer);
			this.reportingTimer = undefined;
			this.logger.debug('Stopped execution data reporting timer');
		}
	}

	async sendReport(): Promise<void> {
		const endTime = new Date();
		const startTime = new Date(
			endTime.getTime() -
				this.config.executionDataReportingIntervalMinutes * Time.minutes.toMilliseconds,
		);

		const summary = await this.insightsService.getInsightsSummary({
			startDate: startTime,
			endDate: endTime,
		});

		const payload = {
			interval: {
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
			},
			totalProdExecutions: summary.total.value,
			n8nVersion: N8N_VERSION,
			instanceId: this.instanceSettings.instanceId,
			instanceIdentifier: this.config.executionDataReportingIdentifier,
		};

		try {
			await fetch(this.config.executionDataReportingWebhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
		} catch (error) {
			this.logger.error('Failed to send execution data report', { error });
		}
	}
}
