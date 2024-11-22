import type { MigrationContext, ReversibleMigration } from '@/databases/types';

const testMetricEntityTableName = 'test_metric';

export class CreateTestMetricTable1732271325258 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(testMetricEntityTableName)
			.withColumns(
				column('id').int.notNull.primary.autoGenerate,
				column('name').varchar(255).notNull,
				column('testDefinitionId').varchar(36).notNull,
			)
			.withIndexOn('testDefinitionId')
			.withForeignKey('testDefinitionId', {
				tableName: 'test_definition',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(testMetricEntityTableName);
	}
}
