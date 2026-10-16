import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import {
	UnexpectedError,
	type ExecutionStatus,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
} from 'n8n-workflow';

import type { OperationContext } from '../services/transaction';
import { TypeOrmTransaction } from '../services/typeorm-transaction';
import { fromDbTimestamp, queryDialect, toSqliteTimestamp } from '../utils/dialect-sql';

export type ExecutionLedgerEvent = 'started' | 'finished';

/** One claimed ledger row, as handed to the fold participants. */
export type ExecutionLedgerRow = {
	id: string;
	event: ExecutionLedgerEvent;
	workflowId: string;
	projectId: string | null;
	workflowName: string | null;
	mode: WorkflowExecuteMode;
	status: ExecutionStatus | null;
	source: WorkflowExecutionSource | null;
	delta: number;
	runtimeMs: number | null;
	timeSavedMin: number | null;
	createdAt: Date;
};

type StartedEntry = { workflowId: string; projectId: string | null; mode: WorkflowExecuteMode };

/** The resolved manager of a context, or the default one outside a transaction. */
export function managerFor(defaultManager: EntityManager, ctx: OperationContext): EntityManager {
	if (!ctx.trx) return defaultManager;
	if (!(ctx.trx instanceof TypeOrmTransaction)) {
		throw new UnexpectedError('Transaction was not created by the TypeORM runner');
	}
	return ctx.trx.getEntityManager();
}

/** Append-only buffer of execution lifecycle events. */
@Service()
export class ExecutionLedgerRepository {
	constructor(
		private readonly dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	private get isSqlite() {
		return this.globalConfig.database.type === 'sqlite';
	}

	private table() {
		const { tablePrefix } = this.globalConfig.database;
		return this.dataSource.driver.escape(`${tablePrefix}execution_ledger`);
	}

	private timestamp(date: Date) {
		return this.isSqlite ? toSqliteTimestamp(date) : date;
	}

	private async query<T>(ctx: OperationContext, sql: string, params: unknown[] = []) {
		return await queryDialect<T>(
			managerFor(this.dataSource.manager, ctx),
			this.isSqlite,
			sql,
			params,
		);
	}

	/**
	 * `createdAt` pins the row to the period a quota counter already charged. On the database
	 * quota path, the caller must not hold a transaction, so the row commits before any read.
	 */
	async appendStarted(
		entry: StartedEntry & { createdAt?: Date },
		ctx: OperationContext = {},
	): Promise<{ createdAt: Date }> {
		const createdAt = entry.createdAt ?? new Date();
		await this.query(
			ctx,
			`INSERT INTO ${this.table()} ("event", "workflowId", "projectId", "mode", "createdAt")
			VALUES ('started', $1, $2, $3, $4)`,
			[entry.workflowId, entry.projectId, entry.mode, this.timestamp(createdAt)],
		);
		return { createdAt };
	}

	/** Cancels one started row. Keeps its timestamp so it lands in the same period. */
	async appendStartedCompensation(
		entry: StartedEntry & { createdAt: Date },
		ctx: OperationContext = {},
	): Promise<void> {
		await this.query(
			ctx,
			`INSERT INTO ${this.table()} ("event", "workflowId", "projectId", "mode", "delta", "createdAt")
			VALUES ('started', $1, $2, $3, -1, $4)`,
			[entry.workflowId, entry.projectId, entry.mode, this.timestamp(entry.createdAt)],
		);
	}

	async appendFinished(entry: {
		workflowId: string;
		workflowName: string | null;
		mode: WorkflowExecuteMode;
		status: ExecutionStatus;
		source: WorkflowExecutionSource | null;
		runtimeMs?: number | null;
		timeSavedMin?: number | null;
	}): Promise<void> {
		await this.query(
			{},
			`INSERT INTO ${this.table()}
				("event", "workflowId", "workflowName", "mode", "status", "source", "runtimeMs",
				"timeSavedMin", "createdAt")
			VALUES ('finished', $1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				entry.workflowId,
				entry.workflowName,
				entry.mode,
				entry.status,
				entry.source,
				entry.runtimeMs ?? null,
				entry.timeSavedMin ?? null,
				this.timestamp(new Date()),
			],
		);
	}

	/** Deletes and returns the oldest rows, so a row is folded at most once. */
	async claimBatch(ctx: OperationContext, batchSize: number): Promise<ExecutionLedgerRow[]> {
		const table = this.table();
		const columns = `"id", "event", "workflowId", "projectId", "workflowName", "mode", "status",
			"source", "delta", "runtimeMs", "timeSavedMin", "createdAt"`;

		if (!this.isSqlite) {
			// Wrapped in a CTE: TypeORM returns `[rows, count]` for a bare DELETE.
			return await this.query<ExecutionLedgerRow[]>(
				ctx,
				`WITH batch AS (
					DELETE FROM ${table}
					WHERE "id" IN (SELECT "id" FROM ${table} ORDER BY "id" LIMIT $1)
					RETURNING ${columns}
				)
				SELECT * FROM batch ORDER BY "id"`,
				[batchSize],
			);
		}

		// SQLite has one write connection, so nothing can change the batch between the two statements.
		const rows = await this.query<Array<ExecutionLedgerRow & { createdAt: Date | string }>>(
			ctx,
			`SELECT ${columns} FROM ${table} ORDER BY "id" LIMIT $1`,
			[batchSize],
		);
		if (rows.length === 0) return [];
		await this.query(
			ctx,
			`DELETE FROM ${table} WHERE "id" IN (SELECT "id" FROM ${table} ORDER BY "id" LIMIT $1)`,
			[batchSize],
		);
		return rows.map((row) => ({ ...row, createdAt: fromDbTimestamp(row.createdAt) }));
	}
}
