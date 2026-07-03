import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { ScheduledJob } from '../entities/scheduled-job';

/** The new clock values for one advanced job. */
export interface JobAdvance {
	id: number;
	nextRunAt: Date | null;
	lastFiredAt: Date | null;
}

@Service()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
	private readonly isPostgres: boolean;

	constructor(dataSource: DataSource, globalConfig: GlobalConfig) {
		super(ScheduledJob, dataSource.manager);
		this.isPostgres = globalConfig.database.type === 'postgresdb';
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
		const nowExpression = this.nowExpression();

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
			now: this.parseDatabaseTime(raw[0].db_now),
			jobs: entities,
		};
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

	/**
	 * @returns the database's current-time expression at millisecond precision, per dialect.
	 */
	private nowExpression(): string {
		return this.isPostgres ? 'CURRENT_TIMESTAMP(3)' : "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')";
	}

	/**
	 * Postgres returns a `Date`.
	 * SQLite returns UTC wall-clock text with no zone.
	 */
	private parseDatabaseTime(value: Date | string): Date {
		return typeof value === 'string' ? new Date(`${value.replace(' ', 'T')}Z`) : value;
	}
}
