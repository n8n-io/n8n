import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'project_pool_settings';

export class CreateProjectPoolSettings1785000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('projectId').varchar(36).primary.notNull,
				column('productionPool').varchar(63),
				column('manualPool').varchar(63),
				column('evaluationPool').varchar(63),
				column('allowedPools').json.notNull,
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
