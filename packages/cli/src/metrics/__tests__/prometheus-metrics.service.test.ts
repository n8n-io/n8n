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

	describe('init', () => {
		it('should set up `n8n_version_info`', async () => {
			const service = new PrometheusMetricsService(mock(), mock());

			await service.init(mock<express.Application>());

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_version_info',
				help: 'n8n version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});
		});

		it('should set up default metrics collection with `prom-client`', async () => {
			const service = new PrometheusMetricsService(mock(), mock());

			await service.init(mock<express.Application>());

			expect(promClient.collectDefaultMetrics).toHaveBeenCalled();
		});

		it('should set up `n8n_cache_hits_total`', async () => {
			config.set('endpoints.metrics.includeCacheMetrics', true);
			const service = new PrometheusMetricsService(mock(), mock());

			await service.init(mock<express.Application>());

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
				labelNames: ['cache'],
			});
			// @ts-expect-error private field
			expect(service.counters.cacheHitsTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up `n8n_cache_misses_total`', async () => {
			config.set('endpoints.metrics.includeCacheMetrics', true);
			const service = new PrometheusMetricsService(mock(), mock());

			await service.init(mock<express.Application>());

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_misses_total',
				help: 'Total number of cache misses.',
				labelNames: ['cache'],
			});
			// @ts-expect-error private field
			expect(service.counters.cacheMissesTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up `n8n_cache_updates_total`', async () => {
			config.set('endpoints.metrics.includeCacheMetrics', true);
			const service = new PrometheusMetricsService(mock(), mock());

			await service.init(mock<express.Application>());

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_updates_total',
				help: 'Total number of cache updates.',
				labelNames: ['cache'],
			});
			// @ts-expect-error private field
			expect(service.counters.cacheUpdatesTotal?.inc).toHaveBeenCalledWith(0);
		});

		it('should set up route metrics with `express-prom-bundle`', async () => {
			config.set('endpoints.metrics.includeApiEndpoints', true);
			config.set('endpoints.metrics.includeApiPathLabel', true);
			config.set('endpoints.metrics.includeApiMethodLabel', true);
			config.set('endpoints.metrics.includeApiStatusCodeLabel', true);
			const service = new PrometheusMetricsService(mock(), mock());

			const app = mock<express.Application>();

			await service.init(app);

			expect(promBundle).toHaveBeenCalledWith({
				autoregister: false,
				includeUp: false,
				includePath: true,
				includeMethod: true,
				includeStatusCode: true,
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
			const eventBus = mock<MessageEventBus>();
			const service = new PrometheusMetricsService(mock(), eventBus);

			await service.init(mock<express.Application>());

			expect(eventBus.on).toHaveBeenCalledWith('metrics.eventBus.event', expect.any(Function));
		});
	});
});
