import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class SqliteLegacyDriverRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'sqlite-legacy-driver-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove SQLite legacy driver',
			description:
				'SQLite now uses WAL (Write-Ahead Logging) mode exclusively, with additional database files',
			category: BreakingChangeCategory.database,
			severity: 'low',
			documentationUrl: 'https://docs.n8n.io/2-0-breaking-changes/#remove-sqlite-legacy-driver',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		const dbType = this.globalConfig.database.type;
		// enableWAL is true if poolSize is > 1
		const enableWAL = this.globalConfig.database.sqlite.enableWAL;

		// Only affected if using SQLite with WAL disabled
		if (dbType === 'sqlite' && !enableWAL) {
			result.isAffected = true;
			result.instanceIssues.push({
				title: 'SQLite legacy driver removed',
				description:
					'SQLite now uses WAL (Write-Ahead Logging) mode exclusively. The legacy driver (DB_SQLITE_POOL_SIZE=0) has been removed. Three database files will be created: database.sqlite (main), database.sqlite-wal (write-ahead log), and database.sqlite-shm (shared memory).',
				level: 'warning',
			});

			result.instanceIssues.push({
				title: 'File system compatibility requirements',
				description:
					'Incompatible file systems include: NFS versions < 4, CIFS/SMB network shares, read-only file systems, and some container overlay filesystems.',
				level: 'warning',
			});

			result.recommendations.push({
				action: 'Set DB_SQLITE_POOL_SIZE to enable WAL mode',
				description:
					'Set DB_SQLITE_POOL_SIZE to a value >= 1 (recommended: 3) to use the modern SQLite driver with WAL mode',
			});

			result.recommendations.push({
				action: 'Update backup procedures',
				description:
					'Ensure backups include all three SQLite files (database.sqlite, database.sqlite-wal, database.sqlite-shm) or use the online backup API',
			});

			result.recommendations.push({
				action: 'Verify file system compatibility',
				description:
					'Verify Docker volumes and file systems support shared memory operations required by WAL mode',
			});

			result.recommendations.push({
				action: 'Rollback procedure if needed',
				description:
					'If rolling back to v1.x, convert back to rollback journal mode using: sqlite3 ~/.n8n/database.sqlite "PRAGMA journal_mode=DELETE;"',
			});
		}

		return result;
	}
}
