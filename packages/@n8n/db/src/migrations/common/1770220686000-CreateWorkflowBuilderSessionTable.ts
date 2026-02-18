import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Creates the workflow_builder_session table to persist AI workflow builder
 * conversation sessions across instance restarts and in multi-main deployments.
 */
export class CreateWorkflowBuilderSessionTable1770220686000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_builder_session')
			.withColumns(
				column('id').uuid.primary.autoGenerate,
				column('workflowId').varchar(36).notNull,
				column('userId').uuid.notNull,
				column('messages').json.notNull.default("'[]'"),
				column('previousSummary').text.comment(
					'Summary of prior conversation from compaction (/compact or auto-compact)',
				),
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['workflowId', 'userId']).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('workflow_builder_session');
	}
}
