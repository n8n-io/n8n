import type { MigrationContext, ReversibleMigration } from '../migration-types';
export class AddProjectIcons1729607673469 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('project', [column('icon').json], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('project', ['icon'], { recreatesOnSqlite: true });
	}
}
