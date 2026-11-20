import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_execution';
const stopRequestValues = ['foreground', 'all', 'session'];

/**
 * Fence agent turns across processes. `ownerKey` names the process that runs
 * the turn, so the sweeper can interrupt a turn whose process is gone, and a
 * process can detect that it lost the turn. `stopRequest` makes a stop request
 * durable: the heartbeat reads it when the pub/sub message is lost.
 */
export class AddAgentExecutionOwnerAndStopRequest1794587505700 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		queryRunner,
		tablePrefix,
		schemaBuilder: { addColumns, column },
	}: MigrationContext) {
		// `agent_execution` has incoming foreign keys. Add the nullable columns in
		// place on SQLite so that the table is not rebuilt.
		if (isSqlite) {
			const tableName = escape.tableName(table);
			const ownerKey = escape.columnName('ownerKey');
			const stopRequest = escape.columnName('stopRequest');
			const allowed = stopRequestValues.map((value) => `'${value}'`).join(', ');
			await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${ownerKey} varchar(64)`);
			await runQuery(
				`ALTER TABLE ${tableName} ADD COLUMN ${stopRequest} varchar(16) CHECK (${stopRequest} IN (${allowed}))`,
			);
			// TypeORM does not see the raw `ADD COLUMN`, so its cached table is stale.
			// A later migration that rebuilds the table from that cache would drop
			// the columns. Reload the table to refresh the cache.
			await queryRunner.getTable(`${tablePrefix}${table}`);
			return;
		}

		await addColumns(
			table,
			[
				column('ownerKey')
					.varchar(64)
					.comment(
						'Instance registry key of the process that runs the turn; null for turns recorded before this column',
					),
				column('stopRequest')
					.varchar(16)
					.withEnumCheck(stopRequestValues)
					.comment(
						'Durable stop request read by the heartbeat: foreground (stop the response), all (stop the turn and its background jobs) or session (stop the session)',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({
		isSqlite,
		escape,
		runQuery,
		queryRunner,
		tablePrefix,
		schemaBuilder: { dropColumns },
	}: MigrationContext) {
		if (isSqlite) {
			const tableName = escape.tableName(table);
			await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${escape.columnName('stopRequest')}`);
			await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${escape.columnName('ownerKey')}`);
			await queryRunner.getTable(`${tablePrefix}${table}`);
			return;
		}

		await dropColumns(table, ['stopRequest', 'ownerKey'], { recreatesOnSqlite: true });
	}
}
