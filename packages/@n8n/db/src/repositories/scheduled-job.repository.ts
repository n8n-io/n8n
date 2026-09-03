import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { ScheduledJob } from '../entities/scheduled-job';
import type { ScheduledJobOwner, ScheduledJobOwnerRef } from '../entities/scheduled-job';
import { ScheduledTask, ScheduledTaskStatus } from '../entities/scheduled-task';
import { dbNowLiteral, dbNowPlusMsLiteral, parseDbTime } from '../utils/dialect-time';

/** The new clock values for one advanced job. */
export interface JobAdvance {
	id: number;
	nextRunAt: Date | null;
	lastFiredAt: Date | null;
}

/** A job row to insert; remaining bookkeeping columns take their schema defaults. */
export type NewScheduledJob = Pick<
	ScheduledJob,
	| 'name'
	| 'ownerType'
	| 'ownerId'
	| 'ownerMemberId'
	| 'taskType'
	| 'payload'
	| 'kind'
	| 'cronExpression'
	| 'timezone'
	| 'recurrenceUnit'
	| 'recurrenceSize'
	| 'intervalSeconds'
	| 'fireAt'
	| 'nextRunAt'
	| 'maxAttempts'
	| 'misfirePolicy'
	| 'misfireGraceSeconds'
>;

/** A changed schedule definition, plus the fresh clock it restarts from. */
export type ScheduledJobDefinitionUpdate = Pick<
	ScheduledJob,
	| 'kind'
	| 'cronExpression'
	| 'timezone'
	| 'recurrenceUnit'
	| 'recurrenceSize'
	| 'intervalSeconds'
	| 'fireAt'
	| 'nextRunAt'
	| 'misfirePolicy'
	| 'misfireGraceSeconds'
>;

@Service()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
	private readonly isPostgres: boolean;

	// Largest chunk each statement can take before overflowing the driver's limits. SQLite's
	// expression-depth cap (1000) bites first — the advance builds a CASE per chunk, the insert a
	// multi-row VALUES, both nesting with size — so it caps far below Postgres's bind-parameter
	// ceiling (65535). Each doubles as the method's default and the hard cap on a caller's size.
	private readonly maxAdvanceChunkSize: number;
	private readonly maxInsertChunkSize: number;

	constructor(dataSource: DataSource, config: DatabaseConfig) {
		super(ScheduledJob, dataSource.manager);
		this.isPostgres = config.type === 'postgresdb';
		this.maxAdvanceChunkSize = this.isPostgres ? 1000 : 200;
		this.maxInsertChunkSize = this.isPostgres ? 1000 : 500;
	}

	/** Clamp a caller-supplied chunk size to [1, max]; a larger chunk overflows the driver's limits. */
	private clampChunkSize(chunkSize: number, max: number): number {
		return Math.min(Math.max(1, chunkSize), max);
	}

	/**
	 * Claim up to `limit` enabled, due jobs (oldest first) and read the database time in
	 * the same round-trip.
	 *
	 * Postgres locks the returned rows with `FOR UPDATE SKIP LOCKED`, so a concurrent
	 * materialization skips them and claims different jobs.
	 * SQLite can't lock rows, but its transactions are `BEGIN IMMEDIATE`, which serializes them to the same effect.
	 *
	 * @param lookaheadMs claim a job up to this far before its `nextRunAt`, not only once
	 * it's already due, so a fixed-interval poll doesn't notice it a whole tick late.
	 * @returns `undefined` when nothing is due.
	 *
	 */
	async claimDue(
		manager: EntityManager,
		limit: number,
		lookaheadMs = 0,
	): Promise<{ now: Date; jobs: ScheduledJob[] } | undefined> {
		const nowExpression = dbNowLiteral(this.isPostgres);
		const dueExpression = dbNowPlusMsLiteral(this.isPostgres, lookaheadMs);

		const query = manager
			.createQueryBuilder(ScheduledJob, 'job')
			.addSelect(nowExpression, 'db_now')
			.where('job.enabled = :enabled', { enabled: true })
			.andWhere('job.nextRunAt IS NOT NULL')
			.andWhere(`job.nextRunAt <= ${dueExpression}`)
			.orderBy('job.nextRunAt', 'ASC')
			.limit(limit);

		if (this.isPostgres) {
			query.setLock('pessimistic_write').setOnLocked('skip_locked');
		}

		const { entities, raw } = await query.getRawAndEntities<{ db_now: Date | string }>();

		if (raw.length === 0) {
			return undefined;
		}

		return {
			now: parseDbTime(raw[0].db_now),
			jobs: entities,
		};
	}

	/** All jobs owned by exactly this owner member. */
	async findManyByOwner(manager: EntityManager, owner: ScheduledJobOwner): Promise<ScheduledJob[]> {
		return await manager.findBy(ScheduledJob, ownerCriteria(owner));
	}

	/** The jobs with the given ids, read back within a transaction. */
	async findManyByIds(manager: EntityManager, ids: number[]): Promise<ScheduledJob[]> {
		if (ids.length === 0) return [];
		return await manager.findBy(ScheduledJob, { id: In(ids) });
	}

	async countByOwner(owner: ScheduledJobOwner): Promise<number> {
		return await this.count({ where: ownerCriteria(owner) });
	}

	async backdateNextRunAt(owner: ScheduledJobOwner, secondsInPast: number): Promise<void> {
		const memberClause =
			owner.ownerMemberId === null ? '"ownerMemberId" IS NULL' : '"ownerMemberId" = :ownerMemberId';
		await this.createQueryBuilder()
			.update(ScheduledJob)
			.set({ nextRunAt: () => dbNowPlusMsLiteral(this.isPostgres, -secondsInPast * 1000) })
			.where(`"ownerType" = :ownerType AND "ownerId" = :ownerId AND ${memberClause}`, {
				ownerType: owner.ownerType,
				ownerId: owner.ownerId,
				ownerMemberId: owner.ownerMemberId,
			})
			.execute();
	}

	/**
	 * Insert new job rows and return one id per input job, in the same order as
	 * `jobs`, so the caller can zip the ids back to the jobs by index.
	 * Must run inside a transaction.
	 *
	 * `orIgnore` emits `ON CONFLICT DO NOTHING` (Postgres) / `INSERT OR IGNORE`
	 * (SQLite): a name already taken is left as-is rather than erroring, so two mains
	 * activating the same node at once converge on one set of rows (the first
	 * writer's, clock intact) instead of the second failing on the unique index.
	 *
	 * The ids are read back by name rather than from `RETURNING`: `RETURNING` omits
	 * the rows `orIgnore` skipped, so a name a concurrent writer already inserted
	 * would come back without an id. `name` is unique and every input job has a row
	 * once the insert returns (ours, or the concurrent writer's), so the read-back
	 * yields exactly one id per job.
	 *
	 * @throws {UnexpectedError} when a name's row belongs to a different owner. Job
	 * names are scoped by convention, not by the schema, so a collision would
	 * otherwise have `orIgnore` hand back another owner's id and let this call
	 * reschedule their job.
	 */
	async insertMany(
		manager: EntityManager,
		jobs: NewScheduledJob[],
		chunkSize = this.maxInsertChunkSize,
	): Promise<number[]> {
		if (manager.queryRunner === undefined) {
			throw new UnexpectedError('insertMany must run within a transaction');
		}
		if (jobs.length === 0) {
			return [];
		}
		const size = this.clampChunkSize(chunkSize, this.maxInsertChunkSize);
		// `payload` is a free-form JSON column, which TypeORM's QueryDeepPartialEntity can't express,
		// so the well-typed rows are cast at this boundary.
		for (let start = 0; start < jobs.length; start += size) {
			const jobChunk = jobs.slice(start, start + size);
			await manager
				.createQueryBuilder()
				.insert()
				.into(ScheduledJob)
				.values(jobChunk as Array<QueryDeepPartialEntity<ScheduledJob>>)
				.orIgnore()
				.execute();
		}

		const names = jobs.map((job) => job.name);
		const rows: ScheduledJob[] = [];
		for (let start = 0; start < names.length; start += size) {
			const found = await manager.find(ScheduledJob, {
				where: { name: In(names.slice(start, start + size)) },
				select: { id: true, name: true, ownerType: true, ownerId: true, ownerMemberId: true },
			});
			rows.push(...found);
		}
		return orderIdsByName(rows, jobs);
	}

	/**
	 * Rewrite a job's schedule in place,
	 * keeping its id so queued tasks stay attributable.
	 */
	async updateDefinition(
		manager: EntityManager,
		id: number,
		update: ScheduledJobDefinitionUpdate,
	): Promise<void> {
		await manager.update(ScheduledJob, { id }, update);
	}

	/** Updates misfire policy and grace only, leaving schedule and clock untouched. */
	async updateMisfirePolicy(
		manager: EntityManager,
		ids: number[],
		update: Pick<ScheduledJob, 'misfirePolicy' | 'misfireGraceSeconds'>,
	): Promise<void> {
		if (ids.length === 0) return;
		await manager.update(ScheduledJob, ids, update);
	}

	async deleteManyByIds(manager: EntityManager, ids: number[]): Promise<void> {
		if (ids.length > 0) {
			await manager.delete(ScheduledJob, ids);
		}
	}

	/**
	 * Delete all jobs owned by exactly this owner member; their tasks cascade away.
	 * @returns how many jobs were deleted (0 when the driver can't report it).
	 */
	async deleteByOwnerMember(manager: EntityManager, owner: ScheduledJobOwner): Promise<number> {
		const result = await manager.delete(ScheduledJob, ownerCriteria(owner));
		return result.affected ?? 0;
	}

	/**
	 * Delete every job an owner holds, whichever of its members provisioned them;
	 * their tasks cascade away.
	 * @returns how many jobs were deleted (0 when the driver can't report it).
	 */
	async deleteByOwnerRef(manager: EntityManager, owner: ScheduledJobOwnerRef): Promise<number> {
		const result = await manager.delete(ScheduledJob, ownerRefCriteria(owner));
		return result.affected ?? 0;
	}

	/**
	 * Delete an owner's jobs of one task type, whichever of its members own them;
	 * their tasks cascade away.
	 * @returns how many jobs were deleted (0 when the driver can't report it).
	 */
	async deleteByOwnerTaskType(
		manager: EntityManager,
		owner: ScheduledJobOwnerRef,
		taskType: string,
	): Promise<number> {
		const result = await manager.delete(ScheduledJob, { ...ownerRefCriteria(owner), taskType });
		return result.affected ?? 0;
	}

	/** The owner kinds that currently own at least one job, one row per kind. */
	async findOwnerTypes(): Promise<string[]> {
		const rows: Array<{ ownerType: string }> = await this.createQueryBuilder('job')
			.select('job.ownerType', 'ownerType')
			.distinct(true)
			.orderBy('job.ownerType', 'ASC')
			.getRawMany();
		return rows.map((row) => row.ownerType);
	}

	/**
	 * One page of the distinct owners of a kind, keyset paginated on `ownerId` so
	 * a long sweep stays on the `(ownerType, ownerId, ownerMemberId)` index.
	 *
	 * Only owners with a job older than `settledBefore`. A module may provision
	 * before the transaction that creates the owner commits, and the resolver
	 * would read that brand-new job as orphaned. The bound is on `createdAt`
	 * because the poller rewrites `updatedAt` on every fire.
	 *
	 * @param after exclusive lower bound on `ownerId`; omit for the first page.
	 * @returns at most `limit` owner ids, ascending.
	 */
	async findOwnerIds(
		ownerType: string,
		settledBefore: Date,
		limit: number,
		after?: string,
	): Promise<string[]> {
		const query = this.createQueryBuilder('job')
			.select('job.ownerId', 'ownerId')
			.distinct(true)
			.where('job.ownerType = :ownerType', { ownerType })
			.andWhere('job.createdAt <= :settledBefore', { settledBefore })
			.orderBy('job.ownerId', 'ASC')
			.limit(limit);
		if (after !== undefined) {
			query.andWhere('job.ownerId > :after', { after });
		}
		const rows: Array<{ ownerId: string }> = await query.getRawMany();
		return rows.map((row) => row.ownerId);
	}

	/**
	 * Quarantine every not-yet-quarantined job of these owners: clock cleared,
	 * `orphanedAt` stamped, and its queued occurrences withdrawn. Both writes
	 * commit together, or the job would either still fire or requeue what was
	 * withdrawn. `enabled` is left as it was, so a lift restores the job's own
	 * state rather than turning on one that was disabled before.
	 *
	 * `settledBefore` applies the same bound as {@link findOwnerIds}, sparing a
	 * job written since the caller's liveness check.
	 *
	 * @returns how many jobs were quarantined (0 when the driver can't report it).
	 */
	async quarantineByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		orphanedAt: Date,
		settledBefore: Date,
	): Promise<number> {
		if (ownerIds.length === 0) {
			return 0;
		}

		return await this.manager.transaction(async (manager) => {
			const quarantined = await manager
				.createQueryBuilder()
				.update(ScheduledJob)
				.set({ nextRunAt: null, orphanedAt })
				.where('"ownerType" = :ownerType', { ownerType })
				.andWhere('"ownerId" IN (:...ownerIds)', { ownerIds })
				.andWhere('"orphanedAt" IS NULL')
				.andWhere('"createdAt" <= :settledBefore', { settledBefore })
				.execute();

			await this.withdrawQueuedOccurrences(manager, ownerType, ownerIds);

			return quarantined.affected ?? 0;
		});
	}

	/**
	 * Delete the pending occurrences of these owners' quarantined jobs.
	 *
	 * Keyed on the quarantine stamp rather than on the bounds the update used, so
	 * it reaches only rows still quarantined when it runs: a job another instance
	 * revived in between has no stamp and keeps the runs it just seeded.
	 */
	private async withdrawQueuedOccurrences(
		manager: EntityManager,
		ownerType: string,
		ownerIds: string[],
	): Promise<void> {
		// `tablePath` comes from entity metadata, never from caller input.
		const jobTable = this.metadata.tablePath;
		await manager
			.createQueryBuilder()
			.delete()
			.from(ScheduledTask)
			.where('"status" = :status', { status: ScheduledTaskStatus.Pending })
			.andWhere(
				`"jobId" IN (SELECT "id" FROM ${jobTable} WHERE "ownerType" = :ownerType AND "ownerId" IN (:...ownerIds) AND "orphanedAt" IS NOT NULL)`,
				{ ownerType, ownerIds },
			)
			.execute();
	}

	/**
	 * Delete the quarantined jobs of these owners whose grace period has run out;
	 * their occurrences cascade away.
	 *
	 * @param quarantinedBefore only jobs stamped at or before this instant.
	 * @returns how many jobs were deleted (0 when the driver can't report it).
	 */
	async deleteQuarantinedByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		quarantinedBefore: Date,
	): Promise<number> {
		if (ownerIds.length === 0) {
			return 0;
		}
		const result = await this.createQueryBuilder()
			.delete()
			.from(ScheduledJob)
			.where('"ownerType" = :ownerType', { ownerType })
			.andWhere('"ownerId" IN (:...ownerIds)', { ownerIds })
			.andWhere('"orphanedAt" IS NOT NULL')
			.andWhere('"orphanedAt" <= :quarantinedBefore', { quarantinedBefore })
			.execute();
		return result.affected ?? 0;
	}

	/**
	 * The quarantined jobs of these owners, so a revival can recompute their clocks.
	 *
	 * @param limit at most this many jobs.
	 */
	async findQuarantinedByOwnerIds(
		ownerType: string,
		ownerIds: string[],
		limit: number,
	): Promise<ScheduledJob[]> {
		if (ownerIds.length === 0) {
			return [];
		}
		return await this.createQueryBuilder('job')
			.where('job.ownerType = :ownerType', { ownerType })
			.andWhere('job.ownerId IN (:...ownerIds)', { ownerIds })
			.andWhere('job.orphanedAt IS NOT NULL')
			.limit(limit)
			.getMany();
	}

	/**
	 * Lift the quarantine on one job: `orphanedAt` cleared, clock restarted from
	 * `nextRunAt` (`null` when nothing is left to fire). A no-op unless the job is
	 * still quarantined, so a concurrent lift or delete wins.
	 *
	 * @returns how many quarantines were lifted (0 when nothing was left to lift).
	 */
	async liftQuarantine(id: number, nextRunAt: Date | null): Promise<number> {
		const result = await this.update(
			{ id, orphanedAt: Not(IsNull()) },
			{ orphanedAt: null, nextRunAt },
		);
		return result.affected ?? 0;
	}

	/**
	 * Lift the quarantine on every quarantined job of this owner member, leaving
	 * their clocks to the caller. Must run inside a transaction.
	 *
	 * A lifted job keeps its `createdAt`, so the settle window of
	 * {@link findOwnerIds} does not shield it again. Call this only once the
	 * owner is visible to its resolver, or the next sweep quarantines it anew.
	 *
	 * @returns how many quarantines were lifted (0 when the driver can't report it).
	 */
	async liftQuarantineByOwner(manager: EntityManager, owner: ScheduledJobOwner): Promise<number> {
		if (manager.queryRunner === undefined) {
			throw new UnexpectedError('liftQuarantineByOwner must run within a transaction');
		}
		const result = await manager.update(
			ScheduledJob,
			{ ...ownerCriteria(owner), orphanedAt: Not(IsNull()) },
			{ orphanedAt: null },
		);
		return result.affected ?? 0;
	}

	/**
	 * Advance many jobs' clocks, a statement per chunk.
	 * Callers pass distinct ids (a batch of claimed jobs).
	 */
	async advanceMany(
		manager: EntityManager,
		advances: JobAdvance[],
		chunkSize = this.maxAdvanceChunkSize,
	): Promise<void> {
		const size = this.clampChunkSize(chunkSize, this.maxAdvanceChunkSize);
		for (let start = 0; start < advances.length; start += size) {
			await this.advanceChunk(manager, advances.slice(start, start + size));
		}
	}

	private async advanceChunk(manager: EntityManager, advances: JobAdvance[]): Promise<void> {
		const ids = advances.map((advance) => advance.id);
		const parameters: Record<string, unknown> = { ids };
		advances.forEach((advance, i) => {
			parameters[`id${i}`] = advance.id;
			parameters[`next${i}`] = advance.nextRunAt;
			parameters[`last${i}`] = advance.lastFiredAt;
		});

		const pick = (column: string) => {
			const cases = advances.map((_, i) => `WHEN id = :id${i} THEN :${column}${i}`).join(' ');
			const expression = `CASE ${cases} END`;
			return this.isPostgres ? `CAST(${expression} AS timestamptz)` : expression;
		};

		await manager
			.createQueryBuilder()
			.update(ScheduledJob)
			.set({
				nextRunAt: () => pick('next'),
				lastFiredAt: () => pick('last'),
			})
			.where('id IN (:...ids)')
			.setParameters(parameters)
			.execute();
	}
}

/** A read-back row, carrying the owner the id is only valid under. */
type InsertedRow = Pick<ScheduledJob, 'id' | 'name' | 'ownerType' | 'ownerId' | 'ownerMemberId'>;

/**
 * Ids for `jobs`, in input order, from the rows read back after the insert.
 * Throws on a name with no row: the caller zips the result back to `jobs` by
 * index, so a gap would misalign every id after it. Throws too on a row owned by
 * someone else, rather than handing back an id this caller has no claim to.
 */
function orderIdsByName(rows: InsertedRow[], jobs: NewScheduledJob[]): number[] {
	const rowByName = new Map(rows.map((row) => [row.name, row]));
	return jobs.map((job) => {
		const row = rowByName.get(job.name);
		if (row === undefined) {
			throw new UnexpectedError(`No row found for scheduled job "${job.name}" after insert`);
		}
		if (
			row.ownerType !== job.ownerType ||
			row.ownerId !== job.ownerId ||
			row.ownerMemberId !== job.ownerMemberId
		) {
			throw new UnexpectedError('Scheduled job name is already taken by another owner', {
				extra: { name: job.name, ownerType: job.ownerType, ownerId: job.ownerId },
			});
		}
		return row.id;
	});
}

/**
 * Matches every job an owner holds, whichever member provisioned it. Spelled out
 * rather than spread, so passing a full {@link ScheduledJobOwner} cannot narrow
 * an owner-wide delete to one member.
 */
function ownerRefCriteria(owner: ScheduledJobOwnerRef): FindOptionsWhere<ScheduledJob> {
	return { ownerType: owner.ownerType, ownerId: owner.ownerId };
}

/**
 * Matches exactly one owner member. Spelled out so a `null` member becomes
 * `IS NULL` instead of `= NULL`, which matches nothing.
 */
function ownerCriteria(owner: ScheduledJobOwner): FindOptionsWhere<ScheduledJob> {
	return {
		ownerType: owner.ownerType,
		ownerId: owner.ownerId,
		ownerMemberId: owner.ownerMemberId === null ? IsNull() : owner.ownerMemberId,
	};
}
