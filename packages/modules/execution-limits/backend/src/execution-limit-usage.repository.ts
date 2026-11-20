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
import { NO_USAGE, type UsageTotals } from './execution-usage.types';
import { ProjectExecutionLimit } from './project-execution-limit.entity';

class UsageTable<Entity extends ObjectLiteral> extends BaseRepository<Entity> {}

const PROJECT_KEY = ['projectId', 'day', 'entityType'] as const;
const INSTANCE_KEY = ['day', 'entityType'] as const;

/** Keeps one statement far below the bind parameter limit of both databases. */
const ROWS_PER_STATEMENT = 1000;

/** Agent runs have rows too, but only workflow runs count toward a limit. */
const COUNTED_ENTITY_TYPE = 'workflow';

const TOTALS =
	'COALESCE(SUM(u."startedCount"), 0) AS "startedCount", COALESCE(SUM(u."blockedCount"), 0) AS "blockedCount", MAX(u."updatedAt") AS "lastFoldAt"';

type TotalsRow = { startedCount: unknown; blockedCount: unknown; lastFoldAt: unknown };

function isTotalsRow(row: unknown): row is TotalsRow {
	return (
		typeof row === 'object' &&
		row !== null &&
		'startedCount' in row &&
		'blockedCount' in row &&
		'lastFoldAt' in row
	);
}

// Postgres returns a `Date`. SQLite returns its UTC text form, `YYYY-MM-DD HH:MM:SS.SSS`.
function toDate(value: unknown): Date | null {
	if (value instanceof Date) return value;
	if (typeof value !== 'string') return null;
	return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
}

function toTotals(row: unknown): UsageTotals {
	if (!isTotalsRow(row)) throw new UnexpectedError('Unexpected row from a usage sum');
	return {
		startedCount: Number(row.startedCount),
		blockedCount: Number(row.blockedCount),
		lastFoldAt: toDate(row.lastFoldAt),
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
		if (firstDay > lastDay) return NO_USAGE;

		const [row] = await this.queryRows(
			`SELECT ${TOTALS} FROM ${this.escapedName(ExecutionLimitUsage)} u WHERE u."projectId" = $1 AND u."entityType" = $2 AND u."day" >= $3 AND u."day" <= $4`,
			[projectId, COUNTED_ENTITY_TYPE, firstDay, lastDay],
			ctx,
		);
		return toTotals(row);
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
		if (firstDay > lastDay) return NO_USAGE;

		const [row] = await this.queryRows(
			`SELECT ${TOTALS} FROM ${this.escapedName(ExecutionLimitInstanceUsage)} u WHERE u."entityType" = $1 AND u."day" >= $2 AND u."day" <= $3`,
			[COUNTED_ENTITY_TYPE, firstDay, lastDay],
			ctx,
		);
		return toTotals(row);
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
		const totals = new Map<string, UsageTotals>();
		if (firstDay > lastDay) return totals;

		const rows = await this.queryRows(
			`SELECT u."projectId" AS "projectId", ${TOTALS} FROM ${this.escapedName(ExecutionLimitUsage)} u INNER JOIN ${this.escapedName(ProjectExecutionLimit)} l ON l."projectId" = u."projectId" WHERE u."entityType" = $1 AND u."day" >= $2 AND u."day" <= $3 GROUP BY u."projectId"`,
			[COUNTED_ENTITY_TYPE, firstDay, lastDay],
			ctx,
		);

		for (const row of rows) {
			if (typeof row !== 'object' || row === null || !('projectId' in row)) continue;
			if (typeof row.projectId === 'string') totals.set(row.projectId, toTotals(row));
		}
		return totals;
	}

	private escapedName(entity: new () => ObjectLiteral): string {
		const { connection } = this.projectTable.manager;
		return connection.driver.escape(connection.getMetadata(entity).tableName);
	}

	private async queryRows(
		sql: string,
		params: readonly unknown[],
		ctx: OperationContext,
	): Promise<unknown[]> {
		const query = toDialectQuery(this.isPostgres, sql, params);
		const rows: unknown = await this.projectTable.managerFor(ctx).query(query.sql, query.params);
		return Array.isArray(rows) ? rows : [];
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
