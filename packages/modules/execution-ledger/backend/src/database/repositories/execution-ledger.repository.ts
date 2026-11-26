import type { ExecutionLedgerBacklogStats } from '@n8n/backend-services';
import { DatabaseConfig } from '@n8n/config';
import {
	BaseRepository,
	type ExecutionLedgerRow,
	type OperationContext,
	parseDbTime,
	toDialectQuery,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from '@n8n/errors';

import { ExecutionLedgerEntity } from '../entities/execution-ledger.entity';
import { parseLedgerRow, type RawLedgerRow } from '../ledger-row.parser';

class ExecutionLedgerTable extends BaseRepository<ExecutionLedgerEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLedgerEntity, dataSource.manager, transactionRunner);
	}
}

export type NewExecutionLedgerRow = Omit<ExecutionLedgerRow, 'id'>;

export type ClaimedBatch = {
	rows: ExecutionLedgerRow[];
	/** Rows with a value that this version does not know. The claim deleted them too. */
	unreadable: RawLedgerRow[];
};

/** The only reader and writer of `execution_ledger`. */
@Service()
export class ExecutionLedgerRepository {
	private readonly table: ExecutionLedgerTable;

	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		this.table = new ExecutionLedgerTable(dataSource, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	/** Pass the transaction of the execution row in `ctx`, so the event commits with it. */
	async append(row: NewExecutionLedgerRow, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(ExecutionLedgerEntity)
			.values(row)
			.updateEntity(false)
			.execute();
	}

	/**
	 * Deletes up to `limit` of the oldest rows and returns them in id order. A rollback of the
	 * transaction in `ctx` puts them back, so the claim is only final when the fold commits.
	 */
	async claimBatch(limit: number, ctx: OperationContext): Promise<ClaimedBatch> {
		if (!ctx.trx) throw new UnexpectedError('Claiming ledger rows needs an active transaction');
		if (!Number.isInteger(limit) || limit < 1) {
			throw new UnexpectedError('The claim limit must be a positive integer', { extra: { limit } });
		}

		const manager = this.table.managerFor(ctx);
		const table = manager.connection.driver.escape(this.table.metadata.tableName);

		const claimed = this.isPostgres
			? await this.query(
					manager,
					// The CTE makes the driver return rows only: a bare DELETE ... RETURNING returns [rows, count].
					`WITH batch AS (DELETE FROM ${table} WHERE "id" IN (SELECT "id" FROM ${table} ORDER BY "id" LIMIT $1) RETURNING *) SELECT * FROM batch ORDER BY "id"`,
					[limit],
				)
			: await this.claimOnSqlite(manager, table, limit);

		const batch: ClaimedBatch = { rows: [], unreadable: [] };
		for (const raw of claimed) {
			const row = parseLedgerRow(raw);
			if (row) batch.rows.push(row);
			else batch.unreadable.push(raw);
		}
		return batch;
	}

	/**
	 * Separate subqueries, because SQLite scans the whole table when MIN and MAX share
	 * one aggregate. Each one is a primary-key lookup on both dialects.
	 */
	async getBacklogStats(): Promise<ExecutionLedgerBacklogStats> {
		const manager = this.table.managerFor({});
		const table = manager.connection.driver.escape(this.table.metadata.tableName);
		const [stats] = await this.query<{ minId: unknown; maxId: unknown; oldest: unknown }>(
			manager,
			`SELECT (SELECT MIN("id") FROM ${table}) AS "minId", (SELECT MAX("id") FROM ${table}) AS "maxId", (SELECT "occurredAt" FROM ${table} WHERE "id" = (SELECT MIN("id") FROM ${table})) AS "oldest"`,
			[],
		);
		const oldest = stats?.oldest;
		const isEmpty = stats?.minId === null || stats?.minId === undefined;

		return {
			rows: isEmpty ? 0 : Number(stats.maxId) - Number(stats.minId) + 1,
			oldestOccurredAt:
				oldest instanceof Date || typeof oldest === 'string' ? parseDbTime(oldest) : null,
		};
	}

	/**
	 * The sqlite-pooled driver drops the rows of a DELETE ... RETURNING. A SELECT and then a
	 * DELETE up to the last id is exact, because the write lock stops new inserts in between.
	 */
	private async claimOnSqlite(
		manager: EntityManager,
		table: string,
		limit: number,
	): Promise<RawLedgerRow[]> {
		const rows = await this.query(manager, `SELECT * FROM ${table} ORDER BY "id" LIMIT $1`, [
			limit,
		]);
		if (rows.length === 0) return rows;

		await this.query(manager, `DELETE FROM ${table} WHERE "id" <= $1`, [rows[rows.length - 1].id]);
		return rows;
	}

	private async query<T = RawLedgerRow>(
		manager: EntityManager,
		rawSql: string,
		rawParams: unknown[],
	): Promise<T[]> {
		const { sql, params } = toDialectQuery(this.isPostgres, rawSql, rawParams);
		const rows: T[] = await manager.query(sql, params);
		return rows;
	}
}
