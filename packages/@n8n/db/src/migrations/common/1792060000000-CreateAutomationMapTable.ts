import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAutomationMapTable1792060000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('automation_map')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(255).notNull,
				column('prompt').text.notNull,
				column('createdById').uuid,
				column('saved').bool.notNull.default(false),
				column('autoUpdate').bool.notNull.default(false),
				column('status').varchar(16).notNull,
				column('error').text,
				column('scope').json.notNull,
				column('graph').json,
				column('annotations').json,
				column('fingerprint').json,
				column('builtAt').timestampTimezone(),
			)
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withTimestamps.withIndexOn('saved');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('automation_map');
	}
}
