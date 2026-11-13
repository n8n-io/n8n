import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agents';
const columnName = 'runtimeRevision';

/**
 * Bound the staleness of cached agent runtimes across processes. Each change
 * that makes cached runtimes stale advances `runtimeRevision`. A process
 * compares it with the value of its cached runtime and rebuilds on a mismatch,
 * so a lost `agent-config-changed` message cannot keep an old runtime alive.
 */
export class AddRuntimeRevisionToAgents1794591363781 implements ReversibleMigration {
	async up({
		isSqlite,
		escape,
		runQuery,
		schemaBuilder: { addColumns, column },
	}: MigrationContext) {
		// `agents` has incoming foreign keys. Add the column in place on SQLite so
		// that the table is not rebuilt.
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} ADD COLUMN ${escape.columnName(columnName)} integer NOT NULL DEFAULT 0`,
			);
			return;
		}

		await addColumns(
			table,
			[
				column(columnName)
					.int.notNull.default(0)
					.comment('Advances on each change that makes cached agent runtimes stale'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ isSqlite, escape, runQuery, schemaBuilder: { dropColumns } }: MigrationContext) {
		if (isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(columnName)}`,
			);
			return;
		}

		await dropColumns(table, [columnName], { recreatesOnSqlite: true });
	}
}
