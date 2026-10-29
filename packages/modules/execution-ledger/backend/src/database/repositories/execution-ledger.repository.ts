import { DatabaseConfig } from '@n8n/config';
import {
	BaseRepository,
	EXECUTION_LEDGER_BLOCKED_BY,
	EXECUTION_LEDGER_ENTITY_TYPES,
	EXECUTION_LEDGER_EVENTS,
	EXECUTION_LEDGER_ORIGINS,
	EXECUTION_LEDGER_OUTCOMES,
	type ExecutionLedgerRow,
	isOneOf,
	type OperationContext,
	parseDbTime,
	toDialectQuery,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { ExecutionLedgerEntity } from '../entities/execution-ledger.entity';

class ExecutionLedgerTable extends BaseRepository<ExecutionLedgerEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLedgerEntity, dataSource.manager, transactionRunner);
	}
}

export type NewExecutionLedgerRow = Omit<ExecutionLedgerRow, 'id'>;

type RawLedgerRow = Record<keyof ExecutionLedgerRow, unknown>;

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
	async claimBatch(limit: number, ctx: OperationContext): Promise<ExecutionLedgerRow[]> {
		if (!ctx.trx) throw new UnexpectedError('Claiming ledger rows needs an active transaction');
		if (!Number.isInteger(limit) || limit < 1) {
			throw new UnexpectedError('The claim limit must be a positive integer', { extra: { limit } });
		}

		const manager = this.table.managerFor(ctx);
		const table = manager.connection.driver.escape(this.table.metadata.tableName);

		const rows = this.isPostgres
			? await this.query(
					manager,
					// The CTE makes the driver return rows only: a bare DELETE ... RETURNING returns [rows, count].
					`WITH batch AS (DELETE FROM ${table} WHERE "id" IN (SELECT "id" FROM ${table} ORDER BY "id" LIMIT $1) RETURNING *) SELECT * FROM batch ORDER BY "id"`,
					[limit],
				)
			: await this.claimOnSqlite(manager, table, limit);

		return rows.map(toLedgerRow);
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

	private async query(
		manager: EntityManager,
		rawSql: string,
		rawParams: unknown[],
	): Promise<RawLedgerRow[]> {
		const { sql, params } = toDialectQuery(this.isPostgres, rawSql, rawParams);
		const rows: RawLedgerRow[] = await manager.query(sql, params);
		return rows;
	}
}

function toLedgerRow(raw: RawLedgerRow): ExecutionLedgerRow {
	const { entityType, event, outcome, blockedBy, origin, occurredAt } = raw;
	if (
		!isOneOf(EXECUTION_LEDGER_ENTITY_TYPES, entityType) ||
		!isOneOf(EXECUTION_LEDGER_EVENTS, event) ||
		!isOneOf(EXECUTION_LEDGER_OUTCOMES, outcome) ||
		!isOneOf(EXECUTION_LEDGER_BLOCKED_BY, blockedBy) ||
		!isOneOf(EXECUTION_LEDGER_ORIGINS, origin) ||
		!(occurredAt instanceof Date || typeof occurredAt === 'string')
	) {
		throw new UnexpectedError('Ledger row has an unexpected value', { extra: { id: raw.id } });
	}

	return {
		id: String(raw.id),
		executionId: String(raw.executionId),
		occurredAt: parseDbTime(occurredAt),
		entityType,
		entityName: String(raw.entityName),
		entityId: String(raw.entityId),
		projectId: String(raw.projectId),
		mode: String(raw.mode),
		source: String(raw.source),
		event,
		outcome,
		blockedBy,
		runtimeMs: Number(raw.runtimeMs),
		timeSavedMin: Number(raw.timeSavedMin),
		origin,
		eventId: String(raw.eventId),
	};
}
