import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publish_history';
const columnName = 'versionId';
const reference: [string, string] = ['workflow_history', 'versionId'];

/**
 * Changes the versionId foreign key on workflow_publish_history from CASCADE
 * to SET NULL, and makes the column nullable. This preserves publish history
 * records when workflow history versions are deleted, instead of cascading
 * the deletion to the publish history.
 */
export class ChangeWorkflowPublishHistoryVersionIdToSetNull1775740765000
	implements ReversibleMigration
{
	async up({ schemaBuilder: { dropForeignKey, addForeignKey, dropNotNull } }: MigrationContext) {
		await dropForeignKey(tableName, columnName, reference);
		await dropNotNull(tableName, columnName);
		await addForeignKey(tableName, columnName, reference, undefined, 'SET NULL');
	}

	async down(mc: MigrationContext) {
		const {
			schemaBuilder: { dropForeignKey, addForeignKey, addNotNull },
		} = mc;

		await dropForeignKey(tableName, columnName, reference);
		await mc.runQuery(`DELETE FROM ${tableName} WHERE ${columnName} IS NULL`);
		await addNotNull(tableName, columnName);
		await addForeignKey(tableName, columnName, reference, undefined, 'CASCADE');
	}
}
