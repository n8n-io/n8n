import { GlobalConfig } from '@n8n/config';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import config from '@/config';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { EventService } from '@/events/event.service';
import { mockInstance } from '@test/mocking';

import { PrometheusMetricsService } from '../prometheus-metrics.service';

const mockMiddleware = (
	_req: express.Request,
	_res: express.Response,
	next: express.NextFunction,
) => next();

jest.mock('prom-client');
jest.mock('express-prom-bundle', () => jest.fn(() => mockMiddleware));

describe('PrometheusMetricsService', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		endpoints: {
			metrics: {
				prefix: 'n8n_',
				includeDefaultMetrics: false,
				includeApiEndpoints: false,
				includeCacheMetrics: false,
				includeMessageEventBusMetrics: false,
				includeCredentialTypeLabel: false,
				includeNodeTypeLabel: false,
				includeWorkflowIdLabel: false,
				includeApiPathLabel: false,
				includeApiMethodLabel: false,
				includeApiStatusCodeLabel: false,
				includeQueueMetrics: false,
			},
		},
	});

	const app = mock<express.Application>();
	const eventBus = mock<MessageEventBus>();
	const eventService = mock<EventService>();
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const prometheusMetricsService = new PrometheusMetricsService(
		mock(),
		eventBus,
		globalConfig,
		eventService,
		instanceSettings,
	);

	afterEach(() => {
		jest.clearAllMocks();
		prometheusMetricsService.disableAllMetrics();
	});

	describe('constructor', () => {
		it('should enable metrics based on global config', async () => {
			const customGlobalConfig = { ...globalConfig };
			customGlobalConfig.endpoints.metrics.includeCacheMetrics = true;
			const customPrometheusMetricsService = new PrometheusMetricsService(
				mock(),
				mock(),
				customGlobalConfig,
				mock(),
				instanceSettings,
			);

			await customPrometheusMetricsService.init(app);

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
				labelNames: ['cache'],
			});
		});
	});

	describe('init', () => {
		it('should set up `n8n_version_info`', async () => {
			await prometheusMetricsService.init(app);

			expect(promClient.Gauge).toHaveBeenNthCalledWith(1, {
				name: 'n8n_version_info',
				help: 'n8n version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});
		});

		it('should set up default metrics collection with `prom-client`', async () => {
			prometheusMetricsService.enableMetric('default');
			await prometheusMetricsService.init(app);

			expect(promClient.collectDefaultMetrics).toHaveBeenCalled();
		});

		it('should set up `n8n_cache_hits_total`', async () => {
			prometheusMetricsService.enableMetric('cache');
			await prometheusMetricsService.init(app);

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
				labelNames: ['cache'],
			});
		});

		it('should set up `n8n_cache_misses_total`', async () => {
			prometheusMetricsService.enableMetric('cache');
			await prometheusMetricsService.init(app);

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_misses_total',
				help: 'Total number of cache misses.',
				labelNames: ['cache'],
			});
		});

		it('should set up `n8n_cache_updates_total`', async () => {
			prometheusMetricsService.enableMetric('cache');
			await prometheusMetricsService.init(app);

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_updates_total',
				help: 'Total number of cache updates.',
				labelNames: ['cache'],
			});
			// @ts-expect-error private field
			expect(prometheusMetricsService.counters.cacheUpdatesTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up route metrics with `express-prom-bundle`', async () => {
			prometheusMetricsService.enableMetric('routes');
			await prometheusMetricsService.init(app);

			expect(promBundle).toHaveBeenCalledWith({
				autoregister: false,
				includeUp: false,
				includePath: false,
				includeMethod: false,
				includeStatusCode: false,
			});

			expect(app.use).toHaveBeenCalledWith(
				[
					'/rest/',
					'/api/',
					'/webhook/',
					'/webhook-waiting/',
					'/webhook-test/',
					'/form/',
					'/form-waiting/',
					'/form-test/',
				],
				expect.any(Function),
			);
		});

		it('should set up event bus metrics', async () => {
			prometheusMetricsService.enableMetric('logs');
			await prometheusMetricsService.init(app);

			expect(eventBus.on).toHaveBeenCalledWith('metrics.eventBus.event', expect.any(Function));
		});

		it('should set up queue metrics if enabled', async () => {
			config.set('executions.mode', 'queue');
			prometheusMetricsService.enableMetric('queue');

			await prometheusMetricsService.init(app);

			// call 1 is for `n8n_version_info` (always enabled)

			expect(promClient.Gauge).toHaveBeenNthCalledWith(2, {
				name: 'n8n_scaling_mode_queue_jobs_waiting',
				help: 'Current number of enqueued jobs waiting for pickup in scaling mode.',
			});

			expect(promClient.Gauge).toHaveBeenNthCalledWith(3, {
				name: 'n8n_scaling_mode_queue_jobs_active',
				help: 'Current number of jobs being processed across all workers in scaling mode.',
			});

			expect(promClient.Counter).toHaveBeenNthCalledWith(1, {
				name: 'n8n_scaling_mode_queue_jobs_completed',
				help: 'Total number of jobs completed across all workers in scaling mode since instance start.',
			});

			expect(promClient.Counter).toHaveBeenNthCalledWith(2, {
				name: 'n8n_scaling_mode_queue_jobs_failed',
				help: 'Total number of jobs failed across all workers in scaling mode since instance start.',
			});

			expect(eventService.on).toHaveBeenCalledWith('job-counts-updated', expect.any(Function));
		});

		it('should not set up queue metrics if enabled but not on scaling mode', async () => {
			config.set('executions.mode', 'regular');
			prometheusMetricsService.enableMetric('queue');

			await prometheusMetricsService.init(app);

			expect(promClient.Gauge).toHaveBeenCalledTimes(1); // version metric
			expect(promClient.Counter).toHaveBeenCalledTimes(0); // cache metrics
			expect(eventService.on).not.toHaveBeenCalled();
		});

		it('should not set up queue metrics if enabled and on scaling mode but instance is not main', async () => {
			config.set('executions.mode', 'queue');
			prometheusMetricsService.enableMetric('queue');
			// @ts-expect-error private field
			instanceSettings.instanceType = 'worker';

			await prometheusMetricsService.init(app);

			expect(promClient.Gauge).toHaveBeenCalledTimes(1); // version metric
			expect(promClient.Counter).toHaveBeenCalledTimes(0); // cache metrics
			expect(eventService.on).not.toHaveBeenCalled();
		});
	});
});
