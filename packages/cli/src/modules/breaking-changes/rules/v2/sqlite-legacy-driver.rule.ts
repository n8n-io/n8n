import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class SqliteLegacyDriverRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'sqlite-legacy-driver-v2',
			version: 'v2',
			title: 'Remove SQLite legacy driver',
			description:
				'SQLite now uses WAL (Write-Ahead Logging) mode exclusively, with additional database files',
			category: BreakingChangeCategory.database,
			severity: BreakingChangeSeverity.high,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		const dbType = this.globalConfig.database.type;
		const poolSize = this.globalConfig.database.sqlite.poolSize;

		// Only affected if using SQLite with poolSize < 1 (legacy driver)
		if (dbType === 'sqlite' && poolSize < 1) {
			result.isAffected = true;
			result.instanceIssues.push({
				title: 'SQLite legacy driver removed',
				description:
					'SQLite now uses WAL (Write-Ahead Logging) mode exclusively. The legacy driver (DB_SQLITE_POOL_SIZE=0) has been removed. Three database files will be created: database.sqlite (main), database.sqlite-wal (write-ahead log), and database.sqlite-shm (shared memory).',
				level: IssueLevel.warning,
			});

			result.instanceIssues.push({
				title: 'File system compatibility requirements',
				description:
					'Incompatible file systems include: NFS versions < 4, CIFS/SMB network shares, read-only file systems, and some container overlay filesystems.',
				level: IssueLevel.warning,
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
