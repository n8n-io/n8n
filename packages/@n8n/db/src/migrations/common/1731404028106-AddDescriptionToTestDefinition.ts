import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddDescriptionToTestDefinition1731404028106 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('test_definition', [column('description').text]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('test_definition', ['description']);
	}
}
