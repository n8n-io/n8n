import { Logger } from '@n8n/backend-common';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import type {
	DueJobs,
	PlannedJob,
	RunInTransaction,
	MaterializerTransaction,
} from '../core/materializer';

/**
 * The database-backed {@link MaterializerTransaction}:
 * the materializer's claim / record / advance steps bound to one transaction's `EntityManager`.
 */
class DatabaseMaterializerTransaction implements MaterializerTransaction {
	constructor(
		private readonly manager: EntityManager,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly logger: Logger,
	) {}

	async claimDueJobs(limit: number): Promise<DueJobs | undefined> {
		return await this.jobs.claimDue(this.manager, limit);
	}

	async recordOccurrences(planned: PlannedJob[]): Promise<number> {
		const occurrences = planned.flatMap(({ job, plan }) =>
			plan.occurrences.map((when) => ({
				jobId: job.id,
				taskType: job.taskType,
				payload: job.payload,
				scheduledFor: when,
				runAt: when,
				maxAttempts: job.maxAttempts,
			})),
		);
		const recorded = await this.tasks.insertIgnoringDuplicates(this.manager, occurrences);

		if (recorded < occurrences.length) {
			this.logger.debug('Materializer skipped occurrences that were already recorded', {
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
				id: job.id,
				nextRunAt: plan.nextRunAt,
				lastFiredAt: plan.lastFiredAt,
			})),
		);
	}
}

/**
 * It runs each materialization pass in one database transaction
 * and hands the pure algorithm a {@link DatabaseMaterializerTransaction} bound to it.
 * This is the only seam between the materializer and the database.
 */
@Service()
export class MaterializerStore {
	constructor(
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly logger: Logger,
	) {}

	readonly runInTransaction: RunInTransaction = async (work) =>
		await this.dataSource.transaction(
			async (manager) =>
				await work(
					new DatabaseMaterializerTransaction(manager, this.jobs, this.tasks, this.logger),
				),
		);
}
