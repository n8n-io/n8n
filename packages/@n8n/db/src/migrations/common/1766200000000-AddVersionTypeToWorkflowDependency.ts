import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddVersionTypeToWorkflowDependency1766200000000 implements ReversibleMigration {
	async up({ runQuery, escape }: MigrationContext) {
		const tableName = escape.tableName('workflow_dependency');
		const versionType = escape.columnName('versionType');
		const workflowId = escape.columnName('workflowId');

		// Add versionType column with default 'draft'
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${versionType} VARCHAR(16) NOT NULL DEFAULT 'draft'`,
		);

		// Add composite index on (workflowId, versionType)
		await runQuery(
			`CREATE INDEX ${escape.indexName('workflow_dependency_workflow_version_type')} ON ${tableName} (${workflowId}, ${versionType})`,
		);

		// Add individual index on versionType
		await runQuery(
			`CREATE INDEX ${escape.indexName('workflow_dependency_version_type')} ON ${tableName} (${versionType})`,
		);
	}

	async down({ runQuery, escape, isMysql }: MigrationContext) {
		const tableName = escape.tableName('workflow_dependency');
		const versionType = escape.columnName('versionType');

		// Drop indexes first
		const versionTypeIndex = escape.indexName('workflow_dependency_version_type');
		const workflowVersionTypeIndex = escape.indexName('workflow_dependency_workflow_version_type');

		await runQuery(
			isMysql
				? `ALTER TABLE ${tableName} DROP INDEX ${versionTypeIndex}`
				: `DROP INDEX ${versionTypeIndex}`,
		);
		await runQuery(
			isMysql
				? `ALTER TABLE ${tableName} DROP INDEX ${workflowVersionTypeIndex}`
				: `DROP INDEX ${workflowVersionTypeIndex}`,
		);

		// Drop column
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${versionType}`);
	}
}
