import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Sets up the agent Tasks schema in one migration: the `agent_task` table
 * (the 1:many scheduled-objective model), a nullable `taskId` FK on
 * `agent_execution_threads` so a session can be traced back to the task that
 * triggered it, and a `tasks` snapshot column on `agent_history` so the
 * published task bodies (name/objective/cron) are frozen at publish time and
 * drive scheduling. They ship together because they form one feature's schema.
 */
export class CreateAgentTaskTable1784000000017 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column, addColumns, createIndex, addForeignKey },
	}: MigrationContext) {
		await createTable('agent_task')
			.withColumns(
				column('id').varchar(36).primary,
				column('agentId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('objective').text.notNull,
				column('cronExpression').varchar(255).notNull,
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

		await addColumns('agent_execution_threads', [column('taskId').varchar(36)]);
		await createIndex('agent_execution_threads', ['taskId']);
		await addForeignKey(
			'agent_execution_threads',
			'taskId',
			['agent_task', 'id'],
			undefined,
			'SET NULL',
		);

		await addColumns('agent_history', [
			column('tasks').json.comment(
				'Frozen map of taskId to { name, objective, cronExpression } at publish time',
			),
		]);
	}

	async down({
		schemaBuilder: { dropForeignKey, dropIndex, dropColumns, dropTable },
	}: MigrationContext) {
		await dropColumns('agent_history', ['tasks']);
		await dropForeignKey('agent_execution_threads', 'taskId', ['agent_task', 'id']);
		await dropIndex('agent_execution_threads', ['taskId']);
		await dropColumns('agent_execution_threads', ['taskId']);
		await dropTable('agent_task');
	}
}
