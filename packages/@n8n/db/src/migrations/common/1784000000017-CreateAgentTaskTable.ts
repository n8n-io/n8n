import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Sets up the agent Tasks schema in one migration: the `agent_task` table
 * (the 1:many scheduled-objective model), a nullable `taskId` on
 * `agent_execution_threads` so a session can preserve which task triggered it,
 * and a `tasks` snapshot column on `agent_history` so the published task bodies
 * (name/objective/cron) are frozen at publish time and drive scheduling. They
 * ship together because they form one feature's schema.
 */
export class CreateAgentTaskTable1784000000017 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, addColumns } }: MigrationContext) {
		await createTable('agent_task')
			.withColumns(
				column('id').varchar(32).primary,
				column('agentId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('objective').text.notNull,
				column('cronExpression').varchar(128).notNull,
				column('lastRunAt').timestampTimezone(3),
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
