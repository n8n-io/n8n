import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddCustomTelemetryTagsToProject1784000000019 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('project', [column('customTelemetryTags').json.notNull.default("'[]'")], {
			recreatesOnSqlite: true,
		});
		await createIndex('shared_workflow', ['projectId']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('shared_workflow', ['projectId']);
		await dropColumns('project', ['customTelemetryTags'], { recreatesOnSqlite: true });
	}
}
