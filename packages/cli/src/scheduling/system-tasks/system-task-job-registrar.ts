import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { ScheduledJob } from '@n8n/db';
import { ScheduledJobRepository } from '@n8n/db';
import type { SystemTask } from '@n8n/decorators';
import { resolveSystemTaskRunOptions, resolveSystemTaskSchedule } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { computeFirstRunAt, scheduleFromDefinition } from '@n8n/scheduler';
import { ErrorReporter } from 'n8n-core';

import { EventService } from '@/events/event.service';

import { DurableJobProvisioner } from '../durable-job-provisioner';
import type { ProvisionRequest } from '../durable-job-provisioner';
import { emitSystemTaskMetric } from './emit-system-task-metric';
import { SystemTaskScheduledJobOwner } from './system-task-scheduled-job-owner';
import { systemTaskType } from './system-task-type';
import { versionStamp } from './system-task-version-stamp';

/** A system task's stored job as listed, pinned to the payload read at the time. */
export type StaleSystemTaskJob = Pick<ScheduledJob, 'id' | 'ownerId' | 'payload'>;

/**
 * The one durable job a system task owns, ready to provision. The schedule is
 * stored as declared, so `defaultTimezone` seeds the first run only: baking it
 * into the row would redefine every task whenever the instance timezone changes.
 */
export function systemTaskProvisionRequest(
	task: SystemTask,
	systemTaskOwner: SystemTaskScheduledJobOwner,
	defaultTimezone: string,
	now: Date,
): ProvisionRequest {
	const schedule = resolveSystemTaskSchedule(task);
	const firstRunAt = computeFirstRunAt(scheduleFromDefinition(schedule, defaultTimezone), now);
	const name = systemTaskType(task.name);
	const { misfirePolicy, misfireGraceSeconds, maxAttempts } = resolveSystemTaskRunOptions(task);

	return {
		owner: systemTaskOwner.owner(task.name),
		taskType: name,
		payload: versionStamp(),
		desired: [{ name, schedule, firstRunAt }],
		misfirePolicy,
		misfireGraceSeconds,
		maxAttempts,
	};
}

/**
 * Writes and removes the `scheduled_job` rows of system tasks: one row per task
 * this instance runs durably, and at startup the rows of every task it does not.
 */
@Service()
export class SystemTaskJobRegistrar {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly scheduledJobRepository: ScheduledJobRepository,
		private readonly durableJobProvisioner: DurableJobProvisioner,
		private readonly systemTaskOwner: SystemTaskScheduledJobOwner,
		private readonly globalConfig: GlobalConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly eventService: EventService,
	) {
		this.logger = logger.scoped('system-tasks');
	}

	/** Never throws: one task that cannot be provisioned must not stop the rest. */
	async provision(task: SystemTask): Promise<void> {
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
				task.name,
				error,
			);
			emitSystemTaskMetric(this.eventService, 'system-task-scheduling-failed', {
				name: task.name,
				mode: 'durable',
			});
		}
	}

	/**
	 * Delete the stored jobs of the system tasks this instance does not run
	 * durably, unless a newer version wrote them or restamped them since the
	 * listing. Never throws: a stale row must not stop startup.
	 */
	async removeStale(): Promise<void> {
		const stale = await this.findStale().catch((error: unknown) => {
			this.logger.error('Could not list the durable system task jobs, so stale ones stay', {
				error,
			});
			this.errorReporter.error(error, { shouldBeLogged: false, shouldIsolate: true });
			return [];
		});
		for (const job of stale) {
			await this.remove(job);
		}
	}

	/** Never throws: one job that cannot be removed must not stop the rest. */
	private async remove({ id, ownerId: name, payload }: StaleSystemTaskJob): Promise<void> {
		try {
			const { removed } = await this.durableJobProvisioner.deprovisionUnchangedJob({ id, payload });
			if (removed > 0) {
				this.logger.info('Removed the stale durable job of a system task', { name });
			} else {
				this.logger.debug('Found no durable job to remove for a stale system task', { name });
			}
		} catch (error) {
			this.reportFailure('Could not remove the stale durable job of a system task', name, error);
		}
	}

	/**
	 * Whether any instance stored a durable job for the task that the scheduler
	 * will claim. Never throws: a store this instance cannot read must not
	 * silence the task's in-memory timer.
	 */
	async isProvisioned(taskName: string): Promise<boolean> {
		try {
			return await this.scheduledJobRepository.existsRunnableByOwner(
				this.systemTaskOwner.owner(taskName),
			);
		} catch (error) {
			this.logger.warn('Could not check for the durable job of a system task, so it runs', {
				name: taskName,
				error,
			});
			emitSystemTaskMetric(this.eventService, 'system-task-provision-check-failed', {
				name: taskName,
			});
			return false;
		}
	}

	/** The stored jobs this instance does not run durably and no newer version stamped, as read. */
	async findStale(): Promise<StaleSystemTaskJob[]> {
		const rows = await this.scheduledJobRepository.findPayloadsByOwnerType(
			this.systemTaskOwner.ownerType,
		);
		return rows.filter(({ ownerId, payload }) => !this.systemTaskOwner.isAlive(ownerId, payload));
	}

	private reportFailure(message: string, name: string, error: unknown): void {
		this.logger.error(message, { name, error });
		this.errorReporter.error(error, {
			extra: { systemTask: name },
			shouldBeLogged: false,
			shouldIsolate: true,
		});
	}
}
