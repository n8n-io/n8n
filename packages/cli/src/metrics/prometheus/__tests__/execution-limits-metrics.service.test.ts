import type { ExecutionUsageCache } from '@n8n/backend-module-execution-limits';
import type { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { PrometheusExecutionLimitsMetricsService } from '../execution-limits-metrics.service';

vi.mock('prom-client');

describe('PrometheusExecutionLimitsMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeExecutionLimitsMetrics: true,
	});
	const usageCache = mock<ExecutionUsageCache>({ isRunning: true });
	const eventService = mock<EventService>();
	const metrics = new Map<
		string,
		{
			observe: ReturnType<typeof vi.fn>;
			inc: ReturnType<typeof vi.fn>;
			set: ReturnType<typeof vi.fn>;
		}
	>();

	let service: PrometheusExecutionLimitsMetricsService;

	function fake() {
		return class {
			observe = vi.fn();
			inc = vi.fn();
			set = vi.fn();
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
		Object.assign(usageCache, { isRunning: true });
		Object.assign(promClient, { Counter: fake(), Gauge: fake(), Histogram: fake() });
		service = new PrometheusExecutionLimitsMetricsService(config, usageCache, eventService);
	});

	describe('enabled', () => {
		it('is true when opted in and the cache runs', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeExecutionLimitsMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false when the module did not start the cache', () => {
			Object.assign(usageCache, { isRunning: false });
			expect(service.enabled).toBe(false);
		});
	});

	it('observes the duration of a refresh in seconds', () => {
		service.init();

		emit('execution-limit-usage-refreshed', { durationMs: 250, queried: true });

		expect(
			metrics.get('n8n_execution_limit_usage_refresh_duration_seconds')?.observe,
		).toHaveBeenCalledExactlyOnceWith(0.25);
	});

	it('does not observe the duration of a refresh that read nothing', () => {
		service.init();

		emit('execution-limit-usage-refreshed', { durationMs: 1, queried: false });

		expect(
			metrics.get('n8n_execution_limit_usage_refresh_duration_seconds')?.observe,
		).not.toHaveBeenCalled();
	});

	it.each([true, false])('sets the last success time when queried is %s', (queried) => {
		vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
		service.init();

		emit('execution-limit-usage-refreshed', { durationMs: 1, queried });

		expect(
			metrics.get('n8n_execution_limit_usage_refresh_last_success_timestamp_seconds')?.set,
		).toHaveBeenCalledExactlyOnceWith(1_700_000_000);
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
