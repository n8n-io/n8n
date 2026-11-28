import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTestTaskIdToAgentExecutionThreads1795786622983 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column },
		isSqlite,
		escape,
		runQuery,
	}: MigrationContext) {
		// Recreating the table on SQLite would cascade-delete its agent_execution rows.
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_execution_threads')} ADD COLUMN ${escape.columnName('testTaskId')} VARCHAR(32)`,
			);
			return;
		}
		await addColumns(
			'agent_execution_threads',
			[
				column('testTaskId')
					.varchar(32)
					.comment(
						'Task that this Preview session tests. The session takes no further messages. Not an FK: the test stays read-only after the task is deleted',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution_threads')} DROP COLUMN ${escape.columnName('testTaskId')}`,
		);
	}
}
