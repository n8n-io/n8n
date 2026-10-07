import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentTaskCancellation1791294522338 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, addForeignKey, column },
	}: MigrationContext) {
		await createTable('agent_task_cancellation')
			.withColumns(
				column('id').uuid.primary,
				column('threadId').varchar(128).notNull,
				column('planId').uuid,
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(['stopping', 'failed', 'stopped'])
					.comment('stopping, failed, or stopped'),
				column('cutoffAt')
					.timestampTimezone(3)
					.notNull.comment('Time when this cancellation was requested'),
				column('settledAt').timestampTimezone(3),
				column('generation').json.notNull.comment(
					'Captured execution, job, and child session IDs for this cancellation',
				),
				column('failures').json.notNull.comment('Jobs that still require a confirmed stop'),
				column('reportStatus')
					.varchar(16)
					.notNull.withEnumCheck(['pending', 'claimed', 'reported', 'failed'])
					.comment('pending, claimed, reported, or failed'),
				column('report').text.notNull.comment(
					'Saved facts for the acknowledgement and fallback notice',
				),
			)
			.withTimestamps.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'agent_execution_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('planId', { tableName: 'agent_plan', columnName: 'id', onDelete: 'CASCADE' });
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

	async down({ schemaBuilder: { dropTable, dropColumns } }: MigrationContext) {
		await dropColumns('agent_background_job', ['sourceExecutionId', 'detached'], {
			recreatesOnSqlite: true,
		});
		await dropColumns('agent_message_queue', ['held'], { recreatesOnSqlite: true });
		await dropTable('agent_task_cancellation');
	}
}
