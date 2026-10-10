import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSourceExecutionToAgentBackgroundJob1791548871825 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
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
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['sourceExecutionId'], {
			recreatesOnSqlite: true,
		});
	}
}
