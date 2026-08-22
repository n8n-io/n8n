import type { LicenseMetricsRepository, User } from '@n8n/db';
import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import type { Mocked, MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';

import type { InsightsService } from '../insights.service';
import { InstanceReportingService } from '../instance-monitoring/instance-reporting.service';
import { InstanceMonitoringConfig } from '../instance-monitoring/instance-monitoring.config';

vi.mock('@/constants', () => ({ N8N_VERSION: '1.2.3' }));

interface ReportPayload {
	instanceId: string;
	label?: string;
	n8nVersion: string;
	dataPoints: Array<{
		kind: string;
		name: string;
		value: number;
		batchId?: string;
		date?: string;
	}>;
}

const TODAY_UTC = '2026-03-26';
const YESTERDAY_UTC = '2026-03-25';

const OWNER_MOCK = mock<User>({ id: 'owner-id' });

const LICENSE_METRICS_MOCK = {
	enabledUsers: 1,
	totalUsers: 1,
	activeWorkflows: 2,
	totalWorkflows: 3,
	totalCredentials: 4,
	productionExecutions: 900,
	productionRootExecutions: 815,
	manualExecutions: 12,
	evaluations: 0,
};

const SUMMARY_MOCK = {
	total: { value: 42, unit: 'count' as const, deviation: null },
	failed: { value: 3, unit: 'count' as const, deviation: null },
	failureRate: { value: 0.07, unit: 'ratio' as const, deviation: null },
	averageRunTime: { value: 1200, unit: 'millisecond' as const, deviation: null },
	timeSaved: { value: 0, unit: 'minute' as const, deviation: null },
};

function makeConfig(overrides: Partial<InstanceMonitoringConfig> = {}): InstanceMonitoringConfig {
	const config = new InstanceMonitoringConfig();
	config.instanceReportingIntervalMinutes = 5;
	config.instanceReportingWebhookUrl = 'https://example.com/webhook';
	config.instanceReportingIdentifier = 'my-instance';
	return Object.assign(config, overrides);
}

function makeService(
	config: InstanceMonitoringConfig,
	insightsService: Mocked<InsightsService>,
): InstanceReportingService {
	const instanceSettings = mock<InstanceSettings>({ instanceId: 'abc123' });
	const ownershipService = mock<OwnershipService>();
	ownershipService.getInstanceOwner.mockResolvedValue(OWNER_MOCK);
	const licenseMetricsRepository = mock<LicenseMetricsRepository>();
	licenseMetricsRepository.getLicenseRenewalMetrics.mockResolvedValue(LICENSE_METRICS_MOCK);

	return new InstanceReportingService(
		config,
		insightsService,
		instanceSettings,
		ownershipService,
		licenseMetricsRepository,
		mockLogger(),
	);
}

describe('InstanceReportingService', () => {
	describe('startReporting', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		test('does not start timer when webhookUrl is not configured', () => {
			vi.useFakeTimers();
			const insightsService = mock<InsightsService>();
			const service = makeService(makeConfig({ instanceReportingWebhookUrl: '' }), insightsService);
			const sendReportSpy = vi.spyOn(service, 'sendReport');

			service.startReporting();
			vi.advanceTimersByTime(Time.minutes.toMilliseconds * 10);

			expect(sendReportSpy).not.toHaveBeenCalled();
		});

		test('fires sendReport after interval elapses', () => {
			vi.useFakeTimers();
			const insightsService = mock<InsightsService>();
			const config = makeConfig();
			const service = makeService(config, insightsService);
			const sendReportSpy = vi.spyOn(service, 'sendReport').mockResolvedValue(undefined);

			try {
				service.startReporting();
				vi.advanceTimersByTime(
					config.instanceReportingIntervalMinutes * Time.minutes.toMilliseconds,
				);
				expect(sendReportSpy).toHaveBeenCalledTimes(1);
			} finally {
				service.stopReporting();
			}
		});

		test('fires sendReport on each subsequent interval', () => {
			vi.useFakeTimers();
			const insightsService = mock<InsightsService>();
			const config = makeConfig();
			const service = makeService(config, insightsService);
			const sendReportSpy = vi.spyOn(service, 'sendReport').mockResolvedValue(undefined);

			try {
				service.startReporting();
				vi.advanceTimersByTime(
					config.instanceReportingIntervalMinutes * Time.minutes.toMilliseconds * 3,
				);
				expect(sendReportSpy).toHaveBeenCalledTimes(3);
			} finally {
				service.stopReporting();
			}
		});
	});

	describe('sendReport', () => {
		let config: InstanceMonitoringConfig;
		let insightsService: Mocked<InsightsService>;
		let service: InstanceReportingService;
		let mockFetch: MockInstance<typeof fetch>;

		beforeEach(() => {
			// Pinned so the "previous UTC day" the service derives is deterministic.
			vi.useFakeTimers();
			vi.setSystemTime(new Date(`${TODAY_UTC}T10:15:00.000Z`));

			config = makeConfig();
			insightsService = mock<InsightsService>();
			insightsService.getInsightsSummary.mockResolvedValue(SUMMARY_MOCK);
			service = makeService(config, insightsService);
			mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		test('posts correct payload to webhookUrl', async () => {
			await service.sendReport();

			const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
			const headers = options.headers as Record<string, string>;
			const body = jsonParse<ReportPayload>(options.body as string);

			expect(url).toBe('https://example.com/webhook');
			expect(options.method).toBe('POST');
			expect(headers['Content-Type']).toBe('application/json');
			expect(body.n8nVersion).toBe('1.2.3');
			expect(body.instanceId).toBe('abc123');
			expect(body.label).toBe('my-instance');
			expect(body.dataPoints).toEqual([
				{
					kind: 'daily',
					name: 'billableExecutionPerDay',
					value: 42,
					batchId: expect.any(String),
					date: YESTERDAY_UTC,
				},
				{
					kind: 'cumulative',
					name: 'billableExecutionTotal',
					value: 815,
				},
			]);
		});

		test('omits label when no identifier is configured', async () => {
			service = makeService(makeConfig({ instanceReportingIdentifier: '' }), insightsService);

			await service.sendReport();

			const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];

			expect(jsonParse<ReportPayload>(options.body as string)).not.toHaveProperty('label');
		});

		test('sends the auth token as a bearer token when configured', async () => {
			service = makeService(
				makeConfig({ instanceReportingAuthToken: 'secret-token' }),
				insightsService,
			);

			await service.sendReport();

			const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];

			expect((options.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
		});

		test('omits the Authorization header when no auth token is configured', async () => {
			await service.sendReport();

			const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];

			expect(options.headers).not.toHaveProperty('Authorization');
		});

		test('generates a fresh batchId per report', async () => {
			await service.sendReport();
			await service.sendReport();

			const batchIds = mockFetch.mock.calls.map(
				([, options]) =>
					jsonParse<ReportPayload>((options as RequestInit).body as string).dataPoints[0].batchId,
			);

			expect(batchIds[0]).not.toBe(batchIds[1]);
		});

		test('queries the instance owner insights for the previous UTC day', async () => {
			await service.sendReport();

			expect(insightsService.getInsightsSummary).toHaveBeenCalledWith({
				user: OWNER_MOCK,
				startDate: new Date('2026-03-25T00:00:00.000Z'),
				endDate: new Date('2026-03-26T00:00:00.000Z'),
				timeZone: 'UTC',
			});
		});

		test('catches fetch errors and does not throw', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(service.sendReport()).resolves.toBeUndefined();
		});
	});
});
