import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';

import { PrometheusDefaultMetricsService } from '../default-metrics.service';

vi.mock('prom-client');

describe('PrometheusDefaultMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeDefaultMetrics: true,
	});
	let service: PrometheusDefaultMetricsService;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeDefaultMetrics: true });
		service = new PrometheusDefaultMetricsService(config);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when includeDefaultMetrics is true', () => {
			config.includeDefaultMetrics = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeDefaultMetrics is false', () => {
			config.includeDefaultMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should call promClient.collectDefaultMetrics with the configured prefix', () => {
			service.init();

			expect(promClient.collectDefaultMetrics).toHaveBeenCalledWith({ prefix: 'n8n_' });
		});

		it('should pass custom prefix to collectDefaultMetrics', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.collectDefaultMetrics).toHaveBeenCalledWith({ prefix: 'custom_' });
		});
	});
});
