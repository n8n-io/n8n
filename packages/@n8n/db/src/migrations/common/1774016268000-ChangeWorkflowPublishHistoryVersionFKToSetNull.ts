import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publish_history';

/**
 * Changes the foreign key constraint on workflow_publish_history.versionId
 * from CASCADE to SET NULL. Previously, deleting a workflow history version
 * would cascade-delete all associated publish history records. With SET NULL,
 * publish history records are preserved (with versionId set to NULL) so the
 * publish timeline remains intact even after version cleanup.
 */
export class ChangeWorkflowPublishHistoryVersionFKToSetNull1774016268000
	implements ReversibleMigration
{
	async up({ schemaBuilder: { dropForeignKey, addForeignKey, dropNotNull } }: MigrationContext) {
		await dropNotNull(tableName, 'versionId');

		await dropForeignKey(tableName, 'versionId', ['workflow_history', 'versionId']);
		await addForeignKey(
			tableName,
			'versionId',
			['workflow_history', 'versionId'],
			undefined,
			'SET NULL',
		);
	}

	async down({ schemaBuilder: { dropForeignKey, addForeignKey, addNotNull } }: MigrationContext) {
		await dropForeignKey(tableName, 'versionId', ['workflow_history', 'versionId']);
		await addForeignKey(
			tableName,
			'versionId',
			['workflow_history', 'versionId'],
			undefined,
			'CASCADE',
		);

		await addNotNull(tableName, 'versionId');
	}
}
