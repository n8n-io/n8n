import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddWorkflowDescriptionColumn1762177736257 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('description').text], {
			ackThisRecreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['description'], { ackThisRecreatesOnSqlite: true });
	}
}
