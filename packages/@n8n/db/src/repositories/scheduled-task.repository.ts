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
	/** Lease duration set on claimed rows (`leaseExpiresAt = now + leaseMs`). */
	leaseMs: number;
	/** Cap on how many rows a single claim takes. */
	batchSize: number;
}

/**
 * Identifies the exact claim a guarded transition may act on: the row `id`, the
 * owner `host`, and the `leaseEpoch` the caller claimed with (the fencing token).
 */
export interface ClaimRef {
	host: string;
	id: string;
	claimedEpoch: number;
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
	 * Claim up to `batchSize` due `pending` tasks for this instance: set them
	 * `running`, set `claimedBy`/`leaseExpiresAt` and bump `leaseEpoch` (the fencing
	 * token). Due-ness uses the DB clock, and reaches `lookaheadMs` into the future
	 * so the executor can fire each task precisely at its `runAt`.
	 *
	 * Supersede (skipping a stale occurrence when a newer one exists) is deferred: it
	 * needs the misfire grace window and per-schedule policy (coalesce/skip vs
	 * fire-all), which land with the reaper.
	 *
	 * Concurrent claimers never take the same row: Postgres skips locked rows
	 * (`FOR UPDATE SKIP LOCKED`); SQLite serialises via the sqlite-pooled driver's
	 * `BEGIN IMMEDIATE`, which reserves the write lock upfront.
	 */
	async claimDueTasks(opts: ClaimDueTasksOptions): Promise<ScheduledTask[]> {
		if (opts.taskTypes.length === 0) return [];
		return this.isPostgres()
			? await this.claimWithPostgres(opts)
			: await this.claimWithSqlite(opts);
	}

	private async claimWithPostgres(opts: ClaimDueTasksOptions): Promise<ScheduledTask[]> {
		const table = this.tableName();

		// TypeORM's Postgres driver returns `[rows, affectedCount]` from a raw UPDATE
		// ... RETURNING, so destructure the rows out of the tuple.
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
				// Reach `lookaheadMs` past now so a task due before the next poll is claimed
				// early and fired precisely by the timer. STRFTIME takes the offset as whole
				// seconds.
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

			// `claimedBy`/`status` scope the re-read to rows this claim owns: defence
			// in depth beyond the `BEGIN IMMEDIATE` serialisation above.
			return await tx.findBy(ScheduledTask, {
				id: In(ids),
				claimedBy: opts.host,
				status: ScheduledTaskStatus.Running,
			});
		});
	}

	/**
	 * Set `startedAt` on a task about to dispatch, guarded so it only affects the row
	 * this `claim` still owns (`running`, same `host` and `leaseEpoch`). Doubles as the
	 * pre-dispatch existence check: 0 rows means the row was deleted or reclaimed, so
	 * don't dispatch. Returns rows affected (0 = benign, 1 = proceed).
	 */
	async markStarted(claim: ClaimRef): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			startedAt: () => this.makeDbNowLiteral(),
		});
	}

	/** Success: `running` -> `succeeded`. Guarded by the `claim`; 0 rows affected is a benign no-op. */
	async completeTask(claim: ClaimRef): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			status: ScheduledTaskStatus.Succeeded,
			finishedAt: () => this.makeDbNowLiteral(),
		});
	}

	/**
	 * Terminal failure: `running` -> `failed`, recording the error and counting the
	 * attempt. Guarded by the `claim`; 0 rows affected is a benign no-op.
	 */
	async failTaskTerminal(claim: ClaimRef, errorMessage: string): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			status: ScheduledTaskStatus.Failed,
			finishedAt: () => this.makeDbNowLiteral(),
			attempts: () => 'attempts + 1',
			errorMessage,
		});
	}

	/**
	 * Retryable failure: `running` -> `pending`, count the attempt and push `runAt`
	 * out by the backoff so the task waits before retrying. Clears the claim and lease
	 * so the row is re-claimable (and satisfies the running-lease CHECK). Guarded by
	 * the `claim`; 0 rows affected is a benign no-op.
	 */
	async rescheduleTask(claim: ClaimRef, backoffMs: number, errorMessage: string): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			status: ScheduledTaskStatus.Pending,
			runAt: () => this.makeDbNowPlusMsLiteral(backoffMs),
			attempts: () => 'attempts + 1',
			errorMessage,
			claimedBy: null,
			leaseExpiresAt: null,
			// The next attempt sets its own start; clear this one's so a pending row
			// doesn't carry a stale `startedAt`.
			startedAt: null,
		});
	}

	/**
	 * Return a claimed task to `pending` without counting an attempt, clearing the
	 * claim and lease. Used when the instance can't run the task after claiming it
	 * (e.g. no handler is registered for its type at fire time), so another instance
	 * or a later tick picks it up rather than the occurrence being lost. Guarded by
	 * the `claim`; 0 rows affected is a benign no-op.
	 */
	async releaseClaim(claim: ClaimRef): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			status: ScheduledTaskStatus.Pending,
			claimedBy: null,
			leaseExpiresAt: null,
			startedAt: null,
		});
	}

	/**
	 * Find `running` tasks whose lease has expired (candidates for the reaper).
	 * Ordered oldest-expiry first and capped at `limit` so a large backlog is drained
	 * across passes. Due-ness uses the DB clock. Backed by the partial index on
	 * `leaseExpiresAt WHERE status = 'running'`.
	 */
	async findExpiredLeases(limit: number): Promise<ScheduledTask[]> {
		return await this.createQueryBuilder('t')
			.where('t.status = :running', { running: ScheduledTaskStatus.Running })
			.andWhere(`t.leaseExpiresAt < ${this.makeDbNowLiteral()}`)
			.orderBy('t.leaseExpiresAt', 'ASC')
			.limit(limit)
			.getMany();
	}

	/**
	 * Reaper reclaim: an expired-lease `running` task back to `pending`, counting the
	 * attempt, pushing `runAt` out by the backoff, and bumping the lease epoch.
	 * Clears the claim and lease. Guarded on the epoch read during the sweep and a
	 * re-asserted expiry, so a row the owner finished, another reaper reclaimed, or a
	 * renewed lease moved out is a benign 0-row no-op. Returns rows affected. (The
	 * epoch bump is defence in depth, not what fences the stalled owner; the status
	 * change and the next claim's own bump do that. See the `Reaper` class.)
	 */
	async reclaimExpired(
		id: string,
		claimedEpoch: number,
		backoffMs: number,
		errorMessage: string,
	): Promise<number> {
		return await this.runReaperUpdate(id, claimedEpoch, {
			status: ScheduledTaskStatus.Pending,
			runAt: () => this.makeDbNowPlusMsLiteral(backoffMs),
			attempts: () => 'attempts + 1',
			leaseEpoch: () => 'leaseEpoch + 1',
			claimedBy: null,
			leaseExpiresAt: null,
			errorMessage,
		});
	}

	/**
	 * Reaper dead-letter: an expired-lease `running` task at its last attempt to
	 * terminal `failed`. Same guard as {@link reclaimExpired}; terminal, so no epoch
	 * bump (the `status` change alone fences a stale owner). Returns rows affected.
	 */
	async deadLetterExpired(id: string, claimedEpoch: number, errorMessage: string): Promise<number> {
		return await this.runReaperUpdate(id, claimedEpoch, {
			status: ScheduledTaskStatus.Failed,
			finishedAt: () => this.makeDbNowLiteral(),
			attempts: () => 'attempts + 1',
			errorMessage,
		});
	}

	/**
	 * Apply a guarded update: only touch the row this `claim` still owns (`running`,
	 * same `host` and `leaseEpoch`). Returns rows affected; 0 is benign (the row was
	 * deleted or reclaimed). The `leaseEpoch` match fences a stalled owner whose lease
	 * was reclaimed by the reaper, which bumps the epoch on reclaim.
	 */
	private async runGuardedUpdate(
		claim: ClaimRef,
		values: QueryDeepPartialEntity<ScheduledTask>,
	): Promise<number> {
		// Object criteria (not a raw where string) so TypeORM quotes the camelCase
		// `claimedBy`/`leaseEpoch` columns correctly on Postgres.
		const result = await this.update(
			{
				id: claim.id,
				status: ScheduledTaskStatus.Running,
				claimedBy: claim.host,
				leaseEpoch: claim.claimedEpoch,
			},
			values,
		);
		return result.affected ?? 0;
	}

	/**
	 * Apply a reaper update: only touch a row still `running`, at the epoch read
	 * during the sweep, and still lease-expired. Unlike {@link runGuardedUpdate} it
	 * does not guard on `claimedBy` (the reaper is not the owner) and re-asserts the
	 * expiry so a lease renewed between the sweep's read and this write is left alone.
	 * Returns rows affected; 0 is benign (another reaper won it, or the owner finished).
	 */
	private async runReaperUpdate(
		id: string,
		claimedEpoch: number,
		values: QueryDeepPartialEntity<ScheduledTask>,
	): Promise<number> {
		// No alias on an UPDATE builder, so quote the camelCase column ourselves for
		// Postgres (SQLite accepts the same double-quoted identifier).
		const leaseExpiresAt = this.manager.connection.driver.escape('leaseExpiresAt');
		const result = await this.createQueryBuilder()
			.update(ScheduledTask)
			.set(values)
			.where({ id, status: ScheduledTaskStatus.Running, leaseEpoch: claimedEpoch })
			.andWhere(`${leaseExpiresAt} < ${this.dbNow()}`)
			.execute();
		return result.affected ?? 0;
	}

	private isPostgres(): boolean {
		return this.globalConfig.database.type === 'postgresdb';
	}

	/** DB-clock `now`, per dialect (never an instance clock). */
	private makeDbNowLiteral(): string {
		return this.isPostgres() ? 'now()' : "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')";
	}

	/** DB-clock `now` plus a millisecond offset, per dialect. `ms` is caller-computed (safe to inline). */
	private makeDbNowPlusMsLiteral(ms: number): string {
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
