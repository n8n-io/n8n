import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'project_pool_settings';

export class CreateProjectPoolSettings1784000000038 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('projectId').varchar(36).primary.notNull,
				column('defaultPool').varchar(63),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
