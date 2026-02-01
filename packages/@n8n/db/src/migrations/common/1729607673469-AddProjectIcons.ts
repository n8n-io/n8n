import type { MigrationContext, ReversibleMigration } from '../migration-types';
export class AddProjectIcons1729607673469 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('project', [column('icon').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('project', ['icon']);
	}
}
