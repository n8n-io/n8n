import config from '@/config';
import promClient from 'prom-client';
import promBundle from 'express-prom-bundle';
import { mock } from 'jest-mock-extended';
import { PrometheusMetricsService } from '../prometheus-metrics.service';
import type express from 'express';
import type { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';

const mockMiddleware = (
	_req: express.Request,
	_res: express.Response,
	next: express.NextFunction,
) => next();

jest.mock('prom-client');
jest.mock('express-prom-bundle', () => jest.fn(() => mockMiddleware));

describe('PrometheusMetricsService', () => {
	beforeEach(() => {
		config.load(config.default);
	});

	describe('configureMetrics', () => {
		it('should set up `n8n_version_info`', async () => {
			const service = new PrometheusMetricsService(mock(), mock(), mock());

			await service.configureMetrics(mock<express.Application>());

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_version_info',
				help: 'n8n version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});
		});

		it('should set up default metrics collection with `prom-client`', async () => {
			const service = new PrometheusMetricsService(mock(), mock(), mock());

			await service.configureMetrics(mock<express.Application>());

			expect(promClient.collectDefaultMetrics).toHaveBeenCalled();
		});

		it('should set up `n8n_cache_hits_total`', async () => {
			config.set('endpoints.metrics.includeCacheMetrics', true);
			const service = new PrometheusMetricsService(mock(), mock(), mock());

			await service.configureMetrics(mock<express.Application>());

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
				labelNames: ['cache'],
			});
			expect(service.counters.cacheHitsTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up `n8n_cache_misses_total`', async () => {
			config.set('endpoints.metrics.includeCacheMetrics', true);
			const service = new PrometheusMetricsService(mock(), mock(), mock());

			await service.configureMetrics(mock<express.Application>());

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_misses_total',
				help: 'Total number of cache misses.',
				labelNames: ['cache'],
			});
			expect(service.counters.cacheMissesTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up `n8n_cache_updates_total`', async () => {
			config.set('endpoints.metrics.includeCacheMetrics', true);
			const service = new PrometheusMetricsService(mock(), mock(), mock());

			await service.configureMetrics(mock<express.Application>());

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_updates_total',
				help: 'Total number of cache updates.',
				labelNames: ['cache'],
			});
			expect(service.counters.cacheUpdatesTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up API metrics with `express-prom-bundle`', async () => {
			config.set('endpoints.metrics.includeApiEndpoints', true);
			config.set('endpoints.metrics.includeApiPathLabel', true);
			config.set('endpoints.metrics.includeApiMethodLabel', true);
			config.set('endpoints.metrics.includeApiStatusCodeLabel', true);
			const service = new PrometheusMetricsService(mock(), mock(), mock());

			const app = mock<express.Application>();

			await service.configureMetrics(app);

			expect(promBundle).toHaveBeenCalledWith({
				autoregister: false,
				includeUp: false,
				includePath: true,
				includeMethod: true,
				includeStatusCode: true,
			});

			expect(app.use).toHaveBeenCalledWith(
				['/rest/', '/webhook/', 'webhook-test/', '/api/'],
				expect.any(Function),
			);
		});

		it('should set up event bus metrics', async () => {
			const eventBus = mock<MessageEventBus>();
			const service = new PrometheusMetricsService(mock(), mock(), eventBus);

			await service.configureMetrics(mock<express.Application>());

			expect(eventBus.on).toHaveBeenCalledWith(
				'metrics.messageEventBus.Event',
				expect.any(Function),
			);
		});
	});
});
