import { DatabaseConfig } from '@n8n/config';
import {
	BaseRepository,
	dbNowLiteral,
	type OperationContext,
	toDialectQuery,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import type { UsageDelta } from './execution-limit-usage.deltas';
import { ExecutionLimitUsage } from './execution-limit-usage.entity';

class ExecutionLimitUsageTable extends BaseRepository<ExecutionLimitUsage> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLimitUsage, dataSource.manager, transactionRunner);
	}
}

const PARAMS_PER_ROW = 5;

/** Keeps one statement far below the bind parameter limit of both databases. */
const ROWS_PER_STATEMENT = 1000;

@Service()
export class ExecutionLimitUsageRepository {
	private readonly table: ExecutionLimitUsageTable;

	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		this.table = new ExecutionLimitUsageTable(dataSource, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	/**
	 * Adds the counts to the usage rows and creates the rows that do not exist. Each key
	 * must occur one time in `deltas`. Pass the fold transaction in `ctx`.
	 */
	async addUsage(deltas: readonly UsageDelta[], ctx: OperationContext): Promise<void> {
		if (!ctx.trx) throw new UnexpectedError('Adding usage needs an active transaction');

		const manager = this.table.managerFor(ctx);
		const table = manager.connection.driver.escape(this.table.metadata.tableName);
		const now = dbNowLiteral(this.isPostgres);

		for (let start = 0; start < deltas.length; start += ROWS_PER_STATEMENT) {
			const chunk = deltas.slice(start, start + ROWS_PER_STATEMENT);
			const values = chunk.map((_, row) => {
				const p = row * PARAMS_PER_ROW;
				return `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, ${now})`;
			});
			const { sql, params } = toDialectQuery(
				this.isPostgres,
				`INSERT INTO ${table} AS u ("projectId", "day", "entityType", "startedCount", "blockedCount", "updatedAt") VALUES ${values.join(', ')} ON CONFLICT ("projectId", "day", "entityType") DO UPDATE SET "startedCount" = u."startedCount" + EXCLUDED."startedCount", "blockedCount" = u."blockedCount" + EXCLUDED."blockedCount", "updatedAt" = EXCLUDED."updatedAt"`,
				chunk.flatMap((d) => [d.projectId, d.day, d.entityType, d.startedCount, d.blockedCount]),
			);
			await manager.query(sql, params);
		}
	}
}
