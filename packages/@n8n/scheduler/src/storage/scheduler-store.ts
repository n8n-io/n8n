import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import { entityToScheduledJob, scheduledTaskToRow } from './mappers';
import type { ScheduledJob, ScheduledTask } from '../types';

/**
 * Storage for the scheduler: the seam between the engine and persistence, backed
 * by the `ScheduledJobRepository` / `ScheduledTaskRepository`. It maps between the
 * scheduler's domain types and the `scheduled_job` / `scheduled_task` entities;
 * the repositories own the queries.
 *
 * Deliberately thin and provisional: it holds only what the schedule math and an
 * early sweep imply. The rest (claiming, leasing, fencing, retention) is added as
 * those loops are built.
 *
 * Every operation takes a caller-supplied transaction (`trx`) so the caller can
 * group several writes into one atomic unit; the store never opens its own. The
 * caller scopes it via {@link transaction}. `trx` is a TypeORM `EntityManager`, so
 * the store is coupled to TypeORM (one backend, by design).
 *
 * Locking is not here yet; it lands with the sweep/claim loop that needs it, and
 * is dialect-split: Postgres claims rows with `FOR UPDATE SKIP LOCKED` in the
 * due-jobs read, while SQLite has no equivalent and opens the transaction with
 * `BEGIN IMMEDIATE` (TypeORM's `dataSource.transaction()` only issues a deferred
 * `BEGIN`, so {@link transaction} will need a queryRunner-based variant).
 */
@Service()
export class SchedulerStore {
	constructor(
		private readonly dataSource: DataSource,
		private readonly jobRepository: ScheduledJobRepository,
		private readonly taskRepository: ScheduledTaskRepository,
	) {}

	/**
	 * Run `fn` inside a single database transaction, passing it the transaction
	 * handle to thread through the other methods.
	 */
	async transaction<T>(fn: (trx: EntityManager) => Promise<T>): Promise<T> {
		return await this.dataSource.transaction(fn);
	}

	/**
	 * Fetch enabled jobs due to fire at or before `now` (at most `limit`, ordered
	 * by `nextRunAt`).
	 */
	async getDueJobs(trx: EntityManager, now: Date, limit: number): Promise<ScheduledJob[]> {
		const rows = await this.jobRepository.findDue(trx, now, limit);
		return rows.map(entityToScheduledJob);
	}

	/** Persist a job's updated `nextRunAt` and `lastFiredAt`. */
	async saveJob(trx: EntityManager, job: ScheduledJob): Promise<void> {
		await this.jobRepository.updateSchedulingState(trx, Number(job.id), {
			nextRunAt: job.nextRunAt,
			lastFiredAt: job.lastFiredAt,
		});
	}

	/**
	 * Insert a task occurrence. Idempotent on the occurrence identity
	 * `(jobId, scheduledFor)`: a repeated insert for the same occurrence is a no-op.
	 */
	async createTask(trx: EntityManager, task: ScheduledTask): Promise<void> {
		await this.taskRepository.insertOccurrence(trx, scheduledTaskToRow(task));
	}
}
