import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentTaskStopBoundary1791461354235 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column },
		isSqlite,
		escape,
		runQuery,
	}: MigrationContext) {
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_execution_threads')} ADD COLUMN ${escape.columnName('taskStop')} TEXT`,
			);
			return;
		}
		await addColumns(
			'agent_execution_threads',
			[column('taskStop').json.comment('Latest task stop boundary and unresolved stop errors')],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution_threads')} DROP COLUMN ${escape.columnName('taskStop')}`,
		);
	}
}
