import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { strict } from 'node:assert';

import { N8N_VERSION } from '@/constants';

import { UsageMonitoringConfig } from './usage-monitoring.config';

@Service()
export class UsageMonitoringService {
	private reportingTimer: NodeJS.Timeout | undefined;

	constructor(
		private readonly config: UsageMonitoringConfig,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('usage-monitoring');
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.instanceSettings.isLeader) this.startReporting();
	}

	get isEnabled() {
		return !!this.config.webhookUrl && this.instanceSettings.isLeader;
	}

	@OnLeaderTakeover()
	startReporting(): void {
		if (!this.isEnabled) return;

		this.stopReporting();
		this.reportingTimer = setInterval(
			async () => await this.sendReport(),
			this.config.reportingIntervalMinutes * Time.minutes.toMilliseconds,
		);
		this.logger.debug('Started usage reporting timer');
	}

	@OnLeaderStepdown()
	stopReporting(): void {
		if (this.reportingTimer === undefined) return;

		clearInterval(this.reportingTimer);
		this.reportingTimer = undefined;
		this.logger.debug('Stopped usage reporting timer');
	}

	async sendReport(): Promise<void> {
		// Reuses the license server's billable-executions query so the two reporting
		// paths can never drift out of sync; the other fields it returns are unused here.
		const { productionRootExecutions: rootExecutionsTotal } =
			await this.licenseMetricsRepository.getLicenseRenewalMetrics();

		const payload = {
			instanceId: this.instanceSettings.instanceId,
			n8nVersion: N8N_VERSION,
			data: { rootExecutionsTotal },
		};

		try {
			// SSRF protection is disabled because the destination is an operator-configured
			// address, often network-internal by design (e.g. a Kubernetes ClusterIP service),
			// not attacker-influenced input.
			await this.outboundHttp.requests({ ssrf: 'disabled' }).request({
				method: 'POST',
				url: this.config.webhookUrl,
				body: payload,
				json: true,
			});
		} catch (error) {
			this.logger.error('Failed to send usage report', { error });
		}
	}
}
