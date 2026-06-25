import { mockInstance } from '@n8n/backend-test-utils';
import { EndpointsConfig, PrometheusMetricsConfig } from '@n8n/config';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

import { PrometheusRouteMetricsService } from '../route-metrics.service';

jest.mock('prom-client');
jest.mock('express-prom-bundle', () =>
	jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
);

describe('PrometheusRouteMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeApiEndpoints: true,
		includeApiPathLabel: false,
		includeApiMethodLabel: false,
		includeApiStatusCodeLabel: false,
	});
	const endpointsConfig = mockInstance(EndpointsConfig, {
		rest: 'rest',
		webhook: 'webhook',
		webhookWaiting: 'webhook-waiting',
		webhookTest: 'webhook-test',
		form: 'form',
		formWaiting: 'form-waiting',
		formTest: 'form-test',
	});
	const app = mock<express.Application>();
	let service: PrometheusRouteMetricsService;
	let mockGaugeSet: jest.Mock;

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeApiEndpoints: true,
			includeApiPathLabel: false,
			includeApiMethodLabel: false,
			includeApiStatusCodeLabel: false,
		});
		service = new PrometheusRouteMetricsService(config, endpointsConfig);
		mockGaugeSet = jest.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
	});

	afterEach(() => {
		jest.clearAllMocks();
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

			const middleware = jest.mocked(app.use).mock.calls[0][1];
			const req = mock<express.Request>();
			const res = mock<express.Response>();
			const next = jest.fn();

			await middleware(req, res, next);

			expect(mockGaugeSet).toHaveBeenCalledTimes(2); // once in init, once in middleware
		});
	});
});
