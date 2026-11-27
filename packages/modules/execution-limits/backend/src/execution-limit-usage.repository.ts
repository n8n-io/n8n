import { DatabaseConfig } from '@n8n/config';
import {
	BaseRepository,
	dbNowLiteral,
	type OperationContext,
	parseDbTime,
	toDialectQuery,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource, LessThan, type ObjectLiteral } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from './execution-limit-instance-usage.entity';
import type { InstanceUsageDelta, UsageDeltas } from './execution-limit-usage.deltas';
import { ExecutionLimitUsage } from './execution-limit-usage.entity';
import { NO_USAGE, type UsageTotals } from './execution-usage';
import { ProjectExecutionLimit } from './project-execution-limit.entity';

class UsageTable<Entity extends ObjectLiteral> extends BaseRepository<Entity> {}

const PROJECT_KEY = ['projectId', 'day', 'entityType'] as const;
const INSTANCE_KEY = ['day', 'entityType'] as const;

/** Keeps one statement far below the bind parameter limit of both databases. */
const ROWS_PER_STATEMENT = 1000;

// Agent runs have rows too, but only workflow runs count toward a limit.
const COUNTED_DAYS = 'u."day" >= $1 AND u."day" <= $2 AND u."entityType" = \'workflow\'';

const TOTALS =
	'COALESCE(SUM(u."startedCount"), 0) AS "startedCount", COALESCE(SUM(u."blockedCount"), 0) AS "blockedCount", MAX(u."updatedAt") AS "lastCountedAt"';

type TotalsRow = {
	startedCount: number | string;
	blockedCount: number | string;
	lastCountedAt: Date | string | null;
};

// Postgres returns a sum as a string.
function toTotals(row: TotalsRow): UsageTotals {
	return {
		startedCount: Number(row.startedCount),
		blockedCount: Number(row.blockedCount),
		lastCountedAt: row.lastCountedAt === null ? null : parseDbTime(row.lastCountedAt),
	};
}

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

	/**
	 * The usage of one project from `firstDay` to `lastDay`, both inclusive UTC days.
	 * Reads `execution_limit_usage` only.
	 */
	async sumProjectUsage(
		projectId: string,
		firstDay: string,
		lastDay: string,
		ctx: OperationContext,
	): Promise<UsageTotals> {
		const [totals] = await this.sumRows<TotalsRow>(
			`SELECT ${TOTALS} FROM ${this.escapedName(ExecutionLimitUsage)} u WHERE ${COUNTED_DAYS} AND u."projectId" = $3`,
			[firstDay, lastDay, projectId],
			ctx,
		);
		return totals ? toTotals(totals) : NO_USAGE;
	}

	/**
	 * The usage of the instance from `firstDay` to `lastDay`, both inclusive UTC days.
	 * Reads `execution_limit_instance_usage` only.
	 */
	async sumInstanceUsage(
		firstDay: string,
		lastDay: string,
		ctx: OperationContext,
	): Promise<UsageTotals> {
		const [totals] = await this.sumRows<TotalsRow>(
			`SELECT ${TOTALS} FROM ${this.escapedName(ExecutionLimitInstanceUsage)} u WHERE ${COUNTED_DAYS}`,
			[firstDay, lastDay],
			ctx,
		);
		return totals ? toTotals(totals) : NO_USAGE;
	}

	/**
	 * The usage of each project that has a limit, in one query. A project with no usage
	 * row in the range is not in the result. Reads `execution_limit_usage` only.
	 */
	async sumUsageOfLimitedProjects(
		firstDay: string,
		lastDay: string,
		ctx: OperationContext,
	): Promise<Map<string, UsageTotals>> {
		const rows = await this.sumRows<TotalsRow & { projectId: string }>(
			`SELECT u."projectId" AS "projectId", ${TOTALS} FROM ${this.escapedName(ExecutionLimitUsage)} u INNER JOIN ${this.escapedName(ProjectExecutionLimit)} l ON l."projectId" = u."projectId" WHERE ${COUNTED_DAYS} GROUP BY u."projectId"`,
			[firstDay, lastDay],
			ctx,
		);
		return new Map(rows.map((row) => [row.projectId, toTotals(row)]));
	}

	/**
	 * Deletes the rows of the UTC days before `cutoffDay`, in the two usage tables.
	 * The day `cutoffDay` stays.
	 */
	async deleteUsageBefore(
		cutoffDay: string,
		ctx: OperationContext,
	): Promise<{ projectRows: number; instanceRows: number }> {
		const before = { day: LessThan(cutoffDay) };
		const project = await this.projectTable.managerFor(ctx).delete(ExecutionLimitUsage, before);
		const instance = await this.instanceTable
			.managerFor(ctx)
			.delete(ExecutionLimitInstanceUsage, before);

		return { projectRows: project.affected ?? 0, instanceRows: instance.affected ?? 0 };
	}

	private escapedName(entity: new () => ObjectLiteral): string {
		const { connection } = this.projectTable.manager;
		return connection.driver.escape(connection.getMetadata(entity).tableName);
	}

	/** `params` starts with the first and the last day. A range with no day reads nothing. */
	private async sumRows<Row>(
		sql: string,
		params: readonly [firstDay: string, lastDay: string, ...rest: string[]],
		ctx: OperationContext,
	): Promise<Row[]> {
		const [firstDay, lastDay] = params;
		if (firstDay > lastDay) return [];

		const query = toDialectQuery(this.isPostgres, sql, params);
		const rows: Row[] = await this.projectTable.managerFor(ctx).query(query.sql, query.params);
		return rows;
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
