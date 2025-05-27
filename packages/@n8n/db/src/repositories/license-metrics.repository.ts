import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository, Entity } from '@n8n/typeorm';

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
		const testRunTable = this.toTableName('test_run');

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
				(SELECT COUNT(*) FROM ${userTable} WHERE disabled = false) AS enabled_user_count,
				(SELECT COUNT(*) FROM ${userTable}) AS total_user_count,
				(SELECT COUNT(*) FROM ${workflowTable} WHERE active = true) AS active_workflow_count,
				(SELECT COUNT(*) FROM ${workflowTable}) AS total_workflow_count,
				(SELECT COUNT(*) FROM ${credentialTable}) AS total_credentials_count,
				(SELECT SUM(count) FROM ${workflowStatsTable} WHERE name IN ('production_success', 'production_error')) AS production_executions_count,
				(SELECT SUM(${this.toColumnName('rootCount')}) FROM ${workflowStatsTable} WHERE name IN ('production_success', 'production_error')) AS production_root_executions_count,
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
