import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { ScheduledTaskMetricSnapshot, ScheduledTaskRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { PrometheusSchedulerMetricsService } from '../scheduler-metrics.service';

import type { CacheService } from '@/services/cache/cache.service';

vi.mock('prom-client');

describe('PrometheusSchedulerMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeSchedulerMetrics: true,
		schedulerMetricsInterval: 20,
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const cacheService = mock<CacheService>();
	const taskRepository = mock<ScheduledTaskRepository>();

	let service: PrometheusSchedulerMetricsService;
	let sharedCounterInc: Mock;
	let mockHistogramObserve: Mock;
	// Records the options each Counter is constructed with (a vitest constructor
	// mock returns a shared instance, so we track construction and per-instance
	// `inc` mocks ourselves via a real fake class below).
	let counterCtor: Mock;
	const counterIncByName = new Map<string, Mock>();

	const snapshot: ScheduledTaskMetricSnapshot = {
		pending: 4,
		due: 2,
		running: 1,
		oldestPendingAgeMs: 10_000,
	};

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeSchedulerMetrics: true,
			schedulerMetricsInterval: 20,
		});
		Object.assign(instanceSettings, { instanceType: 'main' });

		service = new PrometheusSchedulerMetricsService(
			config,
			instanceSettings,
			cacheService,
			taskRepository,
		);

		sharedCounterInc = vi.fn();
		mockHistogramObserve = vi.fn();
		counterCtor = vi.fn();
		counterIncByName.clear();
		// Replace the auto-mocked Counter class (whose instances share one prototype
		// `inc`) with a real class, so each construction yields its own `inc`. This
		// lets a test assert the right counter received the right value (an arg-swap
		// would otherwise pass). `inc` also forwards to `sharedCounterInc`, letting
		// the before-init test assert no counter was touched at all.
		class FakeCounter {
			// A fresh arrow wrapper per instance (passing `sharedCounterInc` directly
			// would hit vitest's `vi.fn` memoisation and share one mock across instances).
			inc = vi.fn((...args: unknown[]) => sharedCounterInc(...args));

			constructor(opts: { name: string }) {
				counterCtor(opts);
				counterIncByName.set(opts.name, this.inc);
			}
		}
		(promClient as unknown as { Counter: unknown }).Counter = FakeCounter;
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const gaugeOptsFor = (name: string) =>
		(promClient.Gauge as unknown as Mock).mock.calls.find((call) => call[0].name === name)?.[0];

	// Resolves the per-instance `inc` mock for the counter registered under `name`.
	const counterIncFor = (name: string): Mock => counterIncByName.get(name)!;

	// Clears the init-time `.inc(0)` seeding so behavioural tests see only their own
	// call.
	const clearCounterIncs = () => {
		for (const inc of counterIncByName.values()) inc.mockClear();
	};

	describe('enabled', () => {
		it('is true when opted in and the instance is main', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeSchedulerMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false on a non-main instance', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('registers the counters, lag histogram and snapshot gauges', () => {
			service.init();

			const counterNames = counterCtor.mock.calls.map((c) => c[0].name);
			expect(counterNames).toEqual(
				expect.arrayContaining([
					'n8n_scheduler_tasks_dispatched_total',
					'n8n_scheduler_tasks_completed_total',
					'n8n_scheduler_task_retries_total',
					'n8n_scheduler_occurrences_materialized_total',
					'n8n_scheduler_jobs_deferred_total',
					'n8n_scheduler_tasks_reclaimed_total',
					'n8n_scheduler_tasks_dead_lettered_total',
					'n8n_scheduler_tasks_pruned_total',
				]),
			);

			const histogramNames = (promClient.Histogram as unknown as Mock).mock.calls.map(
				(c) => c[0].name,
			);
			expect(histogramNames).toContain('n8n_scheduler_dispatch_lag_seconds');

			const gaugeNames = (promClient.Gauge as unknown as Mock).mock.calls.map((c) => c[0].name);
			expect(gaugeNames).toEqual(
				expect.arrayContaining([
					'n8n_scheduler_tasks_pending',
					'n8n_scheduler_tasks_due',
					'n8n_scheduler_tasks_running',
					'n8n_scheduler_oldest_pending_age_seconds',
				]),
			);
		});

		it('applies a custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			const gaugeNames = (promClient.Gauge as unknown as Mock).mock.calls.map((c) => c[0].name);
			expect(gaugeNames).toContain('myapp_scheduler_tasks_pending');
		});

		it('pre-seeds the label-free counters with an initial zero', () => {
			service.init();

			for (const name of [
				'n8n_scheduler_occurrences_materialized_total',
				'n8n_scheduler_jobs_deferred_total',
				'n8n_scheduler_tasks_reclaimed_total',
				'n8n_scheduler_tasks_dead_lettered_total',
				'n8n_scheduler_tasks_pruned_total',
			]) {
				expect(counterIncFor(name)).toHaveBeenCalledWith(0);
			}
		});
	});

	describe('gauge collection', () => {
		beforeEach(() => {
			taskRepository.getMetricSnapshot.mockResolvedValue(snapshot);
			service.init();
		});

		it('reports the pending, due and running counts from the snapshot', async () => {
			for (const [name, expected] of [
				['n8n_scheduler_tasks_pending', 4],
				['n8n_scheduler_tasks_due', 2],
				['n8n_scheduler_tasks_running', 1],
			] as const) {
				const set = vi.fn();
				await gaugeOptsFor(name).collect.call({ set });
				expect(set).toHaveBeenCalledWith(expected);
			}
		});

		it('reports the oldest pending age in seconds', async () => {
			const set = vi.fn();
			await gaugeOptsFor('n8n_scheduler_oldest_pending_age_seconds').collect.call({ set });
			expect(set).toHaveBeenCalledWith(10);
		});

		it('reports 0 for the oldest pending age when none is due', async () => {
			cacheService.get.mockResolvedValueOnce({ ...snapshot, oldestPendingAgeMs: null });

			const set = vi.fn();
			await gaugeOptsFor('n8n_scheduler_oldest_pending_age_seconds').collect.call({ set });
			expect(set).toHaveBeenCalledWith(0);
		});

		it('caches the snapshot query with the configured interval as TTL', async () => {
			await gaugeOptsFor('n8n_scheduler_tasks_pending').collect.call({ set: vi.fn() });

			// 20s interval means a 20_000ms TTL.
			expect(cacheService.set).toHaveBeenCalledWith(
				'metrics:scheduler:snapshot:v1',
				snapshot,
				20_000,
			);
		});

		it('serves the gauges from cache without querying the database', async () => {
			cacheService.get.mockResolvedValueOnce({ ...snapshot, pending: 99 });

			const set = vi.fn();
			await gaugeOptsFor('n8n_scheduler_tasks_pending').collect.call({ set });

			expect(taskRepository.getMetricSnapshot).not.toHaveBeenCalled();
			expect(set).toHaveBeenCalledWith(99);
		});
	});

	describe('push metrics', () => {
		beforeEach(() => {
			service.init();
			// Drop the init-time `.inc(0)` seeding so each test sees only its own call.
			clearCounterIncs();
			mockHistogramObserve.mockClear();
		});

		it('increments the dispatched counter by task type', () => {
			service.recordDispatch('workflow');

			const inc = counterIncFor('n8n_scheduler_tasks_dispatched_total');
			expect(inc).toHaveBeenCalledWith({ task_type: 'workflow' }, 1);
			expect(inc).toHaveBeenCalledTimes(1);
		});

		it('increments the completed counter by task type and result', () => {
			service.recordFireOutcome('workflow', 'failure');

			const inc = counterIncFor('n8n_scheduler_tasks_completed_total');
			expect(inc).toHaveBeenCalledWith({ task_type: 'workflow', result: 'failure' }, 1);
			expect(inc).toHaveBeenCalledTimes(1);
		});

		it('increments the retries counter by task type', () => {
			service.recordRetry('workflow');

			const inc = counterIncFor('n8n_scheduler_task_retries_total');
			expect(inc).toHaveBeenCalledWith({ task_type: 'workflow' }, 1);
			expect(inc).toHaveBeenCalledTimes(1);
		});

		it('observes dispatch lag by task type', () => {
			service.observeDispatchLagSeconds('workflow', 1.5);
			expect(mockHistogramObserve).toHaveBeenCalledWith({ task_type: 'workflow' }, 1.5);
		});

		it('increments materialized occurrences and deferred jobs into their own counters', () => {
			service.recordMaterialized(7, 2);

			const materialized = counterIncFor('n8n_scheduler_occurrences_materialized_total');
			const deferred = counterIncFor('n8n_scheduler_jobs_deferred_total');
			expect(materialized).toHaveBeenCalledWith(7);
			expect(materialized).toHaveBeenCalledTimes(1);
			expect(deferred).toHaveBeenCalledWith(2);
			expect(deferred).toHaveBeenCalledTimes(1);
		});

		it('increments reclaimed and dead-lettered into their own counters', () => {
			service.recordReaped(3, 1);

			const reclaimed = counterIncFor('n8n_scheduler_tasks_reclaimed_total');
			const deadLettered = counterIncFor('n8n_scheduler_tasks_dead_lettered_total');
			expect(reclaimed).toHaveBeenCalledWith(3);
			expect(reclaimed).toHaveBeenCalledTimes(1);
			expect(deadLettered).toHaveBeenCalledWith(1);
			expect(deadLettered).toHaveBeenCalledTimes(1);
		});

		it('increments the dead-lettered counter by one on the executor terminal-failure path', () => {
			service.recordDeadLettered();

			const deadLettered = counterIncFor('n8n_scheduler_tasks_dead_lettered_total');
			expect(deadLettered).toHaveBeenCalledWith(1);
			expect(deadLettered).toHaveBeenCalledTimes(1);
		});

		it('increments the pruned counter', () => {
			service.recordPruned(5);

			const inc = counterIncFor('n8n_scheduler_tasks_pruned_total');
			expect(inc).toHaveBeenCalledWith(5);
			expect(inc).toHaveBeenCalledTimes(1);
		});
	});

	describe('push metrics before init', () => {
		it('are no-ops when the collector was never initialized', () => {
			// Fresh, uninitialized instance (metrics disabled or not a main).
			service.recordDispatch('workflow');
			service.recordFireOutcome('workflow', 'success');
			service.recordRetry('workflow');
			service.observeDispatchLagSeconds('workflow', 1);
			service.recordMaterialized(1, 1);
			service.recordReaped(1, 1);
			service.recordDeadLettered();
			service.recordPruned(1);

			expect(sharedCounterInc).not.toHaveBeenCalled();
			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});
	});
});
