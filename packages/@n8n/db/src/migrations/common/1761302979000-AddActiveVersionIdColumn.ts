import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddActiveVersionIdColumn1761302979000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, addForeignKey }, runQuery }: MigrationContext) {
		await addColumns('workflow_entity', [column('activeVersionId').varchar(36)]);

		await addForeignKey(
			'workflow_entity',
			'activeVersionId',
			['workflow_history', 'versionId'],
			undefined,
			'SET NULL',
		);

		// For existing ACTIVE workflows, set activeVersionId = versionId
		await runQuery('UPDATE workflow_entity SET activeVersionId = versionId WHERE active = true');
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey('workflow_entity', 'activeVersionId', ['workflow_history', 'versionId']);
		await dropColumns('workflow_entity', ['activeVersionId']);
	}
}
