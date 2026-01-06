import type { IrreversibleMigration, MigrationContext } from '../migration-types';

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
	async up({ escape, queryRunner }: MigrationContext) {
		const tableName = escape.tableName('insights_metadata');
		const columnName = escape.columnName('workflowId');

		await queryRunner.query(
			`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE VARCHAR(36);`,
		);
	}
}
