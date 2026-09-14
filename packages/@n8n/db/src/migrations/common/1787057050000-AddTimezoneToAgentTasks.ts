import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Lets a scheduled agent task carry the timezone its cron is evaluated in, so a
 * task authored as "Friday 08:00" keeps firing at 08:00 in the author's zone
 * across DST instead of drifting with the instance timezone. Null on existing
 * rows, which keeps them on the instance timezone they were scheduled with.
 */
export class AddTimezoneToAgentTasks1787057050000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		for (const table of ['agent_task_definition', 'agent_task_snapshot']) {
			await addColumns(
				table,
				[
					column('timezone')
						.varchar(64)
						.comment(
							'IANA timezone the cron is evaluated in; null falls back to the instance timezone',
						),
				],
				{ recreatesOnSqlite: true },
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		for (const table of ['agent_task_definition', 'agent_task_snapshot']) {
			await dropColumns(table, ['timezone'], { recreatesOnSqlite: true });
		}
	}
}
