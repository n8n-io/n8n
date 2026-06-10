import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSizeBytesAndWorkflowVersionIdToExecutionEntity1784000000029
	implements ReversibleMigration
{
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const sizeBytes = escape.columnName('sizeBytes');
		const workflowVersionId = escape.columnName('workflowVersionId');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${sizeBytes} BIGINT DEFAULT NULL`);
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${workflowVersionId} VARCHAR(36) DEFAULT NULL`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const sizeBytes = escape.columnName('sizeBytes');
		const workflowVersionId = escape.columnName('workflowVersionId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${workflowVersionId}`);
		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${sizeBytes}`);
	}
}
