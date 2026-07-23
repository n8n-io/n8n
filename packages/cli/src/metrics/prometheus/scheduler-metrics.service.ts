import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ScheduledTaskRepository, type ScheduledTaskMetricSnapshot } from '@n8n/db';
import { Service } from '@n8n/di';
import type { SchedulerMetrics } from '@n8n/scheduler';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';
import { CachedMetricQuery } from './cached-metric-query';
import { DURATION_BUCKETS_SECONDS } from './constant';

const SNAPSHOT_CACHE_KEY = 'metrics:scheduler:snapshot:v1';

/**
 * Collects Prometheus metrics for the Durable Scheduler. Opt-in via
 * `includeSchedulerMetrics` and only active on a main instance. Counters and the
 * lag histogram are driven directly through the {@link SchedulerMetrics} contract
 * (this collector is the scheduler's metrics sink); queue-health gauges are read
 * lazily from the task repository on each scrape. It is the only place that
 * touches `prom-client` for scheduler metrics.
 */
@Service()
export class PrometheusSchedulerMetricsService
	implements PrometheusMetricsCollector, SchedulerMetrics
{
	private initialized = false;

	private tasksDispatched!: promClient.Counter<'task_type'>;
	private tasksCompleted!: promClient.Counter<'task_type' | 'result'>;
	private taskRetries!: promClient.Counter<'task_type'>;
	private occurrencesMaterialized!: promClient.Counter;
	private jobsDeferred!: promClient.Counter;
	private tasksReclaimed!: promClient.Counter;
	private tasksDeadLettered!: promClient.Counter;
	private tasksPruned!: promClient.Counter;
	private dispatchLagSeconds!: promClient.Histogram<'task_type'>;

	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly cacheService: CacheService,
		private readonly taskRepository: ScheduledTaskRepository,
	) {}

	get enabled(): boolean {
		return this.config.includeSchedulerMetrics && this.instanceSettings.instanceType === 'main';
	}

	init() {
		this.initPushMetrics();
		this.initSnapshotGauges();
		this.initialized = true;
	}

	private initPushMetrics() {
		const prefix = this.config.prefix;

		this.tasksDispatched = new promClient.Counter({
			name: `${prefix}scheduler_tasks_dispatched_total`,
			help: 'Total number of scheduler tasks dispatched to a handler by task type.',
			labelNames: ['task_type'],
		});

		this.tasksCompleted = new promClient.Counter({
			name: `${prefix}scheduler_tasks_completed_total`,
			help: 'Total number of scheduler tasks that finished firing by task type and result.',
			labelNames: ['task_type', 'result'],
		});

		this.taskRetries = new promClient.Counter({
			name: `${prefix}scheduler_task_retries_total`,
			help: 'Total number of scheduler task retries by task type.',
			labelNames: ['task_type'],
		});

		this.occurrencesMaterialized = new promClient.Counter({
			name: `${prefix}scheduler_occurrences_materialized_total`,
			help: 'Total number of occurrences materialized from job schedules.',
		});

		this.jobsDeferred = new promClient.Counter({
			name: `${prefix}scheduler_jobs_deferred_total`,
			help: 'Total number of jobs deferred for retry during materialization.',
		});

		this.tasksReclaimed = new promClient.Counter({
			name: `${prefix}scheduler_tasks_reclaimed_total`,
			help: 'Total number of expired scheduler tasks reclaimed by the reaper.',
		});

		this.tasksDeadLettered = new promClient.Counter({
			name: `${prefix}scheduler_tasks_dead_lettered_total`,
			help: 'Total number of scheduler tasks dead-lettered after exhausting their attempts, from either path: a terminal handler failure or the reaper recovering an expired lease.',
		});

		this.tasksPruned = new promClient.Counter({
			name: `${prefix}scheduler_tasks_pruned_total`,
			help: 'Total number of finished scheduler tasks deleted by retention.',
		});

		this.dispatchLagSeconds = new promClient.Histogram({
			name: `${prefix}scheduler_dispatch_lag_seconds`,
			help: 'Delay in seconds between a task becoming due and being dispatched, by task type.',
			labelNames: ['task_type'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		// Only the label-free counters can be pre-seeded; the `task_type`-labelled
		// series are created lazily as task types are discovered at runtime.
		this.occurrencesMaterialized.inc(0);
		this.jobsDeferred.inc(0);
		this.tasksReclaimed.inc(0);
		this.tasksDeadLettered.inc(0);
		this.tasksPruned.inc(0);
	}

	private initSnapshotGauges() {
		const repository = this.taskRepository;
		const prefix = this.config.prefix;
		// One snapshot query feeds all four gauges; cache it so a tight scrape
		// interval doesn't hammer the tasks table. Within a scrape, coalescing
		// collapses the gauges' collects to a single query.
		const ttlMs = this.config.schedulerMetricsInterval * Time.seconds.toMilliseconds;

		const query = new CachedMetricQuery<ScheduledTaskMetricSnapshot>({
			cacheService: this.cacheService,
			cacheKey: SNAPSHOT_CACHE_KEY,
			ttlMs,
			query: async () => await repository.getMetricSnapshot(),
		});

		new promClient.Gauge({
			name: `${prefix}scheduler_tasks_pending`,
			help: 'Number of pending scheduler tasks awaiting dispatch. Cluster-wide snapshot, identical on every main; aggregate with max/avg, not sum.',
			async collect() {
				const snapshot = await query.get();
				this.set(snapshot.pending);
			},
		});

		new promClient.Gauge({
			name: `${prefix}scheduler_tasks_due`,
			help: 'Number of pending scheduler tasks already due for dispatch. Cluster-wide snapshot, identical on every main; aggregate with max/avg, not sum.',
			async collect() {
				const snapshot = await query.get();
				this.set(snapshot.due);
			},
		});

		new promClient.Gauge({
			name: `${prefix}scheduler_tasks_running`,
			help: 'Number of scheduler tasks currently claimed and in flight. Cluster-wide snapshot, identical on every main; aggregate with max/avg, not sum.',
			async collect() {
				const snapshot = await query.get();
				this.set(snapshot.running);
			},
		});

		new promClient.Gauge({
			name: `${prefix}scheduler_oldest_pending_age_seconds`,
			help: 'Age in seconds of the oldest due pending scheduler task; 0 means no due backlog (not a task 0s late). Cluster-wide snapshot, identical on every main; aggregate with max/avg, not sum.',
			async collect() {
				const snapshot = await query.get();
				this.set(
					snapshot.oldestPendingAgeMs !== null
						? snapshot.oldestPendingAgeMs * Time.milliseconds.toSeconds
						: 0,
				);
			},
		});
	}

	// SchedulerMetrics sink. Each guard makes the method a no-op when the collector
	// was never initialized (metrics disabled or not a main), so the scheduler can
	// hold this instance as its metrics dependency unconditionally.

	recordDispatch(taskType: string) {
		if (this.initialized) {
			this.tasksDispatched.inc({ task_type: taskType }, 1);
		}
	}

	recordFireOutcome(taskType: string, result: 'success' | 'failure') {
		if (this.initialized) {
			this.tasksCompleted.inc({ task_type: taskType, result }, 1);
		}
	}

	recordRetry(taskType: string) {
		if (this.initialized) {
			this.taskRetries.inc({ task_type: taskType }, 1);
		}
	}

	observeDispatchLagSeconds(taskType: string, seconds: number) {
		if (this.initialized) {
			this.dispatchLagSeconds.observe({ task_type: taskType }, seconds);
		}
	}

	recordMaterialized(occurrences: number, deferredJobs: number) {
		if (this.initialized) {
			this.occurrencesMaterialized.inc(occurrences);
			this.jobsDeferred.inc(deferredJobs);
		}
	}

	recordReaped(reclaimed: number, deadLettered: number) {
		if (this.initialized) {
			this.tasksReclaimed.inc(reclaimed);
			this.tasksDeadLettered.inc(deadLettered);
		}
	}

	// Executor terminal-failure path. Feeds the same counter as `recordReaped`'s
	// deadLettered arg, so the total counts all permanent failures from either path.
	recordDeadLettered() {
		if (this.initialized) {
			this.tasksDeadLettered.inc(1);
		}
	}

	recordPruned(deleted: number) {
		if (this.initialized) {
			this.tasksPruned.inc(deleted);
		}
	}
}
