import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager, In, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { ScheduledTask, ScheduledTaskStatus } from '../entities/scheduled-task';

/** Inputs to a claim (see {@link ScheduledTaskRepository.claimDueTasks}). */
export interface ClaimDueTasksOptions {
	/** Instance host id recorded as the owner (`claimedBy`) of the claimed rows. */
	host: string;
	/** Task types this instance has a handler for; scopes the claim to runnable work. */
	taskTypes: string[];
	/** How far past `now` to reach, so a task due before the next poll is claimed early and fired precisely. */
	lookaheadMs: number;
	/** Lease duration stamped on claimed rows (`leaseExpiresAt = now + leaseMs`). */
	leaseMs: number;
	/** Cap on how many rows a single claim takes. */
	batchSize: number;
}

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(ScheduledTask, dataSource.manager);
	}

	async findAll(): Promise<ScheduledTask[]> {
		return await this.find();
	}

	/**
	 * Insert a task occurrence through the caller's transaction. Idempotent on the
	 * occurrence identity `(jobId, scheduledFor)`: `orIgnore()` becomes
	 * `ON CONFLICT DO NOTHING` (Postgres) / `INSERT OR IGNORE` (SQLite), so a repeated
	 * insert for the same occurrence is a no-op against the unique index.
	 */
	async insertOccurrence(
		trx: EntityManager,
		occurrence: QueryDeepPartialEntity<ScheduledTask>,
	): Promise<void> {
		await trx
			.createQueryBuilder()
			.insert()
			.into(ScheduledTask)
			.values(occurrence)
			.orIgnore()
			.execute();
	}

	/**
	 * Claim up to `batchSize` due `pending` tasks for this instance, transitioning
	 * them to `running`, stamping `claimedBy`/`leaseExpiresAt` and bumping
	 * `leaseEpoch` (the fencing token). Due-ness uses the DB clock, never an
	 * instance clock, and reaches `lookaheadMs` into the future so the executor can
	 * fire each task precisely at its `runAt`.
	 *
	 * Supersede (skipping a stale occurrence when a newer one exists) is not done
	 * here: done correctly it needs the misfire grace window and per-schedule policy
	 * (coalesce/skip vs fire-all), which don't exist yet. It lands with the reaper
	 * and misfire policy, which share one past-grace + policy condition.
	 *
	 * Concurrent claimers never take the same row: Postgres skips locked rows
	 * (`FOR UPDATE SKIP LOCKED`); SQLite serialises claimers via the sqlite-pooled
	 * driver's `BEGIN IMMEDIATE` transaction, which reserves the write lock upfront.
	 */
	async claimDueTasks(opts: ClaimDueTasksOptions): Promise<ScheduledTask[]> {
		if (opts.taskTypes.length === 0) return [];
		return this.isPostgres()
			? await this.claimWithPostgres(opts)
			: await this.claimWithSqlite(opts);
	}

	private async claimWithPostgres(opts: ClaimDueTasksOptions): Promise<ScheduledTask[]> {
		const table = this.tableName();

		// Raw SQL: the query builder can't express UPDATE ... WHERE id IN (SELECT ...
		// FOR UPDATE SKIP LOCKED) ... RETURNING as one atomic statement. TypeORM's
		// Postgres driver returns `[rows, affectedCount]` from a raw UPDATE ... RETURNING;
		// the raw rows carry driver-native types (Date, parsed json, bigint id as
		// string), which the domain mapper expects.
		const [rows]: [ScheduledTask[], number] = await this.query(
			`UPDATE ${table}
			   SET "status" = '${ScheduledTaskStatus.Running}', "claimedBy" = $1,
			       "leaseExpiresAt" = now() + ($2 || ' milliseconds')::interval,
			       "leaseEpoch" = "leaseEpoch" + 1
			 WHERE "id" IN (
			   SELECT t."id" FROM ${table} t
			    WHERE t."status" = '${ScheduledTaskStatus.Pending}'
			      AND t."taskType" = ANY($3)
			      AND t."runAt" <= now() + ($4 || ' milliseconds')::interval
			    ORDER BY t."runAt"
			    LIMIT $5
			    FOR UPDATE SKIP LOCKED)
			 RETURNING *`,
			[opts.host, String(opts.leaseMs), opts.taskTypes, String(opts.lookaheadMs), opts.batchSize],
		);

		return rows;
	}

	private async claimWithSqlite(opts: ClaimDueTasksOptions): Promise<ScheduledTask[]> {
		// `manager.transaction` on the sqlite-pooled driver issues `BEGIN IMMEDIATE`,
		// so concurrent claimers serialise here rather than both reading the same
		// pending rows. Two statements (select then update) because SQLite can't
		// return the updated rows from an UPDATE.
		return await this.manager.transaction(async (tx) => {
			const candidates = await tx
				.createQueryBuilder(ScheduledTask, 't')
				.where('t.status = :pending', { pending: ScheduledTaskStatus.Pending })
				.andWhere('t.taskType IN (:...taskTypes)', { taskTypes: opts.taskTypes })
				// Reach `lookaheadMs` past now, not just up to now: a task due before the
				// next poll tick is then claimed on this tick and handed to the in-memory
				// precision timer, which fires it at its exact `runAt` rather than a whole
				// poll interval late. STRFTIME takes the offset as whole seconds.
				.andWhere("t.runAt <= STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', :lookahead)", {
					lookahead: `+${opts.lookaheadMs / 1000} seconds`,
				})
				.orderBy('t.runAt', 'ASC')
				.limit(opts.batchSize)
				.getMany();

			if (candidates.length === 0) return [];

			const ids = candidates.map((c) => c.id);
			await tx
				.createQueryBuilder()
				.update(ScheduledTask)
				.set({
					status: ScheduledTaskStatus.Running,
					claimedBy: opts.host,
					leaseExpiresAt: () =>
						`STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+${opts.leaseMs / 1000} seconds')`,
					leaseEpoch: () => 'leaseEpoch + 1',
				})
				.where({ id: In(ids), status: ScheduledTaskStatus.Pending })
				.execute();

			// Re-read so the returned rows carry the new status/lease, hydrated with
			// proper JS types (Date, parsed json) via TypeORM's column transformers.
			// `claimedBy`/`status` scope the re-read to rows this claim owns, defence
			// in depth beyond the `BEGIN IMMEDIATE` serialisation above.
			return await tx.findBy(ScheduledTask, {
				id: In(ids),
				claimedBy: opts.host,
				status: ScheduledTaskStatus.Running,
			});
		});
	}

	/**
	 * Stamp `startedAt` on a task we are about to dispatch, guarded so it only
	 * affects a row still `running` and owned by `host`. Doubles as the pre-dispatch
	 * existence check: 0 rows means the row was cascade-deleted or reclaimed, so the
	 * caller must not dispatch. Returns rows affected (0 = benign, 1 = proceed).
	 */
	async markStarted(host: string, id: string): Promise<number> {
		return await this.runGuardedUpdate(host, id, { startedAt: () => this.dbNow() });
	}

	/** Success: `running` -> `succeeded`. Guarded; 0 rows affected is a benign no-op. */
	async completeTask(host: string, id: string): Promise<number> {
		return await this.runGuardedUpdate(host, id, {
			status: ScheduledTaskStatus.Succeeded,
			finishedAt: () => this.dbNow(),
		});
	}

	/**
	 * Terminal failure: `running` -> `failed`, recording the error and counting the
	 * attempt. Guarded; 0 rows affected is a benign no-op.
	 */
	async failTaskTerminal(host: string, id: string, errorMessage: string): Promise<number> {
		return await this.runGuardedUpdate(host, id, {
			status: ScheduledTaskStatus.Failed,
			finishedAt: () => this.dbNow(),
			attempts: () => 'attempts + 1',
			errorMessage,
		});
	}

	/**
	 * Retryable failure: `running` -> `pending`, count the attempt and push `runAt`
	 * out by the backoff so the task waits before running again. Clears the claim and
	 * lease so the row is cleanly re-claimable (and satisfies the running-lease CHECK).
	 * Guarded; 0 rows affected is a benign no-op.
	 */
	async rescheduleTask(
		host: string,
		id: string,
		backoffMs: number,
		errorMessage: string,
	): Promise<number> {
		return await this.runGuardedUpdate(host, id, {
			status: ScheduledTaskStatus.Pending,
			runAt: () => this.dbNowPlusMs(backoffMs),
			attempts: () => 'attempts + 1',
			errorMessage,
			claimedBy: null,
			leaseExpiresAt: null,
		});
	}

	/**
	 * Return a claimed task to `pending` without counting an attempt, clearing the
	 * claim and lease. Used when the instance can't run the task after claiming it
	 * (e.g. no handler is registered for its type at fire time), so another instance
	 * or a later tick picks it up rather than the occurrence being lost. Guarded;
	 * 0 rows affected is a benign no-op.
	 */
	async releaseClaim(host: string, id: string): Promise<number> {
		return await this.runGuardedUpdate(host, id, {
			status: ScheduledTaskStatus.Pending,
			claimedBy: null,
			leaseExpiresAt: null,
		});
	}

	/**
	 * Apply a guarded update: only a row that is still `running` and claimed by
	 * `host` is touched, so a task reaped and reclaimed after a lease expiry can't be
	 * double-transitioned. Returns rows affected; the executor treats 0 as benign (the
	 * row was deleted or reclaimed), unlike a hard assert-exactly-one.
	 */
	private async runGuardedUpdate(
		host: string,
		id: string,
		values: QueryDeepPartialEntity<ScheduledTask>,
	): Promise<number> {
		// Object criteria (not a raw where string) so TypeORM quotes the camelCase
		// `claimedBy` column correctly on Postgres.
		const result = await this.update(
			{ id, status: ScheduledTaskStatus.Running, claimedBy: host },
			values,
		);
		return result.affected ?? 0;
	}

	private isPostgres(): boolean {
		return this.globalConfig.database.type === 'postgresdb';
	}

	/** DB-clock `now`, per dialect (never an instance clock, for due-ness/timestamps). */
	private dbNow(): string {
		return this.isPostgres() ? 'now()' : "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')";
	}

	/** DB-clock `now` plus a millisecond offset, per dialect. `ms` is caller-computed (safe to inline). */
	private dbNowPlusMs(ms: number): string {
		const rounded = Math.round(ms);
		return this.isPostgres()
			? `now() + (${rounded} || ' milliseconds')::interval`
			: `STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+${rounded / 1000} seconds')`;
	}

	private tableName(): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}scheduled_task`);
	}
}
