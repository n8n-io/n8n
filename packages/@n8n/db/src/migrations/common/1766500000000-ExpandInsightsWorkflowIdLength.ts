import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const INSIGHTS_METADATA_TABLE_NAME = 'insights_metadata';
const INSIGHTS_METADATA_TEMP_TABLE_NAME = 'temp_insights_metadata';
const WORKFLOW_ID_COLUMN_NAME = 'workflowId';

/**
 * This migration expands the workflowId column from varchar(16) to varchar(36)
 * to accommodate frontend-generated workflow IDs which are 21 characters long.
 *
 * Background:
 * - The original analytics/insights tables were created with workflowId as varchar(16)
 * - This matched the backend-generated ID length at the time
 * - PR #21955 introduced frontend-generated workflow IDs using nanoid() which defaults to 21 chars
 * - This caused insights to fail for workflows with 21-char IDs
 *
 * The fix aligns with the codebase standard of varchar(36) for workflowId columns.
 */
export class ExpandInsightsWorkflowIdLength1766500000000 implements IrreversibleMigration {
	async up({
		isSqlite,
		isMysql,
		isPostgres,
		escape,
		copyTable,
		queryRunner,
		schemaBuilder: { createTable, column, dropTable },
	}: MigrationContext) {
		const tableName = escape.tableName(INSIGHTS_METADATA_TABLE_NAME);
		const columnName = escape.columnName(WORKFLOW_ID_COLUMN_NAME);

		if (isSqlite) {
			// SQLite doesn't support ALTER COLUMN, so we need to recreate the table
			const tempTableName = escape.tableName(INSIGHTS_METADATA_TEMP_TABLE_NAME);

			await createTable(INSIGHTS_METADATA_TEMP_TABLE_NAME)
				.withColumns(
					column('metaId').int.primary.autoGenerate2,
					column('workflowId').varchar(36),
					column('projectId').varchar(36),
					column('workflowName').varchar(128).notNull,
					column('projectName').varchar(255).notNull,
				)
				.withForeignKey('workflowId', {
					tableName: 'workflow_entity',
					columnName: 'id',
					onDelete: 'SET NULL',
				})
				.withForeignKey('projectId', {
					tableName: 'project',
					columnName: 'id',
					onDelete: 'SET NULL',
				})
				.withIndexOn('workflowId', true);

			await copyTable(INSIGHTS_METADATA_TABLE_NAME, INSIGHTS_METADATA_TEMP_TABLE_NAME);

			await dropTable(INSIGHTS_METADATA_TABLE_NAME);

			await queryRunner.query(`ALTER TABLE ${tempTableName} RENAME TO ${tableName};`);
		} else if (isMysql) {
			await queryRunner.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} VARCHAR(36);`);
		} else if (isPostgres) {
			await queryRunner.query(
				`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE VARCHAR(36);`,
			);
		}
	}
}
