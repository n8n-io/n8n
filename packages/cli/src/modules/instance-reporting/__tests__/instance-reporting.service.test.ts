import { mockLogger } from '@n8n/backend-test-utils';
import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { LicenseMetricsRepository, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { InsightsService } from '@/modules/insights/insights.service';
import type { OwnershipService } from '@/services/ownership.service';

import type { CentralInstanceMonitoringReport } from '../database/entities/central-instance-monitoring-report';
import type { CentralInstanceMonitoringReportRepository } from '../database/repositories/central-instance-monitoring-report.repository';
import { InstanceReportingConfig } from '../instance-reporting.config';
import { InstanceReportingService } from '../instance-reporting.service';

vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	N8N_VERSION: '1.2.3',
}));

interface ReportPayload {
	instanceId: string;
	batchId: string;
	label?: string;
	n8nVersion: string;
	dataPoints: Array<{ kind: string; name: string; value: number; date?: string }>;
}

const REPORT_DATE = '2026-03-25';
const BATCH_ID = 'batch-id-1';

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

function makeConfig(overrides: Partial<InstanceReportingConfig> = {}): InstanceReportingConfig {
	const config = new InstanceReportingConfig();
	config.instanceReportingBaseUrl = 'https://example.com';
	config.instanceReportingIdentifier = 'my-instance';
	return Object.assign(config, overrides);
}

function makeReport(
	overrides: Partial<CentralInstanceMonitoringReport> = {},
): CentralInstanceMonitoringReport {
	return {
		id: BATCH_ID,
		dataPoints: [],
		deliveredAt: null,
		attempts: 0,
		lastError: null,
		...overrides,
	} as CentralInstanceMonitoringReport;
}

interface Harness {
	service: InstanceReportingService;
	reportRepository: Mocked<CentralInstanceMonitoringReportRepository>;
	insightsService: Mocked<InsightsService>;
	http: HttpRequestClient;
	clientOptions: HttpRequestClientOptions | undefined;
}

function makeHarness(config: InstanceReportingConfig = makeConfig()): Harness {
	const reportRepository = mock<CentralInstanceMonitoringReportRepository>();
	reportRepository.findTodaysPending.mockResolvedValue(null);
	reportRepository.createPending.mockImplementation(async (dataPoints) =>
		makeReport({ dataPoints }),
	);

	const insightsService = mock<InsightsService>();
	insightsService.getInsightsSummary.mockResolvedValue(SUMMARY_MOCK);

	const ownershipService = mock<OwnershipService>();
	ownershipService.getInstanceOwner.mockResolvedValue(OWNER_MOCK);

	const licenseMetricsRepository = mock<LicenseMetricsRepository>();
	licenseMetricsRepository.getLicenseRenewalMetrics.mockResolvedValue(LICENSE_METRICS_MOCK);

	const http = mock<HttpRequestClient>();
	vi.mocked(http.request).mockResolvedValue({ statusCode: 201, body: '', headers: {} });

	let clientOptions: HttpRequestClientOptions | undefined;
	const outboundHttp = mock<OutboundHttp>({
		requests: vi.fn((options?: HttpRequestClientOptions) => {
			clientOptions = options;
			return http;
		}),
	});

	const service = new InstanceReportingService(
		config,
		reportRepository,
		insightsService,
		mock<InstanceSettings>({ instanceId: 'abc123' }),
		ownershipService,
		licenseMetricsRepository,
		mockLogger(),
		outboundHttp,
	);

	return { service, reportRepository, insightsService, http, clientOptions };
}

describe('InstanceReportingService', () => {
	describe('sendReport', () => {
		beforeEach(() => {
			// Pinned so the previous UTC day the service derives is deterministic.
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-03-26T07:42:00.000Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		function sentOptions(http: HttpRequestClient, callIndex = 0): IHttpRequestOptions {
			return vi.mocked(http.request).mock.calls[callIndex][0];
		}

		function body(http: HttpRequestClient, callIndex = 0): ReportPayload {
			return sentOptions(http, callIndex).body as unknown as ReportPayload;
		}

		/** The default headers the client was built with, as the transport receives them. */
		function clientHeaders(
			clientOptions: HttpRequestClientOptions | undefined,
		): Record<string, string | undefined> {
			const { headers } = clientOptions ?? {};

			return (typeof headers === 'function' ? headers() : headers) ?? {};
		}

		test('posts the report to the receiver endpoint under the configured base URL', async () => {
			const { service, http, clientOptions } = makeHarness();

			await service.sendReport();

			expect(clientOptions?.baseURL).toBe('https://example.com');
			expect(sentOptions(http)).toMatchObject({
				url: '/api/v1/instance-reports',
				method: 'POST',
				json: true,
			});
		});

		test('does not double up the slash when the base URL has a trailing one', () => {
			const { clientOptions } = makeHarness(
				makeConfig({ instanceReportingBaseUrl: 'https://example.com/' }),
			);

			expect(clientOptions?.baseURL).toBe('https://example.com');
		});

		test('opts out of SSRF protection, as the receiver is operator-configured', () => {
			const { clientOptions } = makeHarness();

			expect(clientOptions?.useDefaultSsrfPolicy).toBe('unsafe');
		});

		test('bounds the request, so a hung receiver does not hold the delivery open', () => {
			const { clientOptions } = makeHarness();

			expect(clientOptions?.timeout).toBe(30_000);
		});

		test('does not follow redirects, so the auth token reaches only the configured host', async () => {
			const { service, http } = makeHarness();

			await service.sendReport();

			expect(sentOptions(http).disableFollowRedirect).toBe(true);
		});

		test('sends one cumulative and one daily data point, with the row id as batchId', async () => {
			const { service, http } = makeHarness();

			await service.sendReport();

			expect(body(http)).toMatchObject({
				instanceId: 'abc123',
				batchId: BATCH_ID,
				label: 'my-instance',
				n8nVersion: '1.2.3',
				dataPoints: [
					{ kind: 'cumulative', name: 'billableExecutions', value: 815 },
					{ kind: 'daily', name: 'billableExecutions', value: 42, date: REPORT_DATE },
				],
			});
		});

		test('omits label when no identifier is configured', async () => {
			const { service, http } = makeHarness(makeConfig({ instanceReportingIdentifier: '' }));

			await service.sendReport();

			expect(body(http)).not.toHaveProperty('label');
		});

		test('sends the auth token as a bearer token when configured', () => {
			const { clientOptions } = makeHarness(
				makeConfig({ instanceReportingAuthToken: 'secret-token' }),
			);

			expect(clientHeaders(clientOptions).authorization).toBe('Bearer secret-token');
		});

		test('omits the Authorization header when no auth token is configured', () => {
			const { clientOptions } = makeHarness();

			// An `undefined` default header is dropped before the request goes out.
			expect(clientHeaders(clientOptions).authorization).toBeUndefined();
		});

		test('queries the instance owner insights for the reported UTC day', async () => {
			const { service, insightsService } = makeHarness();

			await service.sendReport();

			expect(insightsService.getInsightsSummary).toHaveBeenCalledWith({
				user: OWNER_MOCK,
				startDate: new Date('2026-03-25T00:00:00.000Z'),
				endDate: new Date('2026-03-26T00:00:00.000Z'),
				timeZone: 'UTC',
			});
		});

		test('records the measurement before sending, then marks the report delivered', async () => {
			const { service, reportRepository } = makeHarness();

			await service.sendReport();

			expect(reportRepository.createPending).toHaveBeenCalledWith([
				{ kind: 'cumulative', name: 'billableExecutions', value: 815 },
				{ kind: 'daily', name: 'billableExecutions', value: 42, date: REPORT_DATE },
			]);
			expect(reportRepository.markDelivered).toHaveBeenCalledWith(BATCH_ID, expect.any(Date));
		});

		test('records the failure and rethrows when the request fails', async () => {
			const { service, reportRepository, http } = makeHarness();
			vi.mocked(http.request).mockRejectedValue(new Error('Network error'));

			await expect(service.sendReport()).rejects.toThrow('Network error');

			expect(reportRepository.recordFailure).toHaveBeenCalledWith(BATCH_ID, 'Network error');
			expect(reportRepository.markDelivered).not.toHaveBeenCalled();
		});

		test('treats a 2xx other than 201 as a failure', async () => {
			const { service, reportRepository, http } = makeHarness();
			vi.mocked(http.request).mockResolvedValue({ statusCode: 200, body: '', headers: {} });

			await expect(service.sendReport()).rejects.toThrow('200');

			expect(reportRepository.recordFailure).toHaveBeenCalledWith(
				BATCH_ID,
				expect.stringContaining('200'),
			);
			expect(reportRepository.markDelivered).not.toHaveBeenCalled();
		});

		test('treats an error response as a failure', async () => {
			const { service, reportRepository, http } = makeHarness();
			vi.mocked(http.request).mockResolvedValue({ statusCode: 500, body: '', headers: {} });

			await expect(service.sendReport()).rejects.toThrow('500');

			expect(reportRepository.recordFailure).toHaveBeenCalledWith(
				BATCH_ID,
				expect.stringContaining('500'),
			);
			expect(reportRepository.markDelivered).not.toHaveBeenCalled();
		});

		test('treats a redirect as a failure, as redirects are not followed', async () => {
			const { service, reportRepository, http } = makeHarness();
			vi.mocked(http.request).mockResolvedValue({ statusCode: 301, body: '', headers: {} });

			await expect(service.sendReport()).rejects.toThrow('301');

			expect(reportRepository.markDelivered).not.toHaveBeenCalled();
		});

		test('reuses the same batchId when an undelivered report is retried', async () => {
			const { service, reportRepository, http } = makeHarness();
			vi.mocked(http.request).mockRejectedValueOnce(new Error('Network error'));

			await expect(service.sendReport()).rejects.toThrow();
			// The retry picks up the still-undelivered row the first attempt created.
			reportRepository.findTodaysPending.mockResolvedValue(makeReport({ attempts: 1 }));
			await service.sendReport();

			expect(body(http, 1).batchId).toBe(BATCH_ID);
		});

		test('resends a pending report as measured, without taking fresh numbers', async () => {
			const { service, reportRepository, insightsService, http } = makeHarness();
			// Measured at this instance's report time on an earlier attempt today.
			const measured = [
				{ kind: 'cumulative', name: 'billableExecutions', value: 800 },
				{ kind: 'daily', name: 'billableExecutions', value: 40, date: REPORT_DATE },
			] as CentralInstanceMonitoringReport['dataPoints'];
			reportRepository.findTodaysPending.mockResolvedValue(makeReport({ dataPoints: measured }));

			await service.sendReport();

			// Re-measuring would sample the cumulative total at a different point in
			// the day and stretch its interval past 24 hours.
			expect(body(http).dataPoints).toEqual(measured);
			expect(insightsService.getInsightsSummary).not.toHaveBeenCalled();
			expect(reportRepository.createPending).not.toHaveBeenCalled();
		});
	});
});
