import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { PrometheusInstanceRoleMetricsService } from '../instance-role-metrics.service';

jest.mock('prom-client');

describe('PrometheusInstanceRoleMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main', isLeader: false });
	let service: PrometheusInstanceRoleMetricsService;
	let mockGaugeSet: jest.Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_' });
		Object.assign(instanceSettings, { instanceType: 'main', isLeader: false });
		service = new PrometheusInstanceRoleMetricsService(config, instanceSettings);
		mockGaugeSet = jest.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when instanceType is main', () => {
			Object.assign(instanceSettings, { instanceType: 'main' });
			expect(service.enabled).toBe(true);
		});

		it('should be false when instanceType is worker', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});

		it('should be false when instanceType is webhook', () => {
			// Dedicated webhook processes call PrometheusMetricsService.init(app)
			// but should not expose a leader gauge — they are never elected leader.
			Object.assign(instanceSettings, { instanceType: 'webhook' });
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create instance_role_leader gauge with correct config', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_instance_role_leader',
				help: 'Whether this main instance is the leader (1) or not (0).',
			});
		});

		it('should apply custom prefix to metric name', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_instance_role_leader' }),
			);
		});

		it('should set gauge to 1 when instanceSettings.isLeader is true', () => {
			Object.assign(instanceSettings, { isLeader: true });
			service.init();

			expect(mockGaugeSet).toHaveBeenCalledWith(1);
		});

		it('should set gauge to 0 when instanceSettings.isLeader is false', () => {
			Object.assign(instanceSettings, { isLeader: false });
			service.init();

			expect(mockGaugeSet).toHaveBeenCalledWith(0);
		});
	});

	describe('updateOnLeaderTakeover', () => {
		it('should set gauge to 1 after init', () => {
			service.init();
			jest.clearAllMocks();

			service.updateOnLeaderTakeover();

			expect(mockGaugeSet).toHaveBeenCalledWith(1);
		});
	});

	describe('updateOnLeaderStepdown', () => {
		it('should set gauge to 0 after init', () => {
			service.init();
			jest.clearAllMocks();

			service.updateOnLeaderStepdown();

			expect(mockGaugeSet).toHaveBeenCalledWith(0);
		});
	});
});
