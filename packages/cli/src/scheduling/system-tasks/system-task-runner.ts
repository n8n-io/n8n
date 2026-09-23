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
import { ErrorReporter, InstanceSettings, Tracing } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { EventService } from '@/events/event.service';

import { DurableScheduler } from '../durable-scheduler';
import { emitSystemTaskMetric } from './emit-system-task-metric';
import { SystemTaskHandler } from './system-task-handler';
import { SystemTaskJobRegistrar } from './system-task-job-registrar';
import { SystemTaskScheduledJobOwner } from './system-task-scheduled-job-owner';
import { InMemorySystemTaskRunner } from './in-memory-system-task-runner';
import { systemTaskType } from './system-task-type';

/**
 * Longest retry delay whose millisecond value still fits the signed 32-bit
 * range a timeout honors. Node fires anything outside it after about 1 ms.
 */
const MAX_RETRY_DELAY_SECONDS = Math.floor((2 ** 31 - 1) / Time.seconds.toMilliseconds);

type ClusterPlacement = Extract<SystemTaskPlacement, { scope: 'cluster' }>;

/**
 * The single owner of the system tasks' run loop: it consumes the registry and
 * routes each task to the mode it runs in.
 *
 * - A task marked durable, on a main with the durable scheduler and its
 *   system-task flag on, is handed to the database-backed queue: it gets a
 *   {@link SystemTaskHandler} registered under its task type, so occurrences
 *   claimed for that type are dispatched to it.
 * - An instance-scoped task joins the in-memory timers that run in every
 *   eligible instance, with no coordination at all: the work reads state local
 *   to the instance, so leadership and claiming are meaningless for it.
 * - Every other task joins the in-memory timers the leader runs.
 *
 * Each {@link InMemorySystemTaskRunner} owns its timers, its runs and its
 * retries. This class only picks the one a task joins, and starts and stops
 * each one.
 */
@Service()
export class SystemTaskRunner {
	/**
	 * Every name seen, routed or not. A task dropped on this kind of instance
	 * still claims its name, or two tasks could share one across instance kinds.
	 */
	private readonly registeredNames = new Set<string>();

	/** The tasks this instance provisions durable jobs for, in registration order. */
	private readonly durableTasks: SystemTask[] = [];

	private readonly logger: Logger;

	/** Runs while this instance leads. */
	private readonly leaderTimers: InMemorySystemTaskRunner;

	/** Runs from {@link init} until shutdown. Leadership does not change it. */
	private readonly instanceTimers: InMemorySystemTaskRunner;

	private initialized = false;

	private isShuttingDown = false;

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
		const { timezone } = globalConfig.generic;
		const reportFailure = this.reportFailure.bind(this);
		this.leaderTimers = new InMemorySystemTaskRunner(
			'leader_timer',
			this.logger,
			eventService,
			tracing,
			timezone,
			{
				reportFailure,
				onStart: () => emitSystemTaskMetric(eventService, 'system-task-timers-started', {}),
				onStop: () => emitSystemTaskMetric(eventService, 'system-task-timers-stopped', {}),
			},
		);
		this.instanceTimers = new InMemorySystemTaskRunner(
			'instance_timer',
			this.logger,
			eventService,
			tracing,
			timezone,
			{ reportFailure },
		);
	}

	/**
	 * Take ownership of the registry: route every task registered so far and
	 * every one registered later. The per-instance timers start first, in every
	 * kind of instance, so an instance-scoped task runs where its state lives.
	 * On a main, also take ownership of the cluster-scoped tasks: start the
	 * leader timers if this instance already leads, provision the durable jobs
	 * and remove the stale ones. Later leadership changes arrive through
	 * {@link startTimers} and {@link stopTimers}.
	 *
	 * Only a main touches the durable jobs: `removeStale` deletes the stored jobs
	 * of every task this instance does not run durably, so on a worker it would
	 * wipe the cluster's durable jobs.
	 */
	async init(): Promise<void> {
		if (this.initialized) return;
		const isMain = this.instanceSettings.instanceType === 'main';
		if (isMain) {
			strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');
		}
		this.initialized = true;

		this.instanceTimers.start(new Date());
		this.metadata.subscribe((taskClass) => this.route(taskClass));

		if (isMain) {
			if (this.instanceSettings.isLeader) {
				this.startTimers();
			}

			for (const task of this.durableTasks) {
				await this.jobRegistrar.provision(task);
			}
			await this.jobRegistrar.removeStale();
		}
	}

	/**
	 * Start the leader-gated in-memory timers of this instance. Does nothing
	 * before {@link init}, which starts them itself when this instance already
	 * leads. An earlier takeover has no routed task to start, and a start now
	 * would make the real start do nothing.
	 */
	@OnLeaderTakeover()
	startTimers(): void {
		if (!this.initialized || this.isShuttingDown) return;

		this.leaderTimers.start(new Date());
	}

	@OnLeaderStepdown()
	async stopTimers(): Promise<void> {
		await this.leaderTimers.stop();
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		this.shutdownController.abort();
		await Promise.all([this.instanceTimers.stop(), this.stopTimers()]);
	}

	/**
	 * Resolve a registered class and give its task a mode. Resolving eagerly is
	 * safe: `@SystemTask()` makes the class injectable at declaration, before
	 * anything can register it, and the name and schedule the routing needs live
	 * on the instance.
	 *
	 * @throws {UnexpectedError} When a name is registered more than once, whether
	 * by two tasks claiming it or by one task being registered twice. It surfaces
	 * out of {@link init} for a task registered before it, and out of the
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
		const schedule = resolveSystemTaskSchedule(task);

		if (placement.scope === 'instance') {
			this.logger.debug('System task will run on a per-instance timer', {
				name: task.name,
				schedule,
			});
			this.instanceTimers.add(task, schedule);
		} else if (this.runsDurably(placement)) {
			this.handOverToDurableScheduler(task, schedule);
		} else {
			this.logger.debug('System task will run on an in-memory timer', {
				name: task.name,
				schedule,
			});
			this.leaderTimers.add(task, schedule, {
				runOnStart: placement.runOnTakeover,
				// Another main can already run this task on the durable scheduler.
				// Skip the in-memory run while that job is stored.
				shouldSkipRun: placement.durable
					? async () => await this.isProvisionedElsewhere(task)
					: undefined,
			});
		}
	}

	private handOverToDurableScheduler(task: SystemTask, schedule: SystemTaskSchedule): void {
		this.durableTasks.push(task);
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
			intervalSeconds: schedule.kind === 'interval' ? schedule.intervalSeconds : undefined,
		});
	}

	private async isProvisionedElsewhere(task: SystemTask): Promise<boolean> {
		if (!(await this.jobRegistrar.isProvisioned(task.name))) return false;

		this.logger.debug('Skipped an in-memory system task run, its durable job is provisioned', {
			name: task.name,
		});
		emitSystemTaskMetric(this.eventService, 'system-task-run-skipped', {
			name: task.name,
			reason: 'provisioned_elsewhere',
		});
		return true;
	}

	private runsDurably(placement: ClusterPlacement): boolean {
		return (
			placement.durable &&
			this.globalConfig.scheduler.enabledForSystemTasks &&
			this.durableScheduler.isActive()
		);
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
