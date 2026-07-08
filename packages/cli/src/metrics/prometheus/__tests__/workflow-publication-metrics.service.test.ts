import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import type { WorkflowsConfig } from '@n8n/config';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { PrometheusWorkflowPublicationMetricsService } from '../workflow-publication-metrics.service';

import type { EventService } from '@/events/event.service';
import type { CacheService } from '@/services/cache/cache.service';

vi.mock('prom-client');

describe('PrometheusWorkflowPublicationMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeWorkflowPublicationMetrics: true,
		workflowPublicationMetricInterval: 60,
	});
	const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService: true });
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const eventService = mock<EventService>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const cacheService = mock<CacheService>();

	let service: PrometheusWorkflowPublicationMetricsService;
	let mockCounterInc: Mock;
	let mockHistogramObserve: Mock;

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeWorkflowPublicationMetrics: true,
			workflowPublicationMetricInterval: 60,
		});
		Object.assign(workflowsConfig, { useWorkflowPublicationService: true });
		Object.assign(instanceSettings, { instanceType: 'main' });

		service = new PrometheusWorkflowPublicationMetricsService(
			config,
			workflowsConfig,
			instanceSettings,
			eventService,
			outboxRepository,
			cacheService,
		);

		mockCounterInc = vi.fn();
		mockHistogramObserve = vi.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const gaugeOptsFor = (name: string) =>
		(promClient.Gauge as unknown as Mock).mock.calls.find((call) => call[0].name === name)?.[0];

	const eventHandler = (event: string) =>
		eventService.on.mock.calls.find((call) => call[0] === event)?.[1] as
			| ((payload: never) => void)
			| undefined;

	describe('enabled', () => {
		it('is true when opted in, publication service is enabled, and instance is main', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeWorkflowPublicationMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false when the publication service is disabled', () => {
			Object.assign(workflowsConfig, { useWorkflowPublicationService: false });
			expect(service.enabled).toBe(false);
		});

		it('is false on a non-main instance', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('registers the outbox gauges, outcome/trigger/cleanup counters and histograms', () => {
			service.init();

			const gaugeNames = (promClient.Gauge as unknown as Mock).mock.calls.map((c) => c[0].name);
			expect(gaugeNames).toEqual(
				expect.arrayContaining([
					'n8n_workflow_publication_outbox_records',
					'n8n_workflow_publication_outbox_oldest_active_record_age_seconds',
				]),
			);

			const counterNames = (promClient.Counter as unknown as Mock).mock.calls.map((c) => c[0].name);
			expect(counterNames).toEqual(
				expect.arrayContaining([
					'n8n_workflow_publication_outbox_record_outcomes_total',
					'n8n_workflow_publication_trigger_node_operations_total',
					'n8n_workflow_publication_outbox_cleanup_deleted_records_total',
				]),
			);

			const histogramNames = (promClient.Histogram as unknown as Mock).mock.calls.map(
				(c) => c[0].name,
			);
			expect(histogramNames).toEqual(
				expect.arrayContaining([
					'n8n_workflow_publication_outbox_record_duration_seconds',
					'n8n_workflow_publication_trigger_operation_duration_seconds',
					'n8n_workflow_publication_outbox_cleanup_duration_seconds',
				]),
			);
		});

		it('applies a custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			const gaugeNames = (promClient.Gauge as unknown as Mock).mock.calls.map((c) => c[0].name);
			expect(gaugeNames).toContain('myapp_workflow_publication_outbox_records');
		});
	});

	describe('event handling', () => {
		beforeEach(() => service.init());

		it('records a processed record outcome on both the counter and histogram', () => {
			eventHandler('workflow-publication-outbox-record-processed')!({
				result: 'published',
				reason: 'none',
				durationMs: 2000,
			} as never);

			expect(mockCounterInc).toHaveBeenCalledWith({ result: 'published', reason: 'none' }, 1);
			expect(mockHistogramObserve).toHaveBeenCalledWith({ result: 'published', reason: 'none' }, 2);
		});

		it('records trigger operation duration', () => {
			eventHandler('workflow-publication-trigger-operation')!({
				operation: 'activate',
				result: 'success',
				durationMs: 500,
			} as never);

			expect(mockHistogramObserve).toHaveBeenCalledWith(
				{ operation: 'activate', result: 'success' },
				0.5,
			);
		});

		it('increments the trigger node operations counter by the node count', () => {
			eventHandler('workflow-publication-trigger-node-operations')!({
				operation: 'activate',
				result: 'failure',
				count: 3,
			} as never);

			expect(mockCounterInc).toHaveBeenCalledWith({ operation: 'activate', result: 'failure' }, 3);
		});

		it('records cleanup deleted count and duration', () => {
			eventHandler('workflow-publication-outbox-cleanup')!({
				result: 'success',
				deletedCount: 9,
				durationMs: 1000,
			} as never);

			expect(mockCounterInc).toHaveBeenCalledWith(9);
			expect(mockHistogramObserve).toHaveBeenCalledWith({ result: 'success' }, 1);
		});
	});

	describe('gauge collection', () => {
		it('zero-fills statuses with no records on the outbox records gauge', async () => {
			outboxRepository.getRecordStatsByStatus.mockResolvedValue(
				new Map([
					['pending', { count: 2, oldestCreatedAt: new Date() }],
					['failed', { count: 1, oldestCreatedAt: new Date() }],
				]),
			);
			service.init();

			const set = vi.fn();
			await gaugeOptsFor('n8n_workflow_publication_outbox_records').collect.call({ set });

			expect(set).toHaveBeenCalledWith({ status: 'pending' }, 2);
			expect(set).toHaveBeenCalledWith({ status: 'failed' }, 1);
			expect(set).toHaveBeenCalledWith({ status: 'in_progress' }, 0);
			expect(set).toHaveBeenCalledWith({ status: 'completed' }, 0);
			expect(set).toHaveBeenCalledWith({ status: 'partial_success' }, 0);
		});

		it('reports the oldest active record age in seconds and 0 for missing statuses', async () => {
			const tenSecondsAgo = new Date(Date.now() - 10_000);
			outboxRepository.getRecordStatsByStatus.mockResolvedValue(
				new Map([['pending', { count: 1, oldestCreatedAt: tenSecondsAgo }]]),
			);
			service.init();

			const set = vi.fn();
			await gaugeOptsFor(
				'n8n_workflow_publication_outbox_oldest_active_record_age_seconds',
			).collect.call({ set });

			const pendingCall = set.mock.calls.find((c) => c[0].status === 'pending');
			expect(pendingCall?.[1]).toBeGreaterThanOrEqual(10);
			expect(set).toHaveBeenCalledWith({ status: 'in_progress' }, 0);
		});

		it('caches the record stats query with the configured interval as TTL', async () => {
			const createdAt = new Date();
			outboxRepository.getRecordStatsByStatus.mockResolvedValue(
				new Map([['pending', { count: 2, oldestCreatedAt: createdAt }]]),
			);
			service.init();

			await gaugeOptsFor('n8n_workflow_publication_outbox_records').collect.call({ set: vi.fn() });

			// 60s interval → 60_000ms TTL; Dates are serialized to epoch ms.
			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:workflow-publication:outbox-record-stats:v2',
				{ pending: { count: 2, oldestMs: createdAt.getTime() } },
				60_000,
			);
		});

		it('serves the gauges from cache without querying the database', async () => {
			const tenSecondsAgo = Date.now() - 10_000;
			cacheService.get.mockResolvedValue({
				pending: { count: 5, oldestMs: tenSecondsAgo },
				completed: { count: 7, oldestMs: tenSecondsAgo },
			});
			service.init();

			const set = vi.fn();
			await gaugeOptsFor('n8n_workflow_publication_outbox_records').collect.call({ set });

			expect(outboxRepository.getRecordStatsByStatus).not.toHaveBeenCalled();
			expect(set).toHaveBeenCalledWith({ status: 'pending' }, 5);
			expect(set).toHaveBeenCalledWith({ status: 'completed' }, 7);
		});
	});
});
