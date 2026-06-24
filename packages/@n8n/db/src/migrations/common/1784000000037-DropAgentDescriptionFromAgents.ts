import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class DropAgentDescriptionFromAgents1784000000037 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['description'], { recreatesOnSqlite: true });
	}

	async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agents', [column('description').varchar(512)], {
			recreatesOnSqlite: true,
		});
	}
}
