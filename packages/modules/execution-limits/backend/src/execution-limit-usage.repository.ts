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
import { DataSource, type ObjectLiteral } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from './execution-limit-instance-usage.entity';
import type { InstanceUsageDelta, UsageDeltas } from './execution-limit-usage.deltas';
import { ExecutionLimitUsage } from './execution-limit-usage.entity';

class UsageTable<Entity extends ObjectLiteral> extends BaseRepository<Entity> {}

const PROJECT_KEY = ['projectId', 'day', 'entityType'] as const;
const INSTANCE_KEY = ['day', 'entityType'] as const;

/** Keeps one statement far below the bind parameter limit of both databases. */
const ROWS_PER_STATEMENT = 1000;

@Service()
export class ExecutionLimitUsageRepository {
	private readonly projectTable: UsageTable<ExecutionLimitUsage>;

	private readonly instanceTable: UsageTable<ExecutionLimitInstanceUsage>;

	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		const { manager } = dataSource;
		this.projectTable = new UsageTable(ExecutionLimitUsage, manager, transactionRunner);
		this.instanceTable = new UsageTable(ExecutionLimitInstanceUsage, manager, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	/**
	 * Adds the counts to the project rows and the instance rows, and creates the rows
	 * that do not exist. Each key must occur one time in its list. Pass the fold
	 * transaction in `ctx`.
	 */
	async addUsage(deltas: UsageDeltas, ctx: OperationContext): Promise<void> {
		if (!ctx.trx) throw new UnexpectedError('Adding usage needs an active transaction');

		await this.addCounts(this.projectTable, PROJECT_KEY, deltas.projects, ctx);
		await this.addCounts(this.instanceTable, INSTANCE_KEY, deltas.instance, ctx);
	}

	private async addCounts<K extends string, T extends InstanceUsageDelta & Record<K, string>>(
		table: UsageTable<ObjectLiteral>,
		keyColumns: readonly K[],
		deltas: readonly T[],
		ctx: OperationContext,
	): Promise<void> {
		const manager = table.managerFor(ctx);
		const tableName = manager.connection.driver.escape(table.metadata.tableName);
		const now = dbNowLiteral(this.isPostgres);
		const key = keyColumns.map((column) => `"${column}"`).join(', ');
		const paramsPerRow = keyColumns.length + 2;

		for (let start = 0; start < deltas.length; start += ROWS_PER_STATEMENT) {
			const chunk = deltas.slice(start, start + ROWS_PER_STATEMENT);
			const values = chunk.map((_, row) => {
				const first = row * paramsPerRow + 1;
				const placeholders = Array.from({ length: paramsPerRow }, (__, i) => `$${first + i}`);
				return `(${placeholders.join(', ')}, ${now})`;
			});
			const { sql, params } = toDialectQuery(
				this.isPostgres,
				`INSERT INTO ${tableName} AS u (${key}, "startedCount", "blockedCount", "updatedAt") VALUES ${values.join(', ')} ON CONFLICT (${key}) DO UPDATE SET "startedCount" = u."startedCount" + EXCLUDED."startedCount", "blockedCount" = u."blockedCount" + EXCLUDED."blockedCount", "updatedAt" = EXCLUDED."updatedAt"`,
				chunk.flatMap((d) => [
					...keyColumns.map((column) => d[column]),
					d.startedCount,
					d.blockedCount,
				]),
			);
			await manager.query(sql, params);
		}
	}
}
