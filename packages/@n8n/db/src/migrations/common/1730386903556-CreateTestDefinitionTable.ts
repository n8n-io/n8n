import type { MigrationContext, ReversibleMigration } from '../migration-types';

const testEntityTableName = 'test_definition';

export class CreateTestDefinitionTable1730386903556 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(testEntityTableName)
			.withColumns(
				column('id').int.notNull.primary.autoGenerate,
				column('name').varchar(255).notNull,
				column('workflowId').varchar(36).notNull,
				column('evaluationWorkflowId').varchar(36),
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
				onDelete: 'SET NULL',
			})
			.withForeignKey('annotationTagId', {
				tableName: 'annotation_tag_entity',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(testEntityTableName);
	}
}
