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

	async getLicenseRenewalMetrics() {
		const tablePrefix = config.getEnv('database.tablePrefix');

		type Row = {
			enabled_user_count: number;
			active_workflow_count: number;
			total_workflow_count: number;
			total_credentials_count: number;
			production_executions_count: number;
			manual_executions_count: number;
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
				(SELECT COUNT(*) FROM ${tablePrefix}user WHERE disabled = false) AS enabled_user_count,
				(SELECT COUNT(*) FROM ${tablePrefix}workflow_entity WHERE active = true) AS active_workflow_count,
				(SELECT COUNT(*) FROM ${tablePrefix}workflow_entity) AS total_workflow_count,
				(SELECT COUNT(*) FROM ${tablePrefix}credentials_entity) AS total_credentials_count,
				(SELECT COUNT(*) FROM ${tablePrefix}execution_entity WHERE mode != 'manual') AS production_executions_count,
				(SELECT COUNT(*) FROM ${tablePrefix}execution_entity WHERE mode = 'manual') AS manual_executions_count;
		`)) as Row[];

		return {
			enabledUsers,
			activeWorkflows,
			totalWorkflows,
			totalCredentials,
			productionExecutions,
			manualExecutions,
		};
	}
}
