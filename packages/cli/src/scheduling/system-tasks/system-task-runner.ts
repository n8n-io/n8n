import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceType } from '@n8n/constants';
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
	SystemTaskMetadata,
	resolveSystemTaskSchedule,
	validateSystemTask,
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

type ClusterPlacement = Extract<SystemTaskPlacement, { scope: 'cluster' }>;

/**
 * Routes each registered system task to the durable scheduler, to the timers
 * the leader runs, or to the timers every eligible instance runs. Starts and
 * stops each set of timers.
 */
@Service()
export class SystemTaskRunner {
	/** Includes the dropped tasks, so a name stays unique across instance kinds. */
	private readonly registeredNames = new Set<string>();

	private readonly durableTasks: SystemTask[] = [];

	private readonly logger: Logger;

	private readonly leaderTaskRunner: InMemorySystemTaskRunner;

	private readonly instanceTaskRunner: InMemorySystemTaskRunner;

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
		this.leaderTaskRunner = this.createLeaderTaskRunner();
		this.instanceTaskRunner = this.createInstanceTaskRunner();
	}

	private createLeaderTaskRunner(): InMemorySystemTaskRunner {
		return new InMemorySystemTaskRunner(
			'leader_timer',
			this.logger,
			this.eventService,
			this.tracing,
			this.globalConfig.generic.timezone,
			{
				reportFailure: this.reportFailure.bind(this),
				onStart: () => emitSystemTaskMetric(this.eventService, 'system-task-timers-started', {}),
				onStop: () => emitSystemTaskMetric(this.eventService, 'system-task-timers-stopped', {}),
			},
		);
	}

	private createInstanceTaskRunner(): InMemorySystemTaskRunner {
		return new InMemorySystemTaskRunner(
			'instance_timer',
			this.logger,
			this.eventService,
			this.tracing,
			this.globalConfig.generic.timezone,
			{ reportFailure: this.reportFailure.bind(this) },
		);
	}

	/**
	 * Routes every task registered now or later and starts the timers. Only a
	 * main provisions durable jobs: on a worker, `removeStale` would delete the
	 * durable jobs of the whole cluster.
	 */
	async init(): Promise<void> {
		if (this.initialized) {
			return;
		}
		const isMain = this.instanceSettings.instanceType === 'main';
		if (isMain) {
			strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');
		}
		this.initialized = true;

		this.instanceTaskRunner.start(new Date());
		this.metadata.subscribe((taskClass) => this.route(taskClass));

		if (isMain) {
			if (this.instanceSettings.isLeader) {
				this.startLeaderTimers();
			}

			for (const task of this.durableTasks) {
				await this.jobRegistrar.provision(task);
			}
			await this.jobRegistrar.removeStale();
		}
	}

	/** Does nothing before {@link init}, which starts them itself, or during shutdown. */
	@OnLeaderTakeover()
	startLeaderTimers(): void {
		if (this.initialized && !this.isShuttingDown) {
			this.leaderTaskRunner.start(new Date());
		}
	}

	@OnLeaderStepdown()
	async stopLeaderTimers(): Promise<void> {
		await this.leaderTaskRunner.stop();
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		this.shutdownController.abort();
		await Promise.all([this.leaderTaskRunner.stop(), this.instanceTaskRunner.stop()]);
	}

	/**
	 * @throws {UnexpectedError} when a name is registered twice or a task declares
	 * an out-of-range option. Both are coding mistakes, so startup fails.
	 */
	private route(taskClass: SystemTaskClass): void {
		const task = Container.get(taskClass);

		if (this.registeredNames.has(task.name)) {
			throw new UnexpectedError('A system task name is registered more than once', {
				extra: { name: task.name },
			});
		}
		this.registeredNames.add(task.name);
		validateSystemTask(task);

		const { placement } = task;
		if (!runsOn(placement, this.instanceSettings.instanceType)) {
			this.logger.debug('System task does not run on this kind of instance', {
				name: task.name,
				placement,
			});
			return;
		}

		const schedule = resolveSystemTaskSchedule(task);

		if (placement.scope === 'instance') {
			this.logger.debug('System task will run on a per-instance timer', {
				name: task.name,
				schedule,
			});
			this.instanceTaskRunner.add(task, schedule);
		} else if (this.runsDurably(placement)) {
			this.handOverToDurableScheduler(task, schedule);
		} else {
			this.logger.debug('System task will run on an in-memory timer', {
				name: task.name,
				schedule,
			});
			this.leaderTaskRunner.add(task, schedule, {
				runOnStart: placement.runOnTakeover,
				// Another main can run this task durably. Skip while its job is stored.
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
		const provisioned = await this.jobRegistrar.isProvisioned(task.name);
		if (provisioned) {
			this.logger.debug('Skipped an in-memory system task run, its durable job is provisioned', {
				name: task.name,
			});
			emitSystemTaskMetric(this.eventService, 'system-task-run-skipped', {
				name: task.name,
				reason: 'provisioned_elsewhere',
			});
		}
		return provisioned;
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

function runsOn(placement: SystemTaskPlacement, instanceType: InstanceType): boolean {
	return placement.scope === 'cluster'
		? instanceType === 'main'
		: placement.instanceTypes.includes(instanceType);
}
