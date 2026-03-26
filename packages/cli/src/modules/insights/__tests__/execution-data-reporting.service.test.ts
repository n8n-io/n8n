import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import type { InsightsService } from '../insights.service';
import { ExecutionDataReportingService } from '../instance-monitoring/execution-data-reporting.service';
import { InstanceMonitoringConfig } from '../instance-monitoring/instance-monitoring.config';

jest.mock('@/constants', () => ({ N8N_VERSION: '1.2.3' }));

interface ReportPayload {
	interval: { startTime: string; endTime: string };
	totalProdExecutions: number;
	n8nVersion: string;
	instanceId: string;
	instanceIdentifier: string;
}

const SUMMARY_MOCK = {
	total: { value: 42, unit: 'count' as const, deviation: null },
	failed: { value: 3, unit: 'count' as const, deviation: null },
	failureRate: { value: 0.07, unit: 'ratio' as const, deviation: null },
	averageRunTime: { value: 1200, unit: 'millisecond' as const, deviation: null },
	timeSaved: { value: 0, unit: 'minute' as const, deviation: null },
};

function makeConfig(overrides: Partial<InstanceMonitoringConfig> = {}): InstanceMonitoringConfig {
	const config = new InstanceMonitoringConfig();
	config.executionDataReportingIntervalMinutes = 5;
	config.executionDataReportingWebhookUrl = 'https://example.com/webhook';
	config.executionDataReportingIdentifier = 'my-instance';
	return Object.assign(config, overrides);
}

function makeService(
	config: InstanceMonitoringConfig,
	insightsService: jest.Mocked<InsightsService>,
): ExecutionDataReportingService {
	const instanceSettings = mock<InstanceSettings>({ instanceId: 'abc123' });
	return new ExecutionDataReportingService(config, insightsService, instanceSettings, mockLogger());
}

describe('ExecutionDataReportingService', () => {
	describe('startReporting', () => {
		afterEach(() => {
			jest.useRealTimers();
		});

		test('does not start timer when webhookUrl is not configured', () => {
			jest.useFakeTimers();
			const insightsService = mock<InsightsService>();
			const service = makeService(
				makeConfig({ executionDataReportingWebhookUrl: '' }),
				insightsService,
			);
			const sendReportSpy = jest.spyOn(service, 'sendReport');

			service.startReporting();
			jest.advanceTimersByTime(Time.minutes.toMilliseconds * 10);

			expect(sendReportSpy).not.toHaveBeenCalled();
		});

		test('fires sendReport after interval elapses', () => {
			jest.useFakeTimers();
			const insightsService = mock<InsightsService>();
			const config = makeConfig();
			const service = makeService(config, insightsService);
			const sendReportSpy = jest.spyOn(service, 'sendReport').mockResolvedValue(undefined);

			try {
				service.startReporting();
				jest.advanceTimersByTime(
					config.executionDataReportingIntervalMinutes * Time.minutes.toMilliseconds,
				);
				expect(sendReportSpy).toHaveBeenCalledTimes(1);
			} finally {
				service.stopReporting();
			}
		});

		test('fires sendReport on each subsequent interval', () => {
			jest.useFakeTimers();
			const insightsService = mock<InsightsService>();
			const config = makeConfig();
			const service = makeService(config, insightsService);
			const sendReportSpy = jest.spyOn(service, 'sendReport').mockResolvedValue(undefined);

			try {
				service.startReporting();
				jest.advanceTimersByTime(
					config.executionDataReportingIntervalMinutes * Time.minutes.toMilliseconds * 3,
				);
				expect(sendReportSpy).toHaveBeenCalledTimes(3);
			} finally {
				service.stopReporting();
			}
		});
	});

	describe('sendReport', () => {
		let config: InstanceMonitoringConfig;
		let insightsService: jest.Mocked<InsightsService>;
		let service: ExecutionDataReportingService;
		let mockFetch: jest.SpyInstance<
			Promise<Response>,
			[input: RequestInfo | URL, init?: RequestInit]
		>;

		beforeEach(() => {
			config = makeConfig();
			insightsService = mock<InsightsService>();
			insightsService.getInsightsSummary.mockResolvedValue(SUMMARY_MOCK);
			service = makeService(config, insightsService);
			mockFetch = jest
				.spyOn(global, 'fetch')
				.mockResolvedValue(new Response(null, { status: 200 }));
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		test('posts correct payload to webhookUrl', async () => {
			await service.sendReport();

			const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
			const headers = options.headers as Record<string, string>;
			const body = jsonParse<ReportPayload>(options.body as string);

			expect(url).toBe('https://example.com/webhook');
			expect(options.method).toBe('POST');
			expect(headers['Content-Type']).toBe('application/json');
			expect(body.totalProdExecutions).toBe(42);
			expect(body.n8nVersion).toBe('1.2.3');
			expect(body.instanceId).toBe('abc123');
			expect(body.instanceIdentifier).toBe('my-instance');
			expect(body.interval.startTime).toBeDefined();
			expect(body.interval.endTime).toBeDefined();
			expect(new Date(body.interval.endTime).getTime()).toBeGreaterThan(
				new Date(body.interval.startTime).getTime(),
			);
		});

		test('interval startTime is endTime minus configured interval', async () => {
			await service.sendReport();

			const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
			const body = jsonParse<ReportPayload>(options.body as string);
			const diffMs =
				new Date(body.interval.endTime).getTime() - new Date(body.interval.startTime).getTime();
			const expectedDiffMs =
				config.executionDataReportingIntervalMinutes * Time.minutes.toMilliseconds;

			expect(diffMs).toBeCloseTo(expectedDiffMs, -2);
		});

		test('calls getInsightsSummary with interval start and end dates', async () => {
			await service.sendReport();

			expect(jest.mocked(insightsService.getInsightsSummary)).toHaveBeenCalledWith({
				startDate: expect.any(Date),
				endDate: expect.any(Date),
			});
		});

		test('catches fetch errors and does not throw', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(service.sendReport()).resolves.toBeUndefined();
		});
	});
});
