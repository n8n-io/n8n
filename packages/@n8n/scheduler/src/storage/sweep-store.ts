import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import { entityToScheduledJob } from './mappers';
import type { DueJobs, PlannedJob, RunInTransaction, SweepTransaction } from '../core/sweep';

/**
 * The database-backed {@link SweepTransaction}:
 * the sweep's claim / record / advance steps bound to one transaction's `EntityManager`.
 */
class DatabaseSweepTransaction implements SweepTransaction {
	constructor(
		private readonly manager: EntityManager,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly logger: Logger,
		private readonly instanceTimezone: string,
	) {}

	async claimDueJobs(limit: number): Promise<DueJobs | undefined> {
		const claimed = await this.jobs.claimDue(this.manager, limit);
		if (claimed === undefined) {
			return undefined;
		}
		return {
			now: claimed.now,
			jobs: claimed.jobs.map((entity) => entityToScheduledJob(entity, this.instanceTimezone)),
		};
	}

	async recordOccurrences(planned: PlannedJob[]): Promise<number> {
		const occurrences = planned.flatMap(({ job, plan }) =>
			plan.occurrences.map((when) => ({
				jobId: Number(job.id),
				taskType: job.taskType,
				payload: job.payload,
				scheduledFor: when,
				runAt: when,
				maxAttempts: job.maxAttempts,
			})),
		);
		const recorded = await this.tasks.insertIgnoringDuplicates(this.manager, occurrences);

		if (recorded < occurrences.length) {
			this.logger.debug('Sweep skipped occurrences that were already recorded', {
				jobs: planned.length,
				planned: occurrences.length,
				recorded,
			});
		}

		return recorded;
	}

	async advanceJobs(planned: PlannedJob[]): Promise<void> {
		await this.jobs.advanceMany(
			this.manager,
			planned.map(({ job, plan }) => ({
				id: Number(job.id),
				nextRunAt: plan.nextRunAt,
				lastFiredAt: plan.lastFiredAt,
			})),
		);
	}
}

/**
 * It runs each sweep in one database transaction
 * and hands the pure algorithm a {@link DatabaseSweepTransaction} bound to it.
 * This is the only seam between the sweep and the database.
 */
@Service()
export class SweepStore {
	constructor(
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

	readonly runInTransaction: RunInTransaction = async (work) =>
		await this.dataSource.transaction(
			async (manager) =>
				await work(
					new DatabaseSweepTransaction(
						manager,
						this.jobs,
						this.tasks,
						this.logger,
						this.globalConfig.generic.timezone,
					),
				),
		);
}
