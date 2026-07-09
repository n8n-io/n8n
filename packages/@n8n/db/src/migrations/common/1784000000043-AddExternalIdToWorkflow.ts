import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddExternalIdToWorkflow1784000000043 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('workflow_entity', [column('externalId').varchar()], {
			recreatesOnSqlite: true,
		});

		await createIndex(
			'workflow_entity',
			['externalId'],
			true,
			undefined,
			'"externalId" IS NOT NULL',
		);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('workflow_entity', ['externalId']);
		await dropColumns('workflow_entity', ['externalId'], {
			recreatesOnSqlite: true,
		});
	}
}
