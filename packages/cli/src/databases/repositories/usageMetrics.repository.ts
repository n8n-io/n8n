import config from '@/config';
import { Service } from 'typedi';
import { DataSource, Repository, Entity } from 'typeorm';

@Entity()
export class UsageMetrics {}

@Service()
export class UsageMetricsRepository extends Repository<UsageMetrics> {
	constructor(dataSource: DataSource) {
		super(UsageMetrics, dataSource.manager);
	}

	get fullPrefix() {
		const tablePrefix = config.getEnv('database.tablePrefix');

		const pgSchema = config.getEnv('database.postgresdb.schema');

		if (pgSchema !== 'public') return [pgSchema, tablePrefix].join('.');

		return tablePrefix;
	}

	async getLicenseRenewalMetrics() {
		type Row = {
			enabled_user_count: string | number;
			active_workflow_count: string | number;
			total_workflow_count: string | number;
			total_credentials_count: string | number;
			production_executions_count: string | number;
			manual_executions_count: string | number;
		};

		const [
			{
				enabled_user_count: enabledUsers,
				active_workflow_count: activeWorkflows,
				total_workflow_count: totalWorkflows,
				total_credentials_count: totalCredentials,
				production_executions_count: productionExecutions,
				manual_executions_count: manualExecutions,
			},
		] = (await this.query(`
			SELECT
				(SELECT COUNT(*) FROM ${this.fullPrefix}user WHERE disabled = false) AS enabled_user_count,
				(SELECT COUNT(*) FROM ${this.fullPrefix}workflow_entity WHERE active = true) AS active_workflow_count,
				(SELECT COUNT(*) FROM ${this.fullPrefix}workflow_entity) AS total_workflow_count,
				(SELECT COUNT(*) FROM ${this.fullPrefix}credentials_entity) AS total_credentials_count,
				(SELECT SUM(count) FROM ${this.fullPrefix}workflow_statistics WHERE name IN ('production_success', 'production_error')) AS production_executions_count,
				(SELECT SUM(count) FROM ${this.fullPrefix}workflow_statistics WHERE name IN ('manual_success', 'manual_error')) AS manual_executions_count;
		`)) as Row[];

		const toNumber = (value: string | number) =>
			typeof value === 'number' ? value : parseInt(value, 10);

		return {
			enabledUsers: toNumber(enabledUsers),
			activeWorkflows: toNumber(activeWorkflows),
			totalWorkflows: toNumber(totalWorkflows),
			totalCredentials: toNumber(totalCredentials),
			productionExecutions: toNumber(productionExecutions),
			manualExecutions: toNumber(manualExecutions),
		};
	}
}
