import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Sets up the agent Tasks schema in one migration: the `agent_task` table
 * (the 1:many scheduled-objective model), a nullable `taskId` on
 * `agent_execution_threads` so a session can preserve which task triggered it,
 * and a `tasks` snapshot column on `agent_history` so the published task bodies
 * (name/objective/cron) are frozen at publish time and drive scheduling. They
 * ship together because they form one feature's schema.
 */
export class CreateAgentTaskTable1784000000021 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, addColumns } }: MigrationContext) {
		await createTable('agent_task')
			.withColumns(
				column('id')
					.varchar(32)
					.primary.comment('Application-generated task ID referenced from agent JSON config'),
				column('agentId')
					.varchar(36)
					.notNull.comment('Owning agent; task bodies are deleted when the agent is deleted'),
				column('name').varchar(128).notNull,
				column('objective').text.notNull.comment(
					'User-authored instruction sent to the agent when this task runs',
				),
				column('cronExpression')
					.varchar(128)
					.notNull.comment('Cron schedule evaluated using the instance timezone'),
				column('lastRunAt')
					.timestampTimezone(3)
					.comment('Timestamp of the most recent run attempt; null until first run'),
				column('lastRunStatus')
					.varchar(16)
					.withEnumCheck(['success', 'error'])
					.comment('Outcome of the most recent run; null until first run'),
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await addColumns('agent_execution_threads', [
			column('taskId')
				.varchar(32)
				.comment(
					'Published task ID that triggered this session; not an FK because published runs can outlive draft task rows',
				),
		]);

		await addColumns('agent_history', [
			column('tasks').json.comment(
				'Frozen map of taskId to { name, objective, cronExpression } at publish time',
			),
		]);
	}

	async down({ schemaBuilder: { dropColumns, dropTable } }: MigrationContext) {
		await dropColumns('agent_history', ['tasks']);
		await dropColumns('agent_execution_threads', ['taskId']);
		await dropTable('agent_task');
	}
}
