import { mockLogger } from '@n8n/backend-test-utils';
import type { LicenseMetricsRepository, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import type { Mocked, MockInstance } from 'vitest';
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

	const service = new InstanceReportingService(
		config,
		reportRepository,
		insightsService,
		mock<InstanceSettings>({ instanceId: 'abc123' }),
		ownershipService,
		licenseMetricsRepository,
		mockLogger(),
	);

	return { service, reportRepository, insightsService };
}

describe('InstanceReportingService', () => {
	describe('sendReport', () => {
		let mockFetch: MockInstance<typeof fetch>;

		beforeEach(() => {
			// Pinned so the previous UTC day the service derives is deterministic.
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-03-26T07:42:00.000Z'));
			mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		function body(callIndex = 0): ReportPayload {
			const [, options] = mockFetch.mock.calls[callIndex] as [string, RequestInit];
			return jsonParse<ReportPayload>(options.body as string);
		}

		function headers(callIndex = 0): Record<string, string> {
			const [, options] = mockFetch.mock.calls[callIndex] as [string, RequestInit];
			return options.headers as Record<string, string>;
		}

		test('posts the report to the receiver endpoint under the configured base URL', async () => {
			const { service } = makeHarness();

			await service.sendReport();

			const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

			expect(url).toBe('https://example.com/api/v1/instance-reports');
			expect(options.method).toBe('POST');
			expect(headers()['Content-Type']).toBe('application/json');
		});

		test('does not double up the slash when the base URL has a trailing one', async () => {
			const { service } = makeHarness(
				makeConfig({ instanceReportingBaseUrl: 'https://example.com/' }),
			);

			await service.sendReport();

			expect(mockFetch.mock.calls[0][0]).toBe('https://example.com/api/v1/instance-reports');
		});

		test('sends one cumulative and one daily data point, with the row id as batchId', async () => {
			const { service } = makeHarness();

			await service.sendReport();

			expect(body()).toMatchObject({
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
			const { service } = makeHarness(makeConfig({ instanceReportingIdentifier: '' }));

			await service.sendReport();

			expect(body()).not.toHaveProperty('label');
		});

		test('sends the auth token as a bearer token when configured', async () => {
			const { service } = makeHarness(makeConfig({ instanceReportingAuthToken: 'secret-token' }));

			await service.sendReport();

			expect(headers().Authorization).toBe('Bearer secret-token');
		});

		test('omits the Authorization header when no auth token is configured', async () => {
			const { service } = makeHarness();

			await service.sendReport();

			expect(headers()).not.toHaveProperty('Authorization');
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
			const { service, reportRepository } = makeHarness();
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(service.sendReport()).rejects.toThrow('Network error');

			expect(reportRepository.recordFailure).toHaveBeenCalledWith(BATCH_ID, 'Network error');
			expect(reportRepository.markDelivered).not.toHaveBeenCalled();
		});

		test('treats a non-2xx response as a failure', async () => {
			const { service, reportRepository } = makeHarness();
			mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

			await expect(service.sendReport()).rejects.toThrow('500');

			expect(reportRepository.recordFailure).toHaveBeenCalledWith(
				BATCH_ID,
				expect.stringContaining('500'),
			);
			expect(reportRepository.markDelivered).not.toHaveBeenCalled();
		});

		test('reuses the same batchId when an undelivered report is retried', async () => {
			const { service, reportRepository } = makeHarness();
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(service.sendReport()).rejects.toThrow();
			// The retry picks up the still-undelivered row the first attempt created.
			reportRepository.findTodaysPending.mockResolvedValue(makeReport({ attempts: 1 }));
			await service.sendReport();

			expect(body(1).batchId).toBe(BATCH_ID);
		});

		test('resends a pending report as measured, without taking fresh numbers', async () => {
			const { service, reportRepository, insightsService } = makeHarness();
			// Measured at this instance's report time on an earlier attempt today.
			const measured = [
				{ kind: 'cumulative', name: 'billableExecutions', value: 800 },
				{ kind: 'daily', name: 'billableExecutions', value: 40, date: REPORT_DATE },
			] as CentralInstanceMonitoringReport['dataPoints'];
			reportRepository.findTodaysPending.mockResolvedValue(makeReport({ dataPoints: measured }));

			await service.sendReport();

			// Re-measuring would sample the cumulative total at a different point in
			// the day and stretch its interval past 24 hours.
			expect(body().dataPoints).toEqual(measured);
			expect(insightsService.getInsightsSummary).not.toHaveBeenCalled();
			expect(reportRepository.createPending).not.toHaveBeenCalled();
		});
	});
});
