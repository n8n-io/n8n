import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';

import { PrometheusVersionMetricsService } from '../version-metrics.service';

jest.mock('prom-client');

describe('PrometheusVersionMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
	});
	let service: PrometheusVersionMetricsService;
	let mockGaugeSet: jest.Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_' });
		service = new PrometheusVersionMetricsService(config);
		mockGaugeSet = jest.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('enabled', () => {
		it('should always be true', () => {
			expect(service.enabled).toBe(true);
		});
	});

	describe('init', () => {
		it('should create version_info gauge with semver label names', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_version_info',
				help: 'n8n version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});
		});

		it('should apply custom prefix to metric name', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_version_info' }),
			);
		});

		it('should set gauge with version string starting with v and numeric semver parts', () => {
			service.init();

			expect(mockGaugeSet).toHaveBeenCalledWith(
				expect.objectContaining({
					version: expect.stringMatching(/^v\d+/) as unknown,
					major: expect.any(Number) as unknown,
					minor: expect.any(Number) as unknown,
					patch: expect.any(Number) as unknown,
				}),
				1,
			);
		});

		it('should set gauge value to 1', () => {
			service.init();

			expect(mockGaugeSet).toHaveBeenLastCalledWith(expect.any(Object), 1);
		});
	});
});
