import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AUTOMATION_MAP_TABLE = 'automation_map';

export class CreateAutomationMapTable1792137612450 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(AUTOMATION_MAP_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('projectId').varchar(36).notNull,
				column('scope').json.notNull,
				column('graph').json.notNull,
				column('annotations').json.notNull,
				column('fingerprint').json.notNull,
				column('createdById').uuid,
				column('refreshedAt').timestampTimezone().notNull,
				column('annotatedAt').timestampTimezone(),
			)
			.withTimestamps.withIndexOn(['projectId'])
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(AUTOMATION_MAP_TABLE);
	}
}
