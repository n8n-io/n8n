import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { LAG_BUCKETS_SECONDS } from '../constant';
import { PrometheusSystemTaskMetricsService } from '../system-task-metrics.service';

vi.mock('prom-client');

describe('PrometheusSystemTaskMetricsService', () => {
	const NOW = new Date('2026-01-01T00:00:00.000Z');

	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeSystemTaskMetrics: true,
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const eventService = mock<EventService>();

	let service: PrometheusSystemTaskMetricsService;
	const ctorByType = { Counter: vi.fn(), Gauge: vi.fn(), Histogram: vi.fn() };
	const instancesByName = new Map<string, FakeMetric>();

	/**
	 * Tracks a value for each label set the way `prom-client` does, so a test can
	 * assert what a series holds and not only which calls it received.
	 */
	class FakeMetric {
		private readonly valuesByLabels = new Map<string, number>();

		inc = vi.fn((labels: object, value = 1) => this.addTo(labels, value));
		dec = vi.fn((labels: object, value = 1) => this.addTo(labels, -value));
		set = vi.fn((labels: object, value: number) =>
			this.valuesByLabels.set(JSON.stringify(labels), value),
		);
		observe = vi.fn();
		remove = vi.fn((labels: object) => this.valuesByLabels.delete(JSON.stringify(labels)));

		value(labels: object) {
			return this.valuesByLabels.get(JSON.stringify(labels));
		}

		private addTo(labels: object, delta: number) {
			const key = JSON.stringify(labels);
			this.valuesByLabels.set(key, (this.valuesByLabels.get(key) ?? 0) + delta);
		}
	}

	function fake(type: keyof typeof ctorByType) {
		return class extends FakeMetric {
			constructor(opts: { name: string }) {
				super();
				ctorByType[type](opts);
				instancesByName.set(opts.name, this);
			}
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		Object.assign(config, { prefix: 'n8n_', includeSystemTaskMetrics: true });
		Object.assign(instanceSettings, { instanceType: 'main' });
		instancesByName.clear();
		// Replace the auto-mocked classes (whose instances share one prototype method)
		// with fake classes, so each construction yields its own methods and a test
		// can assert the right metric received the right value.
		Object.assign(promClient, {
			Counter: fake('Counter'),
			Gauge: fake('Gauge'),
			Histogram: fake('Histogram'),
		});

		service = new PrometheusSystemTaskMetricsService(config, instanceSettings, eventService);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	const metric = (name: string) => instancesByName.get(`n8n_${name}`)!;

	function handler(event: string) {
		const calls = eventService.on.mock.calls as unknown as Array<
			[string, (payload: unknown) => void]
		>;
		return calls.find(([name]) => name === event)![1];
	}

	describe('enabled', () => {
		it('is true when opted in and the instance is main', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeSystemTaskMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false on a non-main instance', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('registers every series under the prefix', () => {
			config.prefix = 'myapp_';
			service.init();

			const names = (ctor: Mock) =>
				ctor.mock.calls.map(([opts]) => (opts as { name: string }).name);
			expect(names(ctorByType.Histogram)).toEqual([
				'myapp_system_task_run_duration_seconds',
				'myapp_system_task_fire_lag_seconds',
			]);
			expect(names(ctorByType.Counter)).toEqual([
				'myapp_system_task_runs_skipped_total',
				'myapp_system_task_provision_check_failures_total',
				'myapp_system_task_retries_total',
			]);
			expect(names(ctorByType.Gauge)).toEqual([
				'myapp_system_task_last_success_timestamp_seconds',
				'myapp_system_task_runs_in_flight',
				'myapp_system_task_info',
				'myapp_system_task_interval_seconds',
				'myapp_system_task_next_run_timestamp_seconds',
				'myapp_system_task_scheduled',
			]);
		});

		it('gives the fire lag histogram buckets that reach a day', () => {
			service.init();

			expect(ctorByType.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_system_task_fire_lag_seconds',
					buckets: LAG_BUCKETS_SECONDS,
				}),
			);
			expect(LAG_BUCKETS_SECONDS).toContain(86400);
		});

		it('subscribes to every system task event', () => {
			service.init();

			const events = eventService.on.mock.calls.map(([name]) => name);
			expect(events).toEqual([
				'system-task-routed',
				'system-task-timers-started',
				'system-task-timers-stopped',
				'system-task-run-started',
				'system-task-run-settled',
				'system-task-run-skipped',
				'system-task-scheduling-failed',
				'system-task-provision-check-failed',
				'system-task-retry-scheduled',
				'system-task-next-run-planned',
				'system-task-fired',
			]);
		});
	});

	describe('system-task-routed and the timers', () => {
		const inMemory = { task: 'prune', mode: 'in_memory' };
		const durable = { task: 'prune', mode: 'durable' };

		it('seeds the info, scheduled and in-flight series of a durable task when routed', () => {
			service.init();

			handler('system-task-routed')({ name: 'prune', mode: 'durable' });

			expect(metric('system_task_info').set).toHaveBeenCalledWith(durable, 1);
			expect(metric('system_task_scheduled').set).toHaveBeenCalledWith(durable, 1);
			expect(metric('system_task_runs_in_flight').value(durable)).toBe(0);
			expect(metric('system_task_interval_seconds').set).not.toHaveBeenCalled();
		});

		it('sets the interval of an in-memory task when routed, but seeds nothing else on a follower', () => {
			service.init();

			handler('system-task-routed')({ name: 'prune', mode: 'in_memory', intervalSeconds: 60 });

			expect(metric('system_task_interval_seconds').set).toHaveBeenCalledWith(
				{ task: 'prune' },
				60,
			);
			expect(metric('system_task_info').set).not.toHaveBeenCalled();
			expect(metric('system_task_scheduled').set).not.toHaveBeenCalled();
			expect(metric('system_task_runs_in_flight').value(inMemory)).toBeUndefined();
		});

		it('seeds the in-memory series of the routed tasks when the timers start', () => {
			service.init();
			handler('system-task-routed')({ name: 'prune', mode: 'in_memory', intervalSeconds: 60 });

			handler('system-task-timers-started')({});

			expect(metric('system_task_info').set).toHaveBeenCalledWith(inMemory, 1);
			expect(metric('system_task_scheduled').set).toHaveBeenCalledWith(inMemory, 1);
			expect(metric('system_task_runs_in_flight').value(inMemory)).toBe(0);
		});

		it('seeds an in-memory task routed while the timers run at once', () => {
			service.init();
			handler('system-task-timers-started')({});

			handler('system-task-routed')({ name: 'prune', mode: 'in_memory' });

			expect(metric('system_task_info').set).toHaveBeenCalledWith(inMemory, 1);
		});

		it('leaves the in-flight count of a run that outlived a stepdown alone when the timers start again', () => {
			service.init();
			handler('system-task-timers-started')({});
			handler('system-task-routed')({ name: 'prune', mode: 'in_memory' });
			handler('system-task-run-started')({ name: 'prune', mode: 'in_memory' });

			// A stepdown whose run has not settled emits no stop, so the takeover that
			// outran it seeds the series again while that run is still going.
			handler('system-task-timers-started')({});
			expect(metric('system_task_runs_in_flight').value(inMemory)).toBe(1);

			handler('system-task-run-settled')({
				name: 'prune',
				mode: 'in_memory',
				result: 'aborted',
				durationMs: 3000,
			});

			expect(metric('system_task_runs_in_flight').value(inMemory)).toBe(0);
		});

		it('removes the in-memory series, and only those, when the timers stop', () => {
			service.init();
			handler('system-task-timers-started')({});
			handler('system-task-routed')({ name: 'prune', mode: 'in_memory' });
			handler('system-task-routed')({ name: 'compact', mode: 'durable' });

			handler('system-task-timers-stopped')({});

			for (const name of [
				'system_task_info',
				'system_task_scheduled',
				'system_task_runs_in_flight',
				'system_task_last_success_timestamp_seconds',
			]) {
				expect(metric(name).remove).toHaveBeenCalledExactlyOnceWith(inMemory);
			}
			expect(
				metric('system_task_next_run_timestamp_seconds').remove,
			).toHaveBeenCalledExactlyOnceWith({ task: 'prune' });
		});
	});

	describe('system-task-run-started and -settled', () => {
		it('raises the in-flight gauge on start and lowers it on settle', () => {
			service.init();

			handler('system-task-run-started')({ name: 'prune', mode: 'in_memory' });
			expect(metric('system_task_runs_in_flight').inc).toHaveBeenCalledWith({
				task: 'prune',
				mode: 'in_memory',
			});

			handler('system-task-run-settled')({
				name: 'prune',
				mode: 'in_memory',
				result: 'success',
				durationMs: 250,
			});
			expect(metric('system_task_runs_in_flight').dec).toHaveBeenCalledWith({
				task: 'prune',
				mode: 'in_memory',
			});
		});

		it('observes the duration in seconds by result and stamps the last success', () => {
			service.init();

			handler('system-task-run-settled')({
				name: 'prune',
				mode: 'durable',
				result: 'success',
				durationMs: 250,
			});

			expect(metric('system_task_run_duration_seconds').observe).toHaveBeenCalledWith(
				{ task: 'prune', mode: 'durable', result: 'success' },
				0.25,
			);
			expect(metric('system_task_last_success_timestamp_seconds').set).toHaveBeenCalledWith(
				{ task: 'prune', mode: 'durable' },
				NOW.getTime() / 1000,
			);
		});

		it.each(['failure', 'aborted'])('does not stamp the last success on a %s', (result) => {
			service.init();

			handler('system-task-run-settled')({
				name: 'prune',
				mode: 'in_memory',
				result,
				durationMs: 40,
			});

			expect(metric('system_task_run_duration_seconds').observe).toHaveBeenCalledWith(
				{ task: 'prune', mode: 'in_memory', result },
				0.04,
			);
			expect(metric('system_task_last_success_timestamp_seconds').set).not.toHaveBeenCalled();
		});
	});

	describe('counters and lag', () => {
		it('counts a skipped occurrence by reason', () => {
			service.init();

			handler('system-task-run-skipped')({ name: 'prune', reason: 'overlap' });

			expect(metric('system_task_runs_skipped_total').inc).toHaveBeenCalledWith(
				{ task: 'prune', reason: 'overlap' },
				1,
			);
		});

		it('counts every occurrence a coalesced fire stands in for', () => {
			service.init();

			handler('system-task-run-skipped')({
				name: 'prune',
				reason: 'coalesced',
				count: 59,
			});

			expect(metric('system_task_runs_skipped_total').inc).toHaveBeenCalledWith(
				{ task: 'prune', reason: 'coalesced' },
				59,
			);
		});

		it('clears the scheduled gauge on a scheduling failure', () => {
			service.init();

			handler('system-task-scheduling-failed')({ name: 'prune', mode: 'durable' });

			expect(metric('system_task_scheduled').set).toHaveBeenCalledWith(
				{ task: 'prune', mode: 'durable' },
				0,
			);
		});

		it('leaves the next run of a task whose schedule failed to plan where it stood', () => {
			service.init();
			handler('system-task-next-run-planned')({
				name: 'prune',
				nextRunAtMs: NOW.getTime(),
			});

			handler('system-task-scheduling-failed')({ name: 'prune', mode: 'in_memory' });

			expect(metric('system_task_next_run_timestamp_seconds').remove).not.toHaveBeenCalled();
			expect(metric('system_task_next_run_timestamp_seconds').value({ task: 'prune' })).toBe(
				NOW.getTime() / 1000,
			);
		});

		it('sets the next run in seconds', () => {
			service.init();

			handler('system-task-next-run-planned')({
				name: 'prune',
				nextRunAtMs: NOW.getTime() + 1500,
			});

			expect(metric('system_task_next_run_timestamp_seconds').set).toHaveBeenCalledWith(
				{ task: 'prune' },
				NOW.getTime() / 1000 + 1.5,
			);
		});

		it('counts a failed provision check', () => {
			service.init();

			handler('system-task-provision-check-failed')({ name: 'prune' });

			expect(metric('system_task_provision_check_failures_total').inc).toHaveBeenCalledWith({
				task: 'prune',
			});
		});

		it('counts a scheduled retry', () => {
			service.init();

			handler('system-task-retry-scheduled')({ name: 'prune' });

			expect(metric('system_task_retries_total').inc).toHaveBeenCalledWith({ task: 'prune' });
		});

		it('observes the fire lag in seconds', () => {
			service.init();

			handler('system-task-fired')({ name: 'prune', lagMs: 1500 });

			expect(metric('system_task_fire_lag_seconds').observe).toHaveBeenCalledWith(
				{ task: 'prune' },
				1.5,
			);
		});
	});
});
