import type { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { PrometheusExecutionLimitsMetricsService } from '../execution-limits-metrics.service';

vi.mock('prom-client');

describe('PrometheusExecutionLimitsMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeExecutionLimitsMetrics: true,
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const eventService = mock<EventService>();
	const metrics = new Map<
		string,
		{ observe: ReturnType<typeof vi.fn>; inc: ReturnType<typeof vi.fn> }
	>();

	let service: PrometheusExecutionLimitsMetricsService;

	function fake() {
		return class {
			observe = vi.fn();
			inc = vi.fn();
			constructor(opts: { name: string }) {
				metrics.set(opts.name, this);
			}
		};
	}

	function emit(event: string, payload: object) {
		const calls = eventService.on.mock.calls as unknown as Array<
			[string, (payload: unknown) => void]
		>;
		calls.find(([name]) => name === event)![1](payload);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		metrics.clear();
		Object.assign(config, { prefix: 'n8n_', includeExecutionLimitsMetrics: true });
		Object.assign(instanceSettings, { instanceType: 'main' });
		Object.assign(promClient, { Counter: fake(), Histogram: fake() });
		service = new PrometheusExecutionLimitsMetricsService(config, instanceSettings, eventService);
	});

	describe('enabled', () => {
		it.each(['main', 'webhook'])('is true when opted in on %s', (instanceType) => {
			Object.assign(instanceSettings, { instanceType });
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeExecutionLimitsMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false on a worker', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});
	});

	it('observes the duration of a refresh in seconds', () => {
		service.init();

		emit('execution-limit-usage-refreshed', { durationMs: 250 });

		expect(
			metrics.get('n8n_execution_limit_usage_refresh_duration_seconds')?.observe,
		).toHaveBeenCalledExactlyOnceWith(0.25);
	});

	it('counts each failed refresh', () => {
		service.init();

		emit('execution-limit-usage-refresh-failed', {});
		emit('execution-limit-usage-refresh-failed', {});

		expect(
			metrics.get('n8n_execution_limit_usage_refresh_failures_total')?.inc,
		).toHaveBeenCalledTimes(2);
	});
});
