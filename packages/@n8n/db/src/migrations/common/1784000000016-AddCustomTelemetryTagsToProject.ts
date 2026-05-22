import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddCustomTelemetryTagsToProject1784000000016 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('project', [column('customTelemetryTags').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('project', ['customTelemetryTags']);
	}
}
