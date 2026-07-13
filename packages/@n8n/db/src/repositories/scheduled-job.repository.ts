import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { ScheduledJob } from '../entities/scheduled-job';
import { dbNowLiteral, parseDbTime } from '../utils/dialect-time';

/** The new clock values for one advanced job. */
export interface JobAdvance {
	id: number;
	nextRunAt: Date | null;
	lastFiredAt: Date | null;
}

/** A job row to insert; bookkeeping columns take their schema defaults. */
export type NewScheduledJob = Pick<
	ScheduledJob,
	| 'name'
	| 'workflowId'
	| 'nodeId'
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
>;

@Service()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
	private readonly isPostgres: boolean;

	constructor(dataSource: DataSource, config: DatabaseConfig) {
		super(ScheduledJob, dataSource.manager);
		this.isPostgres = config.type === 'postgresdb';
	}

	/**
	 * Claim up to `limit` enabled, due jobs (oldest first) and read the database time in
	 * the same round-trip.
	 *
	 * Postgres locks the returned rows with `FOR UPDATE SKIP LOCKED`, so a concurrent
	 * materialization skips them and claims different jobs.
	 * SQLite can't lock rows, but its transactions are `BEGIN IMMEDIATE`, which serializes them to the same effect.
	 *
	 * @returns `undefined` when nothing is due.
	 *
	 */
	async claimDue(
		manager: EntityManager,
		limit: number,
	): Promise<{ now: Date; jobs: ScheduledJob[] } | undefined> {
		const nowExpression = dbNowLiteral(this.isPostgres);

		const query = manager
			.createQueryBuilder(ScheduledJob, 'job')
			.addSelect(nowExpression, 'db_now')
			.where('job.enabled = :enabled', { enabled: true })
			.andWhere('job.nextRunAt IS NOT NULL')
			.andWhere(`job.nextRunAt <= ${nowExpression}`)
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

	/** All jobs owned by one trigger node */
	async findManyByWorkflowNode(
		manager: EntityManager,
		workflowId: string,
		nodeId: string,
	): Promise<ScheduledJob[]> {
		return await manager.findBy(ScheduledJob, { workflowId, nodeId });
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
	 */
	async insertMany(manager: EntityManager, jobs: NewScheduledJob[]): Promise<number[]> {
		if (manager.queryRunner === undefined) {
			throw new UnexpectedError('insertMany must run within a transaction');
		}
		if (jobs.length === 0) {
			return [];
		}
		// `payload` is a free-form JSON column, which TypeORM's QueryDeepPartialEntity can't express,
		// so the well-typed rows are cast at this boundary.
		await manager
			.createQueryBuilder()
			.insert()
			.into(ScheduledJob)
			.values(jobs as Array<QueryDeepPartialEntity<ScheduledJob>>)
			.orIgnore()
			.execute();

		const rows = await manager.find(ScheduledJob, {
			where: { name: In(jobs.map((job) => job.name)) },
			select: { id: true, name: true },
		});
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

	async deleteManyByIds(manager: EntityManager, ids: number[]): Promise<void> {
		if (ids.length > 0) {
			await manager.delete(ScheduledJob, ids);
		}
	}

	/**
	 * Delete all jobs owned by one trigger node; their tasks cascade away.
	 * @returns how many jobs were deleted (0 when the driver can't report it).
	 */
	async deleteByWorkflowNode(
		manager: EntityManager,
		workflowId: string,
		nodeId: string,
	): Promise<number> {
		const result = await manager.delete(ScheduledJob, { workflowId, nodeId });
		return result.affected ?? 0;
	}

	/**
	 * Advance many jobs' clocks, a statement per chunk.
	 * Callers pass distinct ids (a batch of claimed jobs).
	 */
	async advanceMany(
		manager: EntityManager,
		advances: JobAdvance[],
		// Chunked so a large batch stays under the driver's bind-parameter ceiling
		// (Postgres 65535, SQLite 32766); each advance binds four parameters.
		chunkSize = 1000,
	): Promise<void> {
		for (let start = 0; start < advances.length; start += chunkSize) {
			await this.advanceChunk(manager, advances.slice(start, start + chunkSize));
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

/**
 * Ids for `jobs`, in input order, from rows carrying their `{ id, name }`.
 * Throws on a name with no row: the caller zips the result back to `jobs` by
 * index, so a gap would misalign every id after it.
 */
function orderIdsByName(
	rows: Array<{ id: number; name: string }>,
	jobs: NewScheduledJob[],
): number[] {
	const idByName = new Map(rows.map((row) => [row.name, row.id]));
	return jobs.map((job) => {
		const id = idByName.get(job.name);
		if (id === undefined) {
			throw new UnexpectedError(`No row found for scheduled job "${job.name}" after insert`);
		}
		return id;
	});
}
