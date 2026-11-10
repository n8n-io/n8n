import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Between, DataSource, Repository, Entity } from '@n8n/typeorm';

import { AgentExecutionStatistics } from '../entities/agent-execution-statistics';

@Entity()
export class LicenseMetrics {}

@Service()
export class LicenseMetricsRepository extends Repository<LicenseMetrics> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(LicenseMetrics, dataSource.manager);
	}

	toTableName(name: string) {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}

	toColumnName(name: string) {
		return this.manager.connection.driver.escape(name);
	}

	async recordAgentExecution(now = new Date()): Promise<void> {
		const periodStart = new Date(now);
		periodStart.setUTCHours(0, 0, 0, 0);
		const table = this.toTableName('agent_execution_statistics');
		const count = this.toColumnName('count');
		const period = this.toColumnName('periodStart');
		const [query, parameters] = this.manager
			.createQueryBuilder()
			.insert()
			.into(AgentExecutionStatistics)
			.values({ periodStart, count: 1 })
			.getQueryAndParameters();
		await this.query(
			`${query} ON CONFLICT (${period}) DO UPDATE SET ${count} = ${table}.${count} + 1`,
			parameters,
		);
	}

	async getDailyAgentExecutions({
		startDate,
		endDate,
	}: { startDate: Date; endDate: Date }): Promise<Map<string, number>> {
		const rows = await this.manager.find(AgentExecutionStatistics, {
			where: { periodStart: Between(startDate, endDate) },
		});
		return new Map(
			rows.map(({ periodStart, count }) => [periodStart.toISOString().slice(0, 10), count]),
		);
	}

	async getFirstAgentExecutionDate(): Promise<Date | null> {
		const [first] = await this.manager.find(AgentExecutionStatistics, {
			order: { periodStart: 'ASC' },
			take: 1,
		});
		return first?.periodStart ?? null;
	}

	async getLicenseRenewalMetrics() {
		type Row = {
			enabled_user_count: string | number;
			total_user_count: string | number;
			active_workflow_count: string | number;
			total_workflow_count: string | number;
			total_credentials_count: string | number;
			production_executions_count: string | number;
			production_root_executions_count: string | number;
			manual_executions_count: string | number;
			evaluations_count: string | number;
		};

		const userTable = this.toTableName('user');
		const workflowTable = this.toTableName('workflow_entity');
		const credentialTable = this.toTableName('credentials_entity');
		const workflowStatsTable = this.toTableName('workflow_statistics');
		const agentStatsTable = this.toTableName('agent_execution_statistics');
		const agentExecutions = `(SELECT COALESCE(SUM(count), 0) FROM ${agentStatsTable})`;
		const testRunTable = this.toTableName('test_run');
		// Service accounts share the user table but do not take a seat.
		const isPerson = `${this.toColumnName('kind')} = 'person'`;

		const [
			{
				enabled_user_count: enabledUsers,
				total_user_count: totalUsers,
				active_workflow_count: activeWorkflows,
				total_workflow_count: totalWorkflows,
				total_credentials_count: totalCredentials,
				production_executions_count: productionExecutions,
				production_root_executions_count: productionRootExecutions,
				manual_executions_count: manualExecutions,
				evaluations_count: evaluations,
			},
		] = (await this.query(`
			SELECT
				(SELECT COUNT(*) FROM ${userTable} WHERE disabled = false AND ${isPerson}) AS enabled_user_count,
				(SELECT COUNT(*) FROM ${userTable} WHERE ${isPerson}) AS total_user_count,
				(SELECT COUNT(*) FROM ${workflowTable} WHERE ${this.toColumnName('activeVersionId')} IS NOT NULL) AS active_workflow_count,
				(SELECT COUNT(*) FROM ${workflowTable}) AS total_workflow_count,
				(SELECT COUNT(*) FROM ${credentialTable}) AS total_credentials_count,
				(SELECT COALESCE(SUM(count), 0) FROM ${workflowStatsTable} WHERE name IN ('production_success', 'production_error')) + ${agentExecutions} AS production_executions_count,
				(SELECT COALESCE(SUM(${this.toColumnName('rootCount')}), 0) FROM ${workflowStatsTable} WHERE name IN ('production_success', 'production_error')) + ${agentExecutions} AS production_root_executions_count,
				(SELECT SUM(count) FROM ${workflowStatsTable} WHERE name IN ('manual_success', 'manual_error')) AS manual_executions_count,
				(SELECT COUNT(distinct ${this.toColumnName('workflowId')}) FROM ${testRunTable}) AS evaluations_count;
		`)) as Row[];

		const toNumber = (value: string | number) =>
			(typeof value === 'number' ? value : parseInt(value, 10)) || 0;

		return {
			enabledUsers: toNumber(enabledUsers),
			totalUsers: toNumber(totalUsers),
			activeWorkflows: toNumber(activeWorkflows),
			totalWorkflows: toNumber(totalWorkflows),
			totalCredentials: toNumber(totalCredentials),
			productionExecutions: toNumber(productionExecutions),
			productionRootExecutions: toNumber(productionRootExecutions),
			manualExecutions: toNumber(manualExecutions),
			evaluations: toNumber(evaluations),
		};
	}
}
