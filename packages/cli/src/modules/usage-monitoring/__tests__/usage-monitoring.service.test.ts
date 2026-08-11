import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { LicenseMetricsRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { UsageMonitoringConfig } from '../usage-monitoring.config';
import { UsageMonitoringService } from '../usage-monitoring.service';

const LICENSE_METRICS_FIXTURE = {
	enabledUsers: 1,
	totalUsers: 1,
	activeWorkflows: 2,
	totalWorkflows: 3,
	totalCredentials: 4,
	productionExecutions: 100,
	productionRootExecutions: 42,
	manualExecutions: 5,
	evaluations: 0,
};

function makeConfig(overrides: Partial<UsageMonitoringConfig> = {}): UsageMonitoringConfig {
	const config = new UsageMonitoringConfig();
	config.webhookUrl = 'https://example.com/ingest';
	config.reportingIntervalMinutes = 5;
	return Object.assign(config, overrides);
}

describe('UsageMonitoringService', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const licenseMetricsRepository = mock<LicenseMetricsRepository>();
	const request = vi.fn().mockResolvedValue(undefined);
	const outboundHttp = mock<OutboundHttp>({
		requests: vi.fn().mockReturnValue(mock<HttpRequestClient>({ request })),
	});
	const instanceSettings = mock<InstanceSettings>({
		instanceId: 'abc123',
		instanceRole: 'leader',
		isLeader: true,
	});

	function makeService(config = makeConfig()): UsageMonitoringService {
		return new UsageMonitoringService(
			config,
			licenseMetricsRepository,
			instanceSettings,
			outboundHttp,
			logger,
		);
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		licenseMetricsRepository.getLicenseRenewalMetrics.mockResolvedValue(LICENSE_METRICS_FIXTURE);
		request.mockResolvedValue(undefined);
		Object.assign(instanceSettings, { instanceRole: 'leader', isLeader: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('init', () => {
		it('starts reporting when the instance is the leader', () => {
			const service = makeService();
			const startReportingSpy = vi.spyOn(service, 'startReporting');

			service.init();

			expect(startReportingSpy).toHaveBeenCalled();
		});

		it('does not start reporting when the instance is a follower', () => {
			Object.assign(instanceSettings, { isLeader: false });
			const service = makeService();
			const startReportingSpy = vi.spyOn(service, 'startReporting');

			service.init();

			expect(startReportingSpy).not.toHaveBeenCalled();
		});
	});

	describe('startReporting / stopReporting', () => {
		it('does not start the timer when webhookUrl is not configured', () => {
			const service = makeService(makeConfig({ webhookUrl: '' }));
			const sendReportSpy = vi.spyOn(service, 'sendReport');

			service.startReporting();
			vi.advanceTimersByTime(10 * 60 * 1000);

			expect(sendReportSpy).not.toHaveBeenCalled();
		});

		it('fires sendReport on each subsequent interval while leader', () => {
			const config = makeConfig();
			const service = makeService(config);
			const sendReportSpy = vi.spyOn(service, 'sendReport').mockResolvedValue(undefined);

			service.startReporting();
			vi.advanceTimersByTime(config.reportingIntervalMinutes * 60 * 1000 * 3);

			expect(sendReportSpy).toHaveBeenCalledTimes(3);
		});

		it('stops the timer on leader stepdown, and restarts it on takeover', () => {
			const config = makeConfig();
			const service = makeService(config);
			const sendReportSpy = vi.spyOn(service, 'sendReport').mockResolvedValue(undefined);

			service.startReporting();
			service.stopReporting();
			vi.advanceTimersByTime(config.reportingIntervalMinutes * 60 * 1000 * 2);
			expect(sendReportSpy).not.toHaveBeenCalled();

			service.startReporting();
			vi.advanceTimersByTime(config.reportingIntervalMinutes * 60 * 1000);
			expect(sendReportSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('sendReport', () => {
		it('posts the billable-executions total pulled from the license-metrics query', async () => {
			const service = makeService();

			await service.sendReport();

			expect(licenseMetricsRepository.getLicenseRenewalMetrics).toHaveBeenCalled();
			expect(request).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://example.com/ingest',
				body: {
					instanceId: 'abc123',
					n8nVersion: expect.any(String),
					data: { rootExecutionsTotal: 42 },
				},
				json: true,
			});
		});

		it('logs and swallows errors instead of throwing', async () => {
			request.mockRejectedValue(new Error('network error'));
			const service = makeService();

			await expect(service.sendReport()).resolves.toBeUndefined();
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to send usage report',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});
	});
});
