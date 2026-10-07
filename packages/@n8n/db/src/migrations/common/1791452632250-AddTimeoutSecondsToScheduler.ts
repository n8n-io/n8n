import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tables = ['scheduled_job', 'scheduled_task'];
const column = 'timeoutSeconds';

// Pinned rather than read from the config: a migration has to keep meaning what it
// meant when it ran.
const defaultTimeoutSeconds = 300;
// The longest delay a Node.js timer honors, in whole seconds.
const maxTimeoutSeconds = 2147483;

/**
 * Adds the timeout of one run to `scheduled_job`, and the copy each occurrence
 * takes of it to `scheduled_task`. Both are NOT NULL with a default, so existing
 * rows need no backfill.
 */
export class AddTimeoutSecondsToScheduler1791452632250 implements ReversibleMigration {
	async up(context: MigrationContext) {
		for (const table of tables) {
			await this.addTimeoutColumn(context, table);
		}
	}

	/**
	 * Each CHECK goes before its column: SQLite refuses to drop a column that a
	 * table-level CHECK names, which a later TypeORM rebuild makes of this one.
	 * Then a raw `DROP COLUMN`, for the same reason `up` adds it raw.
	 */
	async down({ queryRunner, runQuery, escape, tablePrefix }: MigrationContext) {
		for (const table of tables) {
			// Reload the table: a cached copy may predate the raw `ADD COLUMN` in `up`.
			await queryRunner.getTable(`${tablePrefix}${table}`);
			await queryRunner.dropCheckConstraint(
				`${tablePrefix}${table}`,
				checkName(tablePrefix, table),
			);
			await runQuery(
				`ALTER TABLE ${escape.tableName(table)} DROP COLUMN ${escape.columnName(column)}`,
			);
		}
	}

	/**
	 * Raw `ADD COLUMN` rather than the schema builder's `addColumns`, so SQLite does
	 * not rebuild `scheduled_task`, the largest table here, nor `scheduled_job`,
	 * which `scheduled_task` references with ON DELETE CASCADE.
	 */
	private async addTimeoutColumn(
		{ runQuery, escape, tablePrefix, isPostgres }: MigrationContext,
		table: string,
	) {
		const tableName = escape.tableName(table);
		const columnName = escape.columnName(column);

		// A timeout of 0 stops every run as soon as it starts. CAST rejects a fractional
		// value, which SQLite stores as given.
		const check =
			`CONSTRAINT "${checkName(tablePrefix, table)}" CHECK (${columnName} > 0 AND ` +
			`${columnName} <= ${maxTimeoutSeconds} AND CAST(${columnName} AS INTEGER) = ${columnName})`;
		const addColumn = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} int NOT NULL DEFAULT ${defaultTimeoutSeconds}`;

		if (!isPostgres) {
			await runQuery(`${addColumn} ${check}`);
			return;
		}

		// NOT VALID skips the scan that checks the existing rows under the exclusive
		// lock. Each of them holds the default, which the CHECK accepts.
		await runQuery(addColumn);
		await runQuery(`ALTER TABLE ${tableName} ADD ${check} NOT VALID`);
		await runQuery(
			`COMMENT ON COLUMN ${tableName}.${columnName} IS ` +
				"'How long, in seconds, one attempt of an occurrence may run before the executor stops it.'",
		);
	}
}

/** The name the DSL gives a column CHECK, so `dropCheckConstraint` can find it. */
function checkName(tablePrefix: string, table: string): string {
	return `CHK_${tablePrefix}${table}_${column}`;
}
