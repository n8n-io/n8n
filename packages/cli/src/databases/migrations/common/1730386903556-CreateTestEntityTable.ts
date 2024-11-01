import type { MigrationContext, ReversibleMigration } from '@/databases/types';

const testEntityTableName = 'test_entity';

export class CreateTestEntityTable1730386903556 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(testEntityTableName)
			.withColumns(
				column('id').int.notNull.primary.autoGenerate,
				column('name').varchar(255).notNull,
				column('workflowId').int.notNull,
				column('evaluationWorkflowId').int,
				column('annotationTagId').varchar(16),
			)
			.withIndexOn('workflowId')
			.withIndexOn('evaluationWorkflowId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('evaluationWorkflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
			})
			.withForeignKey('annotationTagId', {
				tableName: 'annotation_tag_entity',
				columnName: 'id',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(testEntityTableName);
	}
}
