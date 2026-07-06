import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager, In, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import {
	ScheduledTask,
	ScheduledTaskStatus,
	type TerminalTaskStatus,
	TerminalTaskStatusList,
} from '../entities/scheduled-task';
import { dbNowLiteral, dbNowPlusMsLiteral } from '../utils/dialect-time';

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

/**
 * Inputs to one retention delete batch
 * (see {@link ScheduledTaskRepository.deleteFinishedOlderThan}).
 */
export interface DeleteFinishedTasksOptions {
	/** Terminal statuses this batch may delete. Live statuses are rejected. */
	statuses: TerminalTaskStatus[];
	/** Minimum age: only rows whose `finishedAt` is at least this far before DB-now go. */
	olderThanMs: number;
	/** Cap on how many rows this one statement deletes. Must be an integer; non-positive is a no-op. */
	limit: number;
}

/**
 * The columns set when the materializer records an occurrence.
 */
export interface NewOccurrence {
	jobId: number;
	taskType: string;
	payload: Record<string, unknown>;
	scheduledFor: Date;
	runAt: Date;
	maxAttempts: number;
}

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	private readonly isPostgres: boolean;
	private readonly tableName: string;

	constructor(dataSource: DataSource, config: DatabaseConfig) {
		super(ScheduledTask, dataSource.manager);
		this.isPostgres = config.type === 'postgresdb';
		this.tableName = this.manager.connection.driver.escape(`${config.tablePrefix}scheduled_task`);
	}

	/**
	 * Insert occurrences, skipping any that collide with an existing row on the
	 * unique `(jobId, scheduledFor)` identity (`ON CONFLICT DO NOTHING`).
	 * This is what makes recording the same occurrence twice a no-op instead of a duplicate run.
	 *
	 * Must run inside a transaction!
	 *
	 * @returns how many rows were actually inserted (skipped duplicates excluded)
	 */
	async insertIgnoringDuplicates(
		manager: EntityManager,
		occurrences: NewOccurrence[],
		// Chunked so a large batch stays under the driver's bind-parameter ceiling
		// (Postgres 65535, SQLite 32766); the default leaves headroom for the widest row.
		chunkSize = 1000,
	): Promise<number> {
		const { queryRunner } = manager;
		if (queryRunner === undefined) {
			throw new UnexpectedError('insertIgnoringDuplicates must run within a transaction');
		}

		const chunks = Array.from({ length: Math.ceil(occurrences.length / chunkSize) }, (_, i) =>
			occurrences.slice(i * chunkSize, (i + 1) * chunkSize),
		);

		let recorded = 0;
		for (const chunk of chunks) {
			const [sql, parameters] = manager
				.createQueryBuilder()
				.insert()
				.into(ScheduledTask)
				// `payload` is a free-form JSON column, which TypeORM's QueryDeepPartialEntity
				// can't express, so the well-typed rows are cast at this boundary.
				.values(chunk as Array<QueryDeepPartialEntity<ScheduledTask>>)
				.orIgnore()
				.getQueryAndParameters();
			const result = await queryRunner.query(sql, parameters, true);
			recorded += result.affected ?? 0;
		}
		return recorded;
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
		return this.isPostgres ? await this.claimWithPostgres(opts) : await this.claimWithSqlite(opts);
	}

	private async claimWithPostgres(opts: ClaimDueTasksOptions): Promise<ScheduledTask[]> {
		// TypeORM's Postgres driver returns `[rows, affectedCount]` from a raw UPDATE
		// ... RETURNING, so destructure the rows out of the tuple.
		const [rows]: [ScheduledTask[], number] = await this.query(
			`UPDATE ${this.tableName}
			   SET "status" = '${ScheduledTaskStatus.Running}', "claimedBy" = $1,
			       "leaseExpiresAt" = now() + ($2 || ' milliseconds')::interval,
			       "leaseEpoch" = "leaseEpoch" + 1
			 WHERE "id" IN (
			   SELECT t."id" FROM ${this.tableName} t
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
			startedAt: () => dbNowLiteral(this.isPostgres),
		});
	}

	/** Success: `running` -> `succeeded`. Guarded by the `claim`; 0 rows affected is a benign no-op. */
	async completeTask(claim: ClaimRef): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			status: ScheduledTaskStatus.Succeeded,
			finishedAt: () => dbNowLiteral(this.isPostgres),
		});
	}

	/**
	 * Terminal failure: `running` -> `failed`, recording the error and counting the
	 * attempt. Guarded by the `claim`; 0 rows affected is a benign no-op.
	 */
	async failTaskTerminal(claim: ClaimRef, errorMessage: string): Promise<number> {
		return await this.runGuardedUpdate(claim, {
			status: ScheduledTaskStatus.Failed,
			finishedAt: () => dbNowLiteral(this.isPostgres),
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
			runAt: () => dbNowPlusMsLiteral(this.isPostgres, backoffMs),
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
	 * Apply a guarded update: only touch the row this `claim` still owns (`running`,
	 * same `host` and `leaseEpoch`). Returns rows affected; 0 is benign (the row was
	 * deleted or reclaimed). The `leaseEpoch` match fences a stalled owner whose lease
	 * was reclaimed, once a reaper exists to bump the epoch on reclaim.
	 */
	private async runGuardedUpdate(
		claim: ClaimRef,
		values: QueryDeepPartialEntity<ScheduledTask>,
	): Promise<number> {
		// Object criteria (not a raw where string) so TypeORM quotes the camelCase
		// `claimedBy` column correctly on Postgres.
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
	 * Delete up to `limit` finished tasks in `statuses` whose
	 * `finishedAt` is at least `olderThanMs` before DB-now, oldest first.
	 * Age is judged against the database clock.
	 *
	 * A terminal row missing `finishedAt` (which transitions always set) is skipped.
	 *
	 * Concurrent pruners don't fight over rows:
	 * - Postgres skips locked rows (`FOR UPDATE SKIP LOCKED`), handing simultaneous batches disjoint rows
	 * - SQLite runs writers one at a time.
	 *
	 * @returns how many rows were deleted
	 * @throws UnexpectedError when `statuses` contains a non-terminal value or `limit` is not an integer
	 */
	async deleteFinishedOlderThan(options: DeleteFinishedTasksOptions): Promise<number> {
		const invalid = options.statuses.filter((status) => !TerminalTaskStatusList.includes(status));
		if (invalid.length > 0) {
			throw new UnexpectedError(
				`deleteFinishedOlderThan only deletes terminal tasks, got: ${invalid.join(', ')}`,
			);
		}
		// A non-integer bound to LIMIT errors on SQLite (datatype mismatch), and NaN
		// binds as NULL, which on Postgres means LIMIT ALL; reject it before the SQL.
		if (!Number.isSafeInteger(options.limit)) {
			throw new UnexpectedError(
				`deleteFinishedOlderThan needs an integer limit, got: ${options.limit}`,
			);
		}
		if (options.statuses.length === 0 || options.limit <= 0) {
			return 0;
		}
		return this.isPostgres
			? await this.deleteFinishedWithPostgres(options)
			: await this.deleteFinishedWithSqlite(options);
	}

	private async deleteFinishedWithPostgres(options: DeleteFinishedTasksOptions): Promise<number> {
		const [, affected] = await this.manager.query<[unknown[], number]>(
			`DELETE FROM ${this.tableName}
			 WHERE "id" IN (
			   SELECT t."id" FROM ${this.tableName} t
			    WHERE t."status" = ANY($1)
			      AND t."finishedAt" <= ${dbNowPlusMsLiteral(true, -options.olderThanMs)}
			    ORDER BY t."finishedAt"
			    LIMIT $2
			    FOR UPDATE SKIP LOCKED)`,
			[options.statuses, options.limit],
		);
		return affected;
	}

	private async deleteFinishedWithSqlite(options: DeleteFinishedTasksOptions): Promise<number> {
		const result = await this.createQueryBuilder()
			.delete()
			.where(
				`id IN (
					SELECT "id" FROM ${this.tableName}
					 WHERE "status" IN (:...statuses)
					   AND "finishedAt" <= ${dbNowPlusMsLiteral(false, -options.olderThanMs)}
					 ORDER BY "finishedAt"
					 LIMIT :limit)`,
				{ statuses: options.statuses, limit: options.limit },
			)
			.execute();
		return result.affected ?? 0;
	}
}
