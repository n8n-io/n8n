import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import { mock } from 'vitest-mock-extended';
import promClient from 'prom-client';

import type { PathResolvingService } from '@/services/path-resolving.service';

import { PrometheusRouteMetricsService } from '../route-metrics.service';

vi.mock('prom-client');
vi.mock('express-prom-bundle', () => ({
	default: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

describe('PrometheusRouteMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeApiEndpoints: true,
		includeApiPathLabel: false,
		includeApiMethodLabel: false,
		includeApiStatusCodeLabel: false,
	});
	const pathResolvingService = mock<PathResolvingService>({
		getBasePath: () => '/',
		resolveRestEndpoint: () => '/rest',
		resolveWebhookEndpoint: () => '/webhook',
		resolveWebhookWaitingEndpoint: () => '/webhook-waiting',
		resolveWebhookTestEndpoint: () => '/webhook-test',
		resolveFormEndpoint: () => '/form',
		resolveFormWaitingEndpoint: () => '/form-waiting',
		resolveFormTestEndpoint: () => '/form-test',
	});
	const app = mock<express.Application>();
	let service: PrometheusRouteMetricsService;
	let mockGaugeSet: Mock;

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeApiEndpoints: true,
			includeApiPathLabel: false,
			includeApiMethodLabel: false,
			includeApiStatusCodeLabel: false,
		});
		service = new PrometheusRouteMetricsService(config, pathResolvingService);
		mockGaugeSet = vi.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when includeApiEndpoints is true', () => {
			config.includeApiEndpoints = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeApiEndpoints is false', () => {
			config.includeApiEndpoints = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create last_activity gauge', () => {
			service.init(app);

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_last_activity',
					help: 'last instance activity (backend request) in Unix time (seconds).',
				}),
			);
		});

		it('should apply custom prefix to metric names', () => {
			config.prefix = 'custom_';
			service.init(app);

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_last_activity' }),
			);
		});

		it('should call promBundle with correct options', () => {
			service.init(app);

			expect(promBundle).toHaveBeenCalledWith({
				autoregister: false,
				includeUp: false,
				includePath: false,
				includeMethod: false,
				includeStatusCode: false,
				httpDurationMetricName: 'n8n_http_request_duration_seconds',
			});
		});

		it('should pass custom prefix to httpDurationMetricName', () => {
			config.prefix = 'custom_';
			service.init(app);

			expect(promBundle).toHaveBeenCalledWith(
				expect.objectContaining({
					httpDurationMetricName: 'custom_http_request_duration_seconds',
				}),
			);
		});

		it('should pass includeApiPathLabel to promBundle', () => {
			config.includeApiPathLabel = true;
			service.init(app);

			expect(promBundle).toHaveBeenCalledWith(expect.objectContaining({ includePath: true }));
		});

		it('should pass includeApiMethodLabel to promBundle', () => {
			config.includeApiMethodLabel = true;
			service.init(app);

			expect(promBundle).toHaveBeenCalledWith(expect.objectContaining({ includeMethod: true }));
		});

		it('should pass includeApiStatusCodeLabel to promBundle', () => {
			config.includeApiStatusCodeLabel = true;
			service.init(app);

			expect(promBundle).toHaveBeenCalledWith(expect.objectContaining({ includeStatusCode: true }));
		});

		it('should register app.use with the correct route paths', () => {
			service.init(app);

			expect(app.use).toHaveBeenCalledWith(
				[
					'/api/',
					'/rest/',
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

		it('should update last_activity gauge when the registered middleware is called', async () => {
			service.init(app);

			const middleware = vi.mocked(app.use).mock.calls[0][1];
			const req = mock<express.Request>();
			const res = mock<express.Response>();
			const next = vi.fn();

			await middleware(req, res, next);

			expect(mockGaugeSet).toHaveBeenCalledTimes(2); // once in init, once in middleware
		});
	});
});
