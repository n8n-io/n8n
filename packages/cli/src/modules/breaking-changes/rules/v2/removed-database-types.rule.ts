import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class RemovedDatabaseTypesRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'removed-database-types-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'MySQL/MariaDB database types removed',
			description:
				'MySQL and MariaDB database types have been completely removed and will cause n8n to fail on startup',
			category: BreakingChangeCategory.database,
			severity: 'critical',
			documentationUrl: 'https://docs.n8n.io/2-0-breaking-changes/#drop-mysqlmariadb-support',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		const dbType = this.globalConfig.database.type;

		if (dbType === 'mysqldb' || dbType === 'mariadb') {
			result.isAffected = true;
			result.instanceIssues.push({
				title: `${dbType === 'mysqldb' ? 'MySQL' : 'MariaDB'} database type removed`,
				description:
					'MySQL and MariaDB database types have been completely removed in v2. n8n will fail to start with this database configuration.',
				level: 'error',
			});

			result.recommendations.push({
				action: 'Migrate to PostgreSQL or SQLite before upgrading',
				description:
					'You must migrate your database to PostgreSQL or SQLite before upgrading to v2. Use the database migration tool if available, or export/import your workflows and credentials.',
			});
		}

		return result;
	}
}
