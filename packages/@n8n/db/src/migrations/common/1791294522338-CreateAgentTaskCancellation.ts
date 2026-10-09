import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentTaskCancellation1791294522338 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			'agent_background_job',
			[
				column('sourceExecutionId').varchar(36).comment('Execution that dispatched this job'),
				column('detached')
					.bool.notNull.default(true)
					.comment('Deliver results through background wake messages'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_background_job',
			'sourceExecutionId',
			['agent_execution', 'id'],
			undefined,
			'SET NULL',
		);
		await addColumns(
			'agent_message_queue',
			[
				column('held')
					.bool.notNull.default(false)
					.comment('Requires an explicit Send after task cancellation'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['sourceExecutionId', 'detached'], {
			recreatesOnSqlite: true,
		});
		await dropColumns('agent_message_queue', ['held'], { recreatesOnSqlite: true });
	}
}
