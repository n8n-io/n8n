import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSourceExecutionToAgentBackgroundJob1792584485669 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addForeignKey, column, createIndex },
	}: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[column('sourceExecutionId').varchar(36).comment('Execution that dispatched this job')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_background_job',
			'sourceExecutionId',
			['agent_execution', 'id'],
			undefined,
			'SET NULL',
		);
		await createIndex('agent_background_job', ['sourceExecutionId']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('agent_background_job', ['sourceExecutionId']);
		await dropColumns('agent_background_job', ['sourceExecutionId'], {
			recreatesOnSqlite: true,
		});
	}
}
