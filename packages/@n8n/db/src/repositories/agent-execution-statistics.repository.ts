import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Between, DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { buildStatisticsDeltaClaimQuery } from './statistics-delta';
import { AgentExecutionStatistics } from '../entities/agent-execution-statistics';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class AgentExecutionStatisticsTable extends BaseRepository<AgentExecutionStatistics> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentExecutionStatistics, dataSource.manager, transactionRunner);
	}
}

@Service()
export class AgentExecutionStatisticsRepository {
	private readonly table: AgentExecutionStatisticsTable;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly globalConfig: GlobalConfig,
	) {
		this.table = new AgentExecutionStatisticsTable(dataSource, transactionRunner);
	}

	private toTableName(name: string, ctx: OperationContext): string {
		return this.table
			.managerFor(ctx)
			.connection.driver.escape(`${this.globalConfig.database.tablePrefix}${name}`);
	}

	async recordAgentExecution(now = new Date(), ctx: OperationContext = {}): Promise<void> {
		const manager = this.table.managerFor(ctx);
		const periodStart = new Date(now);
		periodStart.setUTCHours(0, 0, 0, 0);
		if (this.globalConfig.database.type === 'postgresdb') {
			await manager.query(
				`INSERT INTO ${this.toTableName('agent_execution_statistics_delta', ctx)} ("periodStart") VALUES ($1)`,
				[periodStart],
			);
			return;
		}
		const table = this.toTableName('agent_execution_statistics', ctx);
		const count = manager.connection.driver.escape('count');
		const period = manager.connection.driver.escape('periodStart');
		const [query, parameters] = manager
			.createQueryBuilder()
			.insert()
			.into(AgentExecutionStatistics)
			.values({ periodStart, count: 1 })
			.getQueryAndParameters();
		await manager.query(
			`${query} ON CONFLICT (${period}) DO UPDATE SET ${count} = ${table}.${count} + 1`,
			parameters,
		);
	}

	async rollupAgentIncrements(ctx: OperationContext, batchSize: number): Promise<number> {
		const manager = this.table.managerFor(ctx);
		const stats = this.toTableName('agent_execution_statistics', ctx);
		const delta = this.toTableName('agent_execution_statistics_delta', ctx);
		const claimBatch = buildStatisticsDeltaClaimQuery(delta, ['"periodStart"']);
		const [result] = await manager.query<Array<{ increments: number }>>(
			`WITH batch AS (${claimBatch}),
			agg AS (
				SELECT "periodStart", COUNT(*) AS "count" FROM batch GROUP BY "periodStart"
			),
			upsert AS (
				INSERT INTO ${stats} ("periodStart", "count")
				SELECT "periodStart", "count" FROM agg
				ON CONFLICT ("periodStart") DO UPDATE SET "count" = ${stats}."count" + EXCLUDED."count"
			)
			SELECT COUNT(*)::int AS increments FROM batch`,
			[batchSize],
		);
		return result.increments;
	}

	async getDailyAgentExecutions(
		{ startDate, endDate }: { startDate: Date; endDate: Date },
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		const rows = await this.table.managerFor(ctx).find(AgentExecutionStatistics, {
			where: { periodStart: Between(startDate, endDate) },
		});
		return new Map(
			rows.map(({ periodStart, count }) => [periodStart.toISOString().slice(0, 10), count]),
		);
	}

	async getFirstAgentExecutionDate(ctx: OperationContext = {}): Promise<Date | null> {
		const [first] = await this.table.managerFor(ctx).find(AgentExecutionStatistics, {
			order: { periodStart: 'ASC' },
			take: 1,
		});
		return first?.periodStart ?? null;
	}
}
