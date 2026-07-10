import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddCredentialDescriptionColumn1784000000045 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('credentials_entity', [column('description').text], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('credentials_entity', ['description'], { recreatesOnSqlite: true });
	}
}
