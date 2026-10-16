import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { managerFor } from './execution-ledger.repository';
import type { OperationContext } from '../services/transaction';
import { queryDialect, toSqliteTimestamp, utcDay } from '../utils/dialect-sql';

export type ExecutionQuotaPeriod = 'day' | 'month';

export type ExecutionQuotaScopeType = 'workflow' | 'project';

export type ExecutionQuotaRow = {
	id: number;
	workflowId: string | null;
	projectId: string | null;
	period: ExecutionQuotaPeriod;
	limit: number;
};

/** Net started executions of one scope on one UTC day, to add to the folded total. */
export type ExecutionQuotaUsageIncrement = {
	scopeType: ExecutionQuotaScopeType;
	scopeId: string;
	day: string;
	delta: number;
};

type Scope = { scopeType: ExecutionQuotaScopeType; scopeId: string };

type Window = { start: Date; end: Date };

/** Keeps a multi-row SQLite statement well under the bound-parameter limit. */
const SQLITE_ROWS_PER_STATEMENT = 500;

/** Admin-set execution limits and their folded daily usage. */
@Service()
export class ExecutionQuotaRepository {
	constructor(
		private readonly dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	private get isSqlite() {
		return this.globalConfig.database.type === 'sqlite';
	}

	private escapeTable(name: string) {
		const { tablePrefix } = this.globalConfig.database;
		return this.dataSource.driver.escape(`${tablePrefix}${name}`);
	}

	private async query<T>(ctx: OperationContext, sql: string, params: unknown[] = []) {
		return await queryDialect<T>(
			managerFor(this.dataSource.manager, ctx),
			this.isSqlite,
			sql,
			params,
		);
	}

	/** Day bounds as `YYYY-MM-DD` and timestamp bounds in the dialect's storage format. */
	private bounds(window: Window) {
		const timestamp = (date: Date) => (this.isSqlite ? toSqliteTimestamp(date) : date);
		return {
			startDay: utcDay(window.start),
			endDay: utcDay(window.end),
			start: timestamp(window.start),
			end: timestamp(window.end),
		};
	}

	private dayParam(placeholder: string) {
		return this.isSqlite ? placeholder : `${placeholder}::date`;
	}

	async findAll(): Promise<ExecutionQuotaRow[]> {
		return await this.query(
			{},
			`SELECT "id", "workflowId", "projectId", "period", "limit"
			FROM ${this.escapeTable('execution_quota')}`,
		);
	}

	async setLimit(scope: Scope, period: ExecutionQuotaPeriod, limit: number): Promise<void> {
		const column = scope.scopeType === 'workflow' ? '"workflowId"' : '"projectId"';
		const now = this.isSqlite ? "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')" : 'CURRENT_TIMESTAMP';
		await this.query(
			{},
			`INSERT INTO ${this.escapeTable('execution_quota')} (${column}, "period", "limit")
			VALUES ($1, $2, $3)
			ON CONFLICT (${column}) WHERE ${column} IS NOT NULL
			DO UPDATE SET "period" = EXCLUDED."period", "limit" = EXCLUDED."limit", "updatedAt" = ${now}`,
			[scope.scopeId, period, limit],
		);
	}

	/**
	 * Folded usage plus the unfolded ledger tail, in one statement so it reads one snapshot.
	 * The fold moves rows from the tail to the total atomically, so each one counts once.
	 */
	async countStarted(scope: Scope, window: Window, ctx: OperationContext = {}): Promise<number> {
		const ledgerColumn = scope.scopeType === 'workflow' ? '"workflowId"' : '"projectId"';
		const { startDay, endDay, start, end } = this.bounds(window);
		const rows = await this.query<Array<{ used: string | number }>>(
			ctx,
			`SELECT
				COALESCE((
					SELECT SUM("used") FROM ${this.escapeTable('execution_quota_usage')}
					WHERE "scopeType" = $1 AND "scopeId" = $2
						AND "day" >= ${this.dayParam('$3')} AND "day" < ${this.dayParam('$4')}
				), 0)
				+ COALESCE((
					SELECT SUM("delta") FROM ${this.escapeTable('execution_ledger')}
					WHERE "event" = 'started' AND ${ledgerColumn} = $2
						AND "createdAt" >= $5 AND "createdAt" < $6
				), 0) AS used`,
			[scope.scopeType, scope.scopeId, startDay, endDay, start, end],
		);
		return Number(rows[0].used);
	}

	/** A number that grows with every fold, so a counter can drop a late write from an older one. */
	async nextFoldVersion(ctx: OperationContext): Promise<number> {
		const sequence = this.escapeTable('execution_ledger_fold_seq');
		if (this.isSqlite) {
			await this.query(ctx, `UPDATE ${sequence} SET "value" = "value" + 1 WHERE "id" = 1`);
			const rows = await this.query<Array<{ version: number }>>(
				ctx,
				`SELECT "value" AS version FROM ${sequence} WHERE "id" = 1`,
			);
			return Number(rows[0].version);
		}
		const rows = await this.query<Array<{ version: string }>>(
			ctx,
			`SELECT nextval('${sequence}') AS version`,
		);
		return Number(rows[0].version);
	}

	/** Folded usage of each scope over its window, in input order. */
	async foldedTotals(ctx: OperationContext, items: Array<Scope & Window>): Promise<number[]> {
		if (items.length === 0) return [];

		const usage = this.escapeTable('execution_quota_usage');
		const join = `LEFT JOIN ${usage} u ON u."scopeType" = i."scopeType" AND u."scopeId" = i."scopeId"
			AND u."day" >= i."startDay" AND u."day" < i."endDay"
			GROUP BY i."idx" ORDER BY i."idx"`;
		const days = items.map((item) => ({ ...item, ...this.bounds(item) }));

		if (!this.isSqlite) {
			const rows = await this.query<Array<{ total: string }>>(
				ctx,
				`SELECT COALESCE(SUM(u."used"), 0) AS total
				FROM unnest($1::varchar[], $2::varchar[], $3::date[], $4::date[])
					WITH ORDINALITY AS i("scopeType", "scopeId", "startDay", "endDay", "idx")
				${join}`,
				[
					days.map((i) => i.scopeType),
					days.map((i) => i.scopeId),
					days.map((i) => i.startDay),
					days.map((i) => i.endDay),
				],
			);
			return rows.map((r) => Number(r.total));
		}

		const totals: number[] = [];
		for (let offset = 0; offset < days.length; offset += SQLITE_ROWS_PER_STATEMENT) {
			const chunk = days.slice(offset, offset + SQLITE_ROWS_PER_STATEMENT);
			const values = chunk.map((_, n) => `(?, ?, ?, ?, ${n})`).join(', ');
			const rows: Array<{ total: number }> = await managerFor(this.dataSource.manager, ctx).query(
				`WITH i("scopeType", "scopeId", "startDay", "endDay", "idx") AS (VALUES ${values})
				SELECT COALESCE(SUM(u."used"), 0) AS total FROM i ${join}`,
				chunk.flatMap((i) => [i.scopeType, i.scopeId, i.startDay, i.endDay]),
			);
			totals.push(...rows.map((r) => Number(r.total)));
		}
		return totals;
	}

	/**
	 * State to seed an empty quota counter with, read in one snapshot. Unfolded refunds lower
	 * `folded` now, because the fold will lower the folded total when it reaches them.
	 */
	async counterSeed(
		scope: Scope,
		window: Window,
	): Promise<{ folded: number; incoming: number; version: number }> {
		const ledgerColumn = scope.scopeType === 'workflow' ? '"workflowId"' : '"projectId"';
		const ledger = this.escapeTable('execution_ledger');
		const sequence = this.escapeTable('execution_ledger_fold_seq');
		const version = this.isSqlite
			? `SELECT "value" FROM ${sequence} WHERE "id" = 1`
			: `SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM ${sequence}`;
		const { startDay, endDay, start, end } = this.bounds(window);
		const rows = await this.query<
			Array<{ folded: string | number; incoming: string | number; version: string | number }>
		>(
			{},
			`SELECT
				COALESCE((
					SELECT SUM("used") FROM ${this.escapeTable('execution_quota_usage')}
					WHERE "scopeType" = $1 AND "scopeId" = $2
						AND "day" >= ${this.dayParam('$3')} AND "day" < ${this.dayParam('$4')}
				), 0)
				+ COALESCE((
					SELECT SUM("delta") FROM ${ledger}
					WHERE "event" = 'started' AND ${ledgerColumn} = $2 AND "delta" < 0
						AND "createdAt" >= $5 AND "createdAt" < $6
				), 0) AS folded,
				(
					SELECT COUNT(*) FROM ${ledger}
					WHERE "event" = 'started' AND ${ledgerColumn} = $2 AND "delta" > 0
						AND "createdAt" >= $5 AND "createdAt" < $6
				) AS incoming,
				(${version}) AS version`,
			[scope.scopeType, scope.scopeId, startDay, endDay, start, end],
		);
		return {
			folded: Number(rows[0].folded),
			incoming: Number(rows[0].incoming),
			version: Number(rows[0].version),
		};
	}

	async addUsage(ctx: OperationContext, increments: ExecutionQuotaUsageIncrement[]): Promise<void> {
		if (increments.length === 0) return;

		const usage = this.escapeTable('execution_quota_usage');
		const onConflict = `ON CONFLICT ("scopeType", "scopeId", "day")
			DO UPDATE SET "used" = ${usage}."used" + EXCLUDED."used"`;

		if (!this.isSqlite) {
			await this.query(
				ctx,
				`INSERT INTO ${usage} ("scopeType", "scopeId", "day", "used")
				SELECT * FROM unnest($1::varchar[], $2::varchar[], $3::date[], $4::bigint[])
				${onConflict}`,
				[
					increments.map((i) => i.scopeType),
					increments.map((i) => i.scopeId),
					increments.map((i) => i.day),
					increments.map((i) => i.delta),
				],
			);
			return;
		}

		for (let offset = 0; offset < increments.length; offset += SQLITE_ROWS_PER_STATEMENT) {
			const chunk = increments.slice(offset, offset + SQLITE_ROWS_PER_STATEMENT);
			await managerFor(this.dataSource.manager, ctx).query(
				`INSERT INTO ${usage} ("scopeType", "scopeId", "day", "used")
				VALUES ${chunk.map(() => '(?, ?, ?, ?)').join(', ')}
				${onConflict}`,
				chunk.flatMap((i) => [i.scopeType, i.scopeId, i.day, i.delta]),
			);
		}
	}
}
