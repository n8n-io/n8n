import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time, type InstanceType } from '@n8n/constants';
import type {
	SystemTask,
	SystemTaskClass,
	SystemTaskPlacement,
	SystemTaskSchedule,
} from '@n8n/decorators';
import {
	OnLeaderStepdown,
	OnLeaderTakeover,
	OnShutdown,
	resolveSystemTaskRunOptions,
	SystemTaskMetadata,
	resolveSystemTaskSchedule,
} from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { scheduleFromDefinition } from '@n8n/scheduler';
import { ErrorReporter, InstanceSettings, Tracing } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { EventService } from '@/events/event.service';
import type {
	SystemTaskMode,
	SystemTaskSkipReason,
} from '@/events/maps/system-task-metrics.event-map';

import { DurableScheduler } from '../durable-scheduler';
import { emitSystemTaskMetric } from './emit-system-task-metric';
import { SystemTaskHandler } from './system-task-handler';
import { SystemTaskJobRegistrar } from './system-task-job-registrar';
import { observeSystemTaskRun } from './system-task-run-observer';
import { SystemTaskScheduledJobOwner } from './system-task-scheduled-job-owner';
import { SystemTaskTimer } from './system-task-timer';
import { systemTaskType } from './system-task-type';

/**
 * Longest retry delay whose millisecond value still fits the signed 32-bit
 * range a timeout honors. Node fires anything outside it after about 1 ms.
 */
const MAX_RETRY_DELAY_SECONDS = Math.floor((2 ** 31 - 1) / Time.seconds.toMilliseconds);

type InFlightRun = {
	promise: Promise<void>;
	skipWarned: boolean;
};

type ClusterPlacement = Extract<SystemTaskPlacement, { scope: 'cluster' }>;

type RoutedTask = {
	task: SystemTask;
	placement: SystemTaskPlacement;
	schedule: SystemTaskSchedule;
	timer?: SystemTaskTimer;
	inFlightRun?: InFlightRun;
	retryTimer?: NodeJS.Timeout;
};

type TimerTask = RoutedTask & { timer: SystemTaskTimer };

type ClusterTimerTask = TimerTask & { placement: ClusterPlacement };

/**
 * The single owner of the system tasks' run loop: it consumes the registry and
 * routes each task to the mode it runs in.
 *
 * - A task marked durable, on a main with the durable scheduler and its
 *   system-task flag on, is handed to the database-backed queue: it gets a
 *   {@link SystemTaskHandler} registered under its task type, so occurrences
 *   claimed for that type are dispatched to it.
 * - An instance-scoped task runs from an in-memory timer in every eligible
 *   instance, with no coordination at all: the work reads state local to the
 *   instance, so leadership and claiming are meaningless for it.
 * - Every other task runs from an in-memory timer on the leader.
 */
@Service()
export class SystemTaskRunner {
	private readonly routedTasksByName = new Map<string, RoutedTask>();

	/**
	 * Every name seen, routed or not. A task dropped on this kind of instance
	 * still claims its name, or two tasks could share one across instance kinds.
	 */
	private readonly registeredNames = new Set<string>();

	private readonly logger: Logger;

	private initialized = false;

	private clusterInitialized = false;

	private timersStarted = false;

	private instanceTimersStarted = false;

	/**
	 * Bumped on every start and stop of the timers. A stop awaits the in-flight
	 * runs, so a takeover can start the timers again before that await returns;
	 * the generation tells the returning stop that it no longer speaks for the
	 * timers.
	 */
	private timerGeneration = 0;

	private isShuttingDown = false;

	private inMemoryRunsController = new AbortController();

	private readonly shutdownController = new AbortController();

	constructor(
		logger: Logger,
		private readonly metadata: SystemTaskMetadata,
		private readonly durableScheduler: DurableScheduler,
		private readonly jobRegistrar: SystemTaskJobRegistrar,
		private readonly systemTaskOwner: SystemTaskScheduledJobOwner,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly errorReporter: ErrorReporter,
		private readonly eventService: EventService,
		private readonly tracing: Tracing,
	) {
		this.logger = logger.scoped('system-tasks');
	}

	/**
	 * Take ownership of the registry: route every task registered so far and
	 * every one registered later, then start the timers of the instance-scoped
	 * tasks. Runs in every instance, whatever its type and whether or not it has
	 * a role, so an instance-scoped task runs where its state lives.
	 */
	initPerInstance(): void {
		if (this.initialized) return;
		this.initialized = true;

		this.metadata.subscribe((taskClass) => this.route(taskClass));

		this.startInstanceTimers();
	}

	/**
	 * Take ownership of the cluster-scoped tasks: start their in-memory timers if
	 * this instance is already the leader, provision the durable jobs and remove
	 * the stale ones. Later leadership changes arrive through {@link startTimers}
	 * and {@link stopTimers}.
	 *
	 * Takes ownership of the registry first, if nothing did yet.
	 *
	 * Only a main instance may call this. `removeStale` deletes the stored jobs of
	 * every task this instance does not run durably, so on a worker it would wipe
	 * the cluster's durable jobs.
	 */
	async initCluster(): Promise<void> {
		strict(this.instanceSettings.instanceType === 'main', 'Only a main runs the cluster tasks');
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		this.initPerInstance();

		if (this.clusterInitialized) return;
		this.clusterInitialized = true;

		if (this.instanceSettings.isLeader) {
			this.startTimers();
		}

		for (const { task } of this.durableTasks()) {
			await this.jobRegistrar.provision(task);
		}
		await this.jobRegistrar.removeStale();
	}

	/**
	 * Start the timers of the instance-scoped tasks routed so far. Idempotent, and
	 * never stopped by a leadership change: only shutdown stops them.
	 */
	private startInstanceTimers(): void {
		if (this.isShuttingDown) return;
		this.instanceTimersStarted = true;
		const from = new Date();
		const timers = this.instanceTimers();
		for (const routed of timers) {
			routed.timer.start(from);
		}
		this.logger.debug('Started the per-instance system task timers', { count: timers.length });
	}

	/**
	 * Start the leader-gated in-memory timers of this instance. Does nothing
	 * before {@link initCluster}, which starts them itself when this instance
	 * already leads. An earlier takeover has no routed task to start, and marking
	 * the timers started would skip the real start.
	 */
	@OnLeaderTakeover()
	startTimers(): void {
		if (this.clusterInitialized && !this.isShuttingDown && !this.timersStarted) {
			this.timersStarted = true;
			this.timerGeneration++;
			this.inMemoryRunsController = new AbortController();
			emitSystemTaskMetric(this.eventService, 'system-task-timers-started', {});
			const from = new Date();
			const clusterTimers = this.clusterTimers();
			for (const routed of clusterTimers) {
				routed.timer.start(from);
				if (routed.placement.runOnTakeover) {
					void this.run(routed);
				}
			}
			this.logger.debug('Started the in-memory system task timers', {
				count: clusterTimers.length,
			});
		}
	}

	@OnLeaderStepdown()
	async stopTimers(): Promise<void> {
		const generation = ++this.timerGeneration;
		this.timersStarted = false;
		this.inMemoryRunsController.abort();
		for (const routed of this.clusterTimers()) {
			routed.timer.stop();
			clearTimeout(routed.retryTimer);
			routed.retryTimer = undefined;
		}
		this.logger.debug('Stopped the in-memory system task timers');
		await Promise.all(this.inFlightRuns(this.clusterTimers()));
		if (generation === this.timerGeneration) {
			emitSystemTaskMetric(this.eventService, 'system-task-timers-stopped', {});
		}
	}

	/** The leader-gated timers, which a leadership change starts and stops. */
	private clusterTimers(): ClusterTimerTask[] {
		return this.timers().filter(
			(routed): routed is ClusterTimerTask => routed.placement.scope === 'cluster',
		);
	}

	/** The per-instance timers, which only shutdown stops. */
	private instanceTimers(): TimerTask[] {
		return this.timers().filter((routed) => routed.placement.scope === 'instance');
	}

	private timers(): TimerTask[] {
		return [...this.routedTasksByName.values()].filter(
			(routed): routed is TimerTask => routed.timer !== undefined,
		);
	}

	private durableTasks(): RoutedTask[] {
		return [...this.routedTasksByName.values()].filter(
			(routed) => routed.placement.scope === 'cluster' && this.runsDurably(routed.placement),
		);
	}

	private inFlightRuns(routed: RoutedTask[]): Array<Promise<void>> {
		return routed.flatMap(({ inFlightRun }) => (inFlightRun ? [inFlightRun.promise] : []));
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		this.shutdownController.abort();
		this.instanceTimersStarted = false;
		const instanceTimers = this.instanceTimers();
		for (const routed of instanceTimers) {
			routed.timer.stop();
			clearTimeout(routed.retryTimer);
			routed.retryTimer = undefined;
		}
		await this.stopTimers();
		await Promise.all(this.inFlightRuns(instanceTimers));
	}

	/**
	 * Resolve a registered class and give its task a mode. Resolving eagerly is
	 * safe: `@SystemTask()` makes the class injectable at declaration, before
	 * anything can register it, and the name and schedule the routing needs live
	 * on the instance.
	 *
	 * @throws {UnexpectedError} When a name is registered more than once, whether
	 * by two tasks claiming it or by one task being registered twice. It surfaces
	 * out of {@link initPerInstance} for a task registered before it, and out of the
	 * `SystemTaskMetadata.register` call for one registered after. Either way the
	 * runner is left half-routed and startup fails, which is the point: a
	 * duplicate name is a coding mistake.
	 *
	 * @throws {UnexpectedError} When a task declares a `retryDelaySeconds` that is
	 * not an integer between 1 and {@link MAX_RETRY_DELAY_SECONDS}. A timeout would
	 * silently turn such a delay into an immediate retry.
	 *
	 * @throws {UnexpectedError} When a task declares a `maxAttempts` or
	 * `misfireGraceSeconds` the scheduler cannot store.
	 */
	private route(taskClass: SystemTaskClass): void {
		// The name and placement live on the instance, so a task this instance drops is resolved too.
		const task = Container.get(taskClass);

		if (this.registeredNames.has(task.name)) {
			throw new UnexpectedError('A system task name is registered more than once', {
				extra: { name: task.name },
			});
		}
		this.registeredNames.add(task.name);

		const { placement } = task;
		if (!runsOn(placement, this.instanceSettings.instanceType)) {
			this.logger.debug('System task does not run on this kind of instance', {
				name: task.name,
				placement,
			});
			return;
		}

		const { retryDelaySeconds } = task;
		if (
			retryDelaySeconds !== undefined &&
			(!Number.isInteger(retryDelaySeconds) ||
				retryDelaySeconds < 1 ||
				retryDelaySeconds > MAX_RETRY_DELAY_SECONDS)
		) {
			throw new UnexpectedError('A system task declares an out-of-range retry delay', {
				extra: { name: task.name, retryDelaySeconds },
			});
		}

		resolveSystemTaskRunOptions(task);

		const routed: RoutedTask = {
			task,
			placement,
			schedule: resolveSystemTaskSchedule(task),
		};
		this.routedTasksByName.set(task.name, routed);
		const intervalSeconds =
			routed.schedule.kind === 'interval' ? routed.schedule.intervalSeconds : undefined;

		if (placement.scope === 'instance') {
			routed.timer = this.createTimer(routed);
			this.logger.debug('System task will run on a per-instance timer', {
				name: task.name,
				schedule: routed.schedule,
			});
			emitSystemTaskMetric(this.eventService, 'system-task-routed', {
				name: task.name,
				mode: 'instance_timer',
				intervalSeconds,
			});

			if (this.instanceTimersStarted) {
				routed.timer.start(new Date());
			}
		} else if (this.runsDurably(placement)) {
			this.systemTaskOwner.declareDurable(task.name);
			this.durableScheduler.registerTaskHandler(
				systemTaskType(task.name),
				new SystemTaskHandler(
					task,
					this.shutdownController.signal,
					this.logger,
					this.eventService,
					this.tracing,
					(error) => this.reportFailure('A durable system task run failed', task, error),
				),
			);
			this.logger.debug('System task will run on the durable scheduler', { name: task.name });
			emitSystemTaskMetric(this.eventService, 'system-task-routed', {
				name: task.name,
				mode: 'durable',
				intervalSeconds,
			});
		} else {
			routed.timer = this.createTimer(routed);
			this.logger.debug('System task will run on an in-memory timer', {
				name: task.name,
				schedule: routed.schedule,
			});
			emitSystemTaskMetric(this.eventService, 'system-task-routed', {
				name: task.name,
				mode: 'leader_timer',
				intervalSeconds,
			});

			if (this.timersStarted) {
				routed.timer.start(new Date());
				if (placement.runOnTakeover) {
					void this.run(routed);
				}
			}
		}
	}

	private runsDurably(placement: ClusterPlacement): boolean {
		return (
			placement.durable &&
			this.globalConfig.scheduler.enabledForSystemTasks &&
			this.durableScheduler.isActive()
		);
	}

	private createTimer(routed: RoutedTask): SystemTaskTimer {
		const { task } = routed;
		const schedule = scheduleFromDefinition(routed.schedule, this.globalConfig.generic.timezone);

		return new SystemTaskTimer(
			schedule,
			(lagMs, coalesced) => {
				emitSystemTaskMetric(this.eventService, 'system-task-fired', { name: task.name, lagMs });
				if (coalesced > 0) {
					this.emitSkipped(task, 'coalesced', coalesced);
				}
				void this.run(routed);
			},
			(error) => {
				this.reportFailure(
					'Could not plan a system task schedule, so the task will not run',
					task,
					error,
				);
				emitSystemTaskMetric(this.eventService, 'system-task-scheduling-failed', {
					name: task.name,
					mode: timerMode(routed),
				});
			},
			(fireAt) => {
				emitSystemTaskMetric(this.eventService, 'system-task-next-run-planned', {
					name: task.name,
					nextRunAtMs: fireAt.getTime(),
				});
			},
		);
	}

	/**
	 * Run one occurrence in memory, at most one at a time per task: a run that
	 * outlasts its own cadence skips the next occurrence instead of overlapping
	 * itself.
	 */
	private async run(routed: RoutedTask): Promise<void> {
		const { task } = routed;

		if (routed.inFlightRun) {
			if (!routed.inFlightRun.skipWarned) {
				routed.inFlightRun.skipWarned = true;
				this.logger.warn('Skipped a system task occurrence, its previous run is still going', {
					name: task.name,
				});
			}
			this.emitSkipped(task, 'overlap');
		} else {
			// A newer occurrence runs the same work, so it supersedes a pending retry.
			clearTimeout(routed.retryTimer);
			routed.retryTimer = undefined;

			const inFlightRun: InFlightRun = {
				promise: this.runOnce(routed).finally(() => {
					if (routed.inFlightRun === inFlightRun) {
						routed.inFlightRun = undefined;
					}
				}),
				skipWarned: false,
			};
			routed.inFlightRun = inFlightRun;

			await inFlightRun.promise;
		}
	}

	private async runOnce(routed: RoutedTask): Promise<void> {
		const { task, placement } = routed;
		if (
			placement.scope === 'cluster' &&
			placement.durable &&
			(await this.jobRegistrar.isProvisioned(task.name))
		) {
			this.logger.debug('Skipped an in-memory system task run, its durable job is provisioned', {
				name: task.name,
			});
			this.emitSkipped(task, 'provisioned_elsewhere');
			return;
		}

		// An instance-scoped run outlives a stepdown, so only shutdown aborts it.
		const { signal } =
			placement.scope === 'instance' ? this.shutdownController : this.inMemoryRunsController;
		if (signal.aborted) {
			this.emitSkipped(task, 'aborted');
			return;
		}
		const outcome = await observeSystemTaskRun(
			this.eventService,
			this.tracing,
			task,
			timerMode(routed),
			signal,
		);
		if (outcome.result === 'failure') {
			this.reportFailure('A system task run failed', task, outcome.error);
			this.scheduleRetry(routed);
		}
	}

	private scheduleRetry(routed: RoutedTask): void {
		const { retryDelaySeconds, effects } = routed.task;
		const timersRunning =
			routed.placement.scope === 'instance' ? this.instanceTimersStarted : this.timersStarted;
		if (retryDelaySeconds === undefined || effects === 'non-idempotent' || !timersRunning) {
			return;
		}

		clearTimeout(routed.retryTimer);
		routed.retryTimer = setTimeout(() => {
			void this.run(routed);
		}, retryDelaySeconds * Time.seconds.toMilliseconds);
		routed.retryTimer.unref();
		emitSystemTaskMetric(this.eventService, 'system-task-retry-scheduled', {
			name: routed.task.name,
		});
	}

	private emitSkipped(
		task: Pick<SystemTask, 'name'>,
		reason: SystemTaskSkipReason,
		count?: number,
	): void {
		emitSystemTaskMetric(this.eventService, 'system-task-run-skipped', {
			name: task.name,
			reason,
			...(count === undefined ? {} : { count }),
		});
	}

	private reportFailure(message: string, task: Pick<SystemTask, 'name'>, error: unknown): void {
		this.logger.error(message, { name: task.name, error });
		this.errorReporter.error(error, {
			extra: { systemTask: task.name },
			shouldBeLogged: false,
			shouldIsolate: true,
		});
	}
}

/** A cluster-scoped task belongs to the mains, an instance-scoped one to the kinds it names. */
function runsOn(placement: SystemTaskPlacement, instanceType: InstanceType): boolean {
	return placement.scope === 'cluster'
		? instanceType === 'main'
		: placement.instanceTypes.includes(instanceType);
}

/** The metrics mode of a task that runs from a timer, by the timer's scope. */
function timerMode(routed: Pick<RoutedTask, 'placement'>): SystemTaskMode {
	return routed.placement.scope === 'instance' ? 'instance_timer' : 'leader_timer';
}
