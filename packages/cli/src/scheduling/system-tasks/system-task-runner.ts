import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { SystemTask, SystemTaskClass } from '@n8n/decorators';
import {
	OnLeaderStepdown,
	OnLeaderTakeover,
	OnShutdown,
	resolveSystemTaskRunOptions,
	SystemTaskMetadata,
} from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { scheduleFromDefinition } from '@n8n/scheduler';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import { DurableScheduler } from '../durable-scheduler';
import { SystemTaskHandler } from './system-task-handler';
import { systemTaskProvisionRequest } from './system-task-job';
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

type RoutedTask = {
	task: SystemTask;
	timer?: SystemTaskTimer;
	inFlightRun?: InFlightRun;
	retryTimer?: NodeJS.Timeout;
};

/**
 * The single owner of the system tasks' run loop: it consumes the registry and
 * routes each task to the mode it runs in.
 *
 * - A task marked durable, on a main with the durable scheduler and its
 *   system-task flag on, is handed to the database-backed queue: it gets a
 *   {@link SystemTaskHandler} registered under its task type, so occurrences
 *   claimed for that type are dispatched to it.
 * - Every other task runs from an in-memory timer on the leader.
 */
@Service()
export class SystemTaskRunner {
	private readonly routedTasksByName = new Map<string, RoutedTask>();

	private readonly logger: Logger;

	private initialized = false;

	private timersStarted = false;

	private isShuttingDown = false;

	private inMemoryRunsController = new AbortController();

	private readonly shutdownController = new AbortController();

	constructor(
		logger: Logger,
		private readonly metadata: SystemTaskMetadata,
		private readonly durableScheduler: DurableScheduler,
		private readonly durableJobProvisioner: DurableJobProvisioner,
		private readonly systemTaskOwner: SystemTaskScheduledJobOwner,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('system-tasks');
	}

	/**
	 * Take ownership of the registry: route every task registered so far and
	 * every one registered later, start the in-memory timers if this instance is
	 * already the leader, and provision the durable jobs. Later leadership
	 * changes arrive through {@link startTimers} and {@link stopTimers}.
	 */
	async init(): Promise<void> {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (!this.initialized) {
			this.initialized = true;

			this.metadata.subscribe((taskClass) => this.route(taskClass));

			if (this.instanceSettings.isLeader) {
				this.startTimers();
			}

			for (const routed of this.durableTasks()) {
				await this.provisionOne(routed);
			}
		}
	}

	/** Never throws: one task that cannot be provisioned must not stop the rest. */
	private async provisionOne({ task }: RoutedTask): Promise<void> {
		try {
			const summary = await this.durableJobProvisioner.provision(
				systemTaskProvisionRequest(
					task,
					this.systemTaskOwner,
					this.globalConfig.generic.timezone,
					new Date(),
				),
			);
			this.logger.debug('Provisioned the durable job of a system task', {
				name: task.name,
				inserted: summary.inserted.length,
				redefined: summary.redefined.length,
				unchanged: summary.unchanged.length,
				removed: summary.removed.length,
			});
		} catch (error) {
			this.reportFailure(
				'Could not provision a durable system task, so it will not run',
				task,
				error,
			);
		}
	}

	@OnLeaderTakeover()
	startTimers(): void {
		if (!this.isShuttingDown && !this.timersStarted) {
			this.timersStarted = true;
			this.inMemoryRunsController = new AbortController();
			const from = new Date();
			const inMemoryTasks = this.inMemoryTasks();
			for (const routed of inMemoryTasks) {
				routed.timer.start(from);
				if (routed.task.runOnTakeover) {
					void this.run(routed);
				}
			}
			this.logger.debug('Started the in-memory system task timers', {
				count: inMemoryTasks.length,
			});
		}
	}

	@OnLeaderStepdown()
	async stopTimers(): Promise<void> {
		this.timersStarted = false;
		this.inMemoryRunsController.abort();
		for (const routed of this.inMemoryTasks()) {
			routed.timer.stop();
			clearTimeout(routed.retryTimer);
			routed.retryTimer = undefined;
		}
		this.logger.debug('Stopped the in-memory system task timers');
		await Promise.all(this.inFlightRuns());
	}

	private inMemoryTasks(): Array<RoutedTask & { timer: SystemTaskTimer }> {
		return [...this.routedTasksByName.values()].filter(
			(routed): routed is RoutedTask & { timer: SystemTaskTimer } => routed.timer !== undefined,
		);
	}

	private durableTasks(): RoutedTask[] {
		return [...this.routedTasksByName.values()].filter((routed) => this.runsDurably(routed.task));
	}

	private inFlightRuns(): Array<Promise<void>> {
		return [...this.routedTasksByName.values()].flatMap(({ inFlightRun }) =>
			inFlightRun ? [inFlightRun.promise] : [],
		);
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		this.shutdownController.abort();
		await this.stopTimers();
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
		const task = Container.get(taskClass);

		if (this.routedTasksByName.has(task.name)) {
			throw new UnexpectedError('A system task name is registered more than once', {
				extra: { name: task.name },
			});
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

		const routed: RoutedTask = { task };
		this.routedTasksByName.set(task.name, routed);

		if (this.runsDurably(task)) {
			this.durableScheduler.registerTaskHandler(
				systemTaskType(task.name),
				new SystemTaskHandler(task, this.shutdownController.signal, this.logger, (error) =>
					this.reportFailure('A durable system task run failed', task, error),
				),
			);
			this.logger.debug('System task will run on the durable scheduler', { name: task.name });
		} else {
			routed.timer = this.createTimer(routed);
			this.logger.debug('System task will run on an in-memory timer', { name: task.name });

			if (this.timersStarted) {
				routed.timer.start(new Date());
				if (task.runOnTakeover) {
					void this.run(routed);
				}
			}
		}
	}

	private runsDurably(task: SystemTask): boolean {
		return (
			task.durable &&
			this.globalConfig.scheduler.enabledForSystemTasks &&
			this.durableScheduler.isActive()
		);
	}

	private createTimer(routed: RoutedTask): SystemTaskTimer {
		const { task } = routed;
		const schedule = scheduleFromDefinition(task.schedule, this.globalConfig.generic.timezone);

		return new SystemTaskTimer(
			schedule,
			() => {
				void this.run(routed);
			},
			(error) =>
				this.reportFailure(
					'Could not plan a system task schedule, so the task will not run',
					task,
					error,
				),
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
		const { signal } = this.inMemoryRunsController;
		try {
			await routed.task.run(signal);
		} catch (error) {
			// A rejection after the run's signal aborted is the task honoring the
			// abort, not a failure.
			if (!signal.aborted) {
				this.reportFailure('A system task run failed', routed.task, error);
				this.scheduleRetry(routed);
			}
		}
	}

	private scheduleRetry(routed: RoutedTask): void {
		const { retryDelaySeconds, effects } = routed.task;
		if (retryDelaySeconds === undefined || effects === 'non-idempotent' || !this.timersStarted) {
			return;
		}

		clearTimeout(routed.retryTimer);
		routed.retryTimer = setTimeout(() => {
			void this.run(routed);
		}, retryDelaySeconds * Time.seconds.toMilliseconds);
		routed.retryTimer.unref();
	}

	private reportFailure(message: string, task: SystemTask, error: unknown): void {
		this.logger.error(message, { name: task.name, error });
		this.errorReporter.error(error, {
			extra: { systemTask: task.name },
			shouldBeLogged: false,
			shouldIsolate: true,
		});
	}
}
