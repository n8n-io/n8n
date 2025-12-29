import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const INSIGHTS_METADATA_TABLE_NAME = 'insights_metadata';
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
 *
 * Note: SQLite does not enforce VARCHAR length limits, so no migration is needed for SQLite.
 */
export class ExpandInsightsWorkflowIdLength1766500000000 implements IrreversibleMigration {
	async up({ isPostgres, escape, queryRunner }: MigrationContext) {
		// Only PostgreSQL needs this migration:
		// - SQLite does not enforce VARCHAR length constraints
		// - MySQL is no longer supported in n8n 2.0+
		if (isPostgres) {
			const tableName = escape.tableName(INSIGHTS_METADATA_TABLE_NAME);
			const columnName = escape.columnName(WORKFLOW_ID_COLUMN_NAME);

			await queryRunner.query(
				`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE VARCHAR(36);`,
			);
		}
	}
}
