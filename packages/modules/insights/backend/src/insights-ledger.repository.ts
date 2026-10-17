import { GlobalConfig } from '@n8n/config';
import { managerFor, toSqliteTimestamp, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { PeriodUnitToNumber } from './insights-shared';

/** Summed value for one (metaId, type) in one UTC hour. */
export type InsightsHourIncrement = { metaId: number; type: number; hour: Date; value: number };

/** Keeps a multi-row SQLite statement well under the bound-parameter limit. */
const SQLITE_ROWS_PER_STATEMENT = 500;

/** Writes the ledger fold's Insights aggregates. */
@Service()
export class InsightsLedgerRepository {
	constructor(
		private readonly dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	private get isSqlite() {
		return this.globalConfig.database.type === 'sqlite';
	}

	private table(name: string) {
		return this.dataSource.driver.escape(`${this.globalConfig.database.tablePrefix}${name}`);
	}

	/**
	 * Upserts metadata for workflows that have an owner project, and returns their metaIds.
	 * Unchanged rows are not rewritten, so a busy workflow does not churn its metadata row.
	 */
	async upsertMetadata(
		ctx: OperationContext,
		workflowNames: Map<string, string>,
	): Promise<Map<string, number>> {
		const manager = managerFor(this.dataSource.manager, ctx);
		const metadata = this.table('insights_metadata');
		const ids = [...workflowNames.keys()];
		const changed = `${metadata}."workflowName" IS NOT EXCLUDED."workflowName"
			OR ${metadata}."projectId" IS NOT EXCLUDED."projectId"
			OR ${metadata}."projectName" IS NOT EXCLUDED."projectName"`;
		const owners = `JOIN ${this.table('shared_workflow')} sw
				ON sw."workflowId" = v."workflowId" AND sw."role" = 'workflow:owner'
			JOIN ${this.table('project')} p ON p."id" = sw."projectId"`;
		const onConflict = `ON CONFLICT ("workflowId") DO UPDATE SET
				"workflowName" = EXCLUDED."workflowName",
				"projectId" = EXCLUDED."projectId",
				"projectName" = EXCLUDED."projectName"
			WHERE ${changed}`;

		if (!this.isSqlite) {
			await manager.query(
				`INSERT INTO ${metadata} ("workflowId", "workflowName", "projectId", "projectName")
				SELECT v."workflowId", v."workflowName", p."id", p."name"
				FROM unnest($1::varchar[], $2::varchar[]) AS v("workflowId", "workflowName")
				${owners}
				${onConflict.replaceAll(' IS NOT ', ' IS DISTINCT FROM ')}`,
				[ids, ids.map((id) => workflowNames.get(id) ?? '')],
			);
			const rows: Array<{ metaId: number; workflowId: string }> = await manager.query(
				`SELECT "metaId", "workflowId" FROM ${metadata} WHERE "workflowId" = ANY($1::varchar[])`,
				[ids],
			);
			return new Map(rows.map((row) => [row.workflowId, row.metaId]));
		}

		const metaIds = new Map<string, number>();
		for (let offset = 0; offset < ids.length; offset += SQLITE_ROWS_PER_STATEMENT) {
			const chunk = ids.slice(offset, offset + SQLITE_ROWS_PER_STATEMENT);
			const placeholders = chunk.map(() => '?').join(', ');
			// `WHERE true` keeps SQLite from reading ON CONFLICT as part of the join.
			await manager.query(
				`INSERT INTO ${metadata} ("workflowId", "workflowName", "projectId", "projectName")
				SELECT v."workflowId", v."workflowName", p."id", p."name"
				FROM (${chunk.map(() => 'SELECT ? AS "workflowId", ? AS "workflowName"').join(' UNION ALL ')}) v
				${owners}
				WHERE true
				${onConflict}`,
				chunk.flatMap((id) => [id, workflowNames.get(id) ?? '']),
			);
			const rows: Array<{ metaId: number; workflowId: string }> = await manager.query(
				`SELECT "metaId", "workflowId" FROM ${metadata} WHERE "workflowId" IN (${placeholders})`,
				chunk,
			);
			for (const row of rows) metaIds.set(row.workflowId, row.metaId);
		}
		return metaIds;
	}

	async addHourlyIncrements(
		ctx: OperationContext,
		increments: InsightsHourIncrement[],
	): Promise<void> {
		if (increments.length === 0) return;

		const manager = managerFor(this.dataSource.manager, ctx);
		const byPeriod = this.table('insights_by_period');
		const onConflict = `ON CONFLICT ("metaId", "type", "periodUnit", "periodStart")
			DO UPDATE SET "value" = ${byPeriod}."value" + EXCLUDED."value"`;

		if (!this.isSqlite) {
			await manager.query(
				`INSERT INTO ${byPeriod} ("metaId", "type", "periodUnit", "periodStart", "value")
				SELECT i."metaId", i."type", ${PeriodUnitToNumber.hour}, i."hour", i."value"
				FROM unnest($1::int[], $2::int[], $3::timestamptz[], $4::bigint[])
					AS i("metaId", "type", "hour", "value")
				${onConflict}`,
				[
					increments.map((i) => i.metaId),
					increments.map((i) => i.type),
					increments.map((i) => i.hour),
					increments.map((i) => i.value),
				],
			);
			return;
		}

		// Same text as Insights compaction writes, so both land on the same unique key.
		for (let offset = 0; offset < increments.length; offset += SQLITE_ROWS_PER_STATEMENT) {
			const chunk = increments.slice(offset, offset + SQLITE_ROWS_PER_STATEMENT);
			await manager.query(
				`INSERT INTO ${byPeriod} ("metaId", "type", "periodUnit", "periodStart", "value")
				VALUES ${chunk.map(() => `(?, ?, ${PeriodUnitToNumber.hour}, ?, ?)`).join(', ')}
				${onConflict}`,
				chunk.flatMap((i) => [i.metaId, i.type, toSqliteTimestamp(i.hour), i.value]),
			);
		}
	}
}
