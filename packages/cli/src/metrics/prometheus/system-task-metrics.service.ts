import { CacheService, EventService } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { ScheduledJobOwnerType, Time } from '@n8n/constants';
import { ScheduledJobRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import {
	SYSTEM_TASK_SKIP_REASONS,
	type SystemTaskMode,
} from '@/events/maps/system-task-metrics.event-map';

import type { PrometheusMetricsCollector } from './base';
import { CachedMetricQuery } from './cached-metric-query';
import { DURATION_BUCKETS_SECONDS, LAG_BUCKETS_SECONDS } from './constant';

const DURABLE_JOBS_CACHE_KEY = 'metrics:system-tasks:durable-jobs:v1';

/** The stored schedule of one durable system task, as JSON so the cache can hold it. */
type DurableJobState = {
	task: string;
	/** Enabled and not quarantined, so the scheduler will claim it. */
	runnable: boolean;
	nextRunAtSeconds: number | null;
};

/**
 * Collects Prometheus metrics for system tasks, on all of their paths: the
 * in-memory timers of the leader, the durable scheduler and the per-instance
 * timers, told apart by the `mode` label. Opt-in via
 * `includeSystemTaskMetrics`. Every value comes from `EventService`, so this is
 * the only place that touches `prom-client` for system tasks.
 *
 * The per-task gauges of a durable or per-instance task are seeded when it is
 * routed, so the series exist before the first run and a restart shows as a
 * reset rather than a gap. Those of a leader_timer task exist only while this
 * instance leads: seeded when the timers start, removed when they stop, so a
 * former leader does not export frozen series for runs it no longer makes.
 *
 * The run outcome and skip series start at zero when a task is seeded, so
 * `increase()` counts the first failure after a restart.
 *
 * The scheduled and next-run series of a durable task come from its stored job,
 * read on scrape: the job is shared by every main, so another main can remove it
 * without this instance seeing an event.
 *
 * Labels are bounded (task name, mode, result, reason): no instance label,
 * Prometheus adds one per scrape target.
 */
@Service()
export class PrometheusSystemTaskMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
		private readonly cacheService: CacheService,
		private readonly scheduledJobRepository: ScheduledJobRepository,
	) {}

	get enabled(): boolean {
		return this.config.includeSystemTaskMetrics;
	}

	init() {
		const prefix = this.config.prefix;

		const runDuration = new promClient.Histogram({
			name: `${prefix}system_task_run_duration_seconds`,
			help: 'Duration in seconds of a system task run, by task, mode (leader_timer, instance_timer, durable) and result (success, failure, aborted, lease_lost, timed_out).',
			labelNames: ['task', 'mode', 'result'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const runsSkipped = new promClient.Counter({
			name: `${prefix}system_task_runs_skipped_total`,
			help: 'Total number of timer-driven system task occurrences that did not run on this instance, by task and reason (overlap, provisioned_elsewhere, aborted, coalesced).',
			labelNames: ['task', 'reason'],
		});

		const lastSuccess = new promClient.Gauge({
			name: `${prefix}system_task_last_success_timestamp_seconds`,
			help: 'Unix timestamp in seconds of the last successful run of a system task on this instance, by task and mode.',
			labelNames: ['task', 'mode'],
		});

		const runsInFlight = new promClient.Gauge({
			name: `${prefix}system_task_runs_in_flight`,
			help: 'Number of system task runs currently in flight on this instance, by task and mode.',
			labelNames: ['task', 'mode'],
		});

		const info = new promClient.Gauge({
			name: `${prefix}system_task_info`,
			help: 'Always 1 for every system task this instance can run, by task and mode: leader_timer tasks on the leader, instance_timer tasks in every instance that runs them, durable tasks on every main.',
			labelNames: ['task', 'mode'],
		});

		const interval = new promClient.Gauge({
			name: `${prefix}system_task_interval_seconds`,
			help: 'Declared cadence in seconds of a system task on an interval schedule, by task.',
			labelNames: ['task'],
		});

		const durableTasks = new Set<string>();
		const durableJobs = new CachedMetricQuery<DurableJobState[]>({
			cacheService: this.cacheService,
			cacheKey: DURABLE_JOBS_CACHE_KEY,
			ttlMs: this.config.schedulerMetricsInterval * Time.seconds.toMilliseconds,
			query: async () => await this.findDurableJobStates(),
		});
		const collectDurableJobs = async () => {
			if (durableTasks.size > 0) {
				await this.applyDurableJobStates(durableJobs, durableTasks, scheduled, nextRun);
			}
		};

		const nextRun = new promClient.Gauge({
			name: `${prefix}system_task_next_run_timestamp_seconds`,
			help: 'Unix timestamp in seconds of the next occurrence of a system task, by task: the occurrence a timer is armed for on this instance, or the first occurrence not yet planned for a durable task, identical on every main. Planned occurrences of a durable task can fire before this timestamp.',
			labelNames: ['task'],
			collect: collectDurableJobs,
		});

		const scheduled = new promClient.Gauge({
			name: `${prefix}system_task_scheduled`,
			help: '1 while a system task is scheduled to run, 0 once it stopped being scheduled, by task and mode: the schedule of a leader_timer or instance_timer task could not be planned on this instance, or no runnable job is stored for a durable task.',
			labelNames: ['task', 'mode'],
			collect: collectDurableJobs,
		});

		const provisionCheckFailures = new promClient.Counter({
			name: `${prefix}system_task_provision_check_failures_total`,
			help: 'Total number of times the check for the durable job of a system task failed, so the task ran on the leader timer anyway, by task.',
			labelNames: ['task'],
		});

		const retries = new promClient.Counter({
			name: `${prefix}system_task_retries_total`,
			help: 'Total number of timer-driven system task retries scheduled on this instance after a failed run, by task.',
			labelNames: ['task'],
		});

		const fireLag = new promClient.Histogram({
			name: `${prefix}system_task_fire_lag_seconds`,
			help: 'Delay in seconds between a timer-driven system task occurrence being due and its timer firing on this instance, by task.',
			labelNames: ['task'],
			buckets: LAG_BUCKETS_SECONDS,
		});

		const leaderTimerTasks = new Set<string>();
		const zeroedRunOutcomes = new Set<string>();
		let timersRunning = false;

		const zeroCounts = (task: string, mode: SystemTaskMode) => {
			// `zero()` resets a histogram, so a later takeover must not zero it again.
			const key = `${task}:${mode}`;
			if (!zeroedRunOutcomes.has(key)) {
				zeroedRunOutcomes.add(key);
				runDuration.zero({ task, mode, result: 'success' });
				runDuration.zero({ task, mode, result: 'failure' });
			}
			if (mode !== 'durable') {
				retries.inc({ task }, 0);
				SYSTEM_TASK_SKIP_REASONS.forEach((reason) => runsSkipped.inc({ task, reason }, 0));
			}
		};

		const seed = (task: string, mode: SystemTaskMode) => {
			info.set({ task, mode }, 1);
			scheduled.set({ task, mode }, 1);
			// Creates the series without writing it: a run still settling from before
			// a takeover has its own decrement to come, and an absolute 0 here would
			// turn that decrement into a permanent -1.
			runsInFlight.inc({ task, mode }, 0);
			zeroCounts(task, mode);
		};

		const leaderTimerGauges = [info, scheduled, runsInFlight, lastSuccess];
		const removeLeaderTimerSeries = (task: string) => {
			leaderTimerGauges.forEach((gauge) => gauge.remove({ task, mode: 'leader_timer' }));
			nextRun.remove({ task });
		};

		this.eventService.on('system-task-routed', ({ name, mode, intervalSeconds }) => {
			if (intervalSeconds !== undefined) {
				interval.set({ task: name }, intervalSeconds);
			}
			if (mode === 'leader_timer') {
				leaderTimerTasks.add(name);
			}
			if (mode === 'durable') {
				durableTasks.add(name);
			}
			if (mode !== 'leader_timer' || timersRunning) {
				seed(name, mode);
			}
		});

		this.eventService.on('system-task-timers-started', () => {
			timersRunning = true;
			leaderTimerTasks.forEach((task) => seed(task, 'leader_timer'));
		});

		this.eventService.on('system-task-timers-stopped', () => {
			timersRunning = false;
			leaderTimerTasks.forEach(removeLeaderTimerSeries);
		});

		this.eventService.on('system-task-run-started', ({ name, mode }) => {
			runsInFlight.inc({ task: name, mode });
		});

		this.eventService.on('system-task-run-settled', ({ name, mode, result, durationMs }) => {
			runsInFlight.dec({ task: name, mode });
			runDuration.observe({ task: name, mode, result }, durationMs / Time.seconds.toMilliseconds);
			if (result === 'success') {
				lastSuccess.set({ task: name, mode }, Date.now() / Time.seconds.toMilliseconds);
			}
		});

		this.eventService.on('system-task-run-skipped', ({ name, reason, count }) => {
			runsSkipped.inc({ task: name, reason }, count ?? 1);
		});

		this.eventService.on('system-task-scheduling-failed', ({ name, mode }) => {
			// The next-run series is left as it stood: a due time that stops advancing
			// is what makes a timer that no longer plans visible to an alert.
			scheduled.set({ task: name, mode }, 0);
		});

		this.eventService.on('system-task-provision-check-failed', ({ name }) => {
			provisionCheckFailures.inc({ task: name });
		});

		this.eventService.on('system-task-retry-scheduled', ({ name }) => {
			retries.inc({ task: name });
		});

		this.eventService.on('system-task-next-run-planned', ({ name, nextRunAtMs }) => {
			nextRun.set({ task: name }, nextRunAtMs / Time.seconds.toMilliseconds);
		});

		this.eventService.on('system-task-fired', ({ name, lagMs }) => {
			fireLag.observe({ task: name }, lagMs / Time.seconds.toMilliseconds);
		});
	}

	private async findDurableJobStates(): Promise<DurableJobState[]> {
		const jobs = await this.scheduledJobRepository.findScheduleStatesByOwnerType(
			ScheduledJobOwnerType.SystemTask,
		);
		return jobs.map(({ ownerId, runnable, nextRunAt }) => ({
			task: ownerId,
			runnable,
			nextRunAtSeconds:
				nextRunAt === null ? null : nextRunAt.getTime() / Time.seconds.toMilliseconds,
		}));
	}

	/**
	 * Set the scheduled and next-run series of every durable task from its stored
	 * job. A failed read keeps the last values, so one database error does not
	 * fail the whole scrape.
	 */
	private async applyDurableJobStates(
		durableJobs: CachedMetricQuery<DurableJobState[]>,
		durableTasks: Set<string>,
		scheduled: promClient.Gauge<'task' | 'mode'>,
		nextRun: promClient.Gauge<'task'>,
	): Promise<void> {
		let states: DurableJobState[];
		try {
			states = await durableJobs.get();
		} catch {
			return;
		}
		const stateByTask = new Map(states.map((state) => [state.task, state]));
		for (const task of durableTasks) {
			const state = stateByTask.get(task);
			scheduled.set({ task, mode: 'durable' }, state?.runnable ? 1 : 0);
			if (state?.runnable && state.nextRunAtSeconds !== null) {
				nextRun.set({ task }, state.nextRunAtSeconds);
			} else {
				nextRun.remove({ task });
			}
		}
	}
}
