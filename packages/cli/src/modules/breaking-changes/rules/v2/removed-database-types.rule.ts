import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class RemovedDatabaseTypesRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'removed-database-types-v2',
			version: 'v2',
			title: 'MySQL/MariaDB database types removed',
			description:
				'MySQL and MariaDB database types have been completely removed and will cause n8n to fail on startup',
			category: BreakingChangeCategory.database,
			severity: BreakingChangeSeverity.critical,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
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
				level: IssueLevel.error,
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
