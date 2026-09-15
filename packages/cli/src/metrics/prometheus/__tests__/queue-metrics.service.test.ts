import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig, PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { PrometheusQueueMetricsService } from '../queue-metrics.service';

import type { EventService } from '@/events/event.service';

vi.mock('prom-client');

describe('PrometheusQueueMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeQueueMetrics: true,
	});
	const executionsConfig = mockInstance(ExecutionsConfig, {
		mode: 'queue',
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const eventService = mock<EventService>();
	let service: PrometheusQueueMetricsService;
	let mockGaugeSet: Mock;
	let mockCounterInc: Mock;

	function getEventHandler(eventName: string) {
		return eventService.on.mock.calls.find((c) => c[0] === eventName)?.[1];
	}

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeQueueMetrics: true });
		Object.assign(executionsConfig, { mode: 'queue' });
		Object.assign(instanceSettings, { instanceType: 'main' });
		service = new PrometheusQueueMetricsService(
			config,
			executionsConfig,
			instanceSettings,
			eventService,
		);
		mockGaugeSet = vi.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
		mockCounterInc = vi.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when all conditions are met (includeQueueMetrics, queue mode, main instance)', () => {
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeQueueMetrics is false', () => {
			config.includeQueueMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('should be false when executions.mode is not queue', () => {
			executionsConfig.mode = 'regular';
			expect(service.enabled).toBe(false);
		});

		it('should be false when instanceType is not main', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create scaling_mode_queue_jobs_waiting gauge', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_scaling_mode_queue_jobs_waiting',
				help: 'Current number of enqueued jobs waiting for pickup in scaling mode.',
			});
		});

		it('should create scaling_mode_queue_jobs_active gauge', () => {
			service.init();

			expect(promClient.Gauge).toHaveBeenCalledWith({
				name: 'n8n_scaling_mode_queue_jobs_active',
				help: 'Current number of jobs being processed across all workers in scaling mode.',
			});
		});

		it('should create scaling_mode_queue_jobs_completed counter', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_scaling_mode_queue_jobs_completed',
				help: 'Total number of jobs completed across all workers in scaling mode since instance start.',
			});
		});

		it('should create scaling_mode_queue_jobs_failed counter', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_scaling_mode_queue_jobs_failed',
				help: 'Total number of jobs failed across all workers in scaling mode since instance start.',
			});
		});

		it('should seed both gauges at 0', () => {
			service.init();

			// Gauge.prototype.set called twice for the 2 gauges
			expect(mockGaugeSet).toHaveBeenCalledWith(0);
			expect(mockGaugeSet).toHaveBeenCalledTimes(2);
		});

		it('should seed both counters at 0', () => {
			service.init();

			expect(mockCounterInc).toHaveBeenCalledWith(0);
			expect(mockCounterInc).toHaveBeenCalledTimes(2);
		});

		it('should register a job-counts-updated event listener', () => {
			service.init();

			expect(eventService.on.mock.calls).toContainEqual([
				'job-counts-updated',
				expect.any(Function),
			]);
		});
	});

	describe('job-counts-updated event handler', () => {
		it('should update gauges and counters with correct values from job counts', () => {
			service.init();
			const handler = getEventHandler('job-counts-updated');
			vi.clearAllMocks();

			expect(handler).toBeDefined();
			handler!({ waiting: 5, active: 3, completed: 10, failed: 2 });

			// The gauges and counters are called via prototype mocks
			expect(mockGaugeSet).toHaveBeenCalledWith(5);
			expect(mockGaugeSet).toHaveBeenCalledWith(3);
			expect(mockCounterInc).toHaveBeenCalledWith(10);
			expect(mockCounterInc).toHaveBeenCalledWith(2);
		});
	});
});
