import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'execution_ledger';
const columnName = 'runtimeMs';
const intMax = 2_147_483_647;

/**
 * An `int` holds about 24.8 days in milliseconds, and a run with a Wait node can last longer.
 * SQLite stores `INTEGER` in 64 bits, so it needs no change. Narrowing back clamps a longer
 * runtime to the `int` maximum.
 */
export class WidenExecutionLedgerRuntimeMs1794238837509 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName(tableName)} ALTER COLUMN ${escape.columnName(columnName)} TYPE BIGINT`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const column = escape.columnName(columnName);
		await runQuery(
			`ALTER TABLE ${escape.tableName(tableName)} ALTER COLUMN ${column} TYPE INTEGER USING LEAST(${column}, ${intMax})`,
		);
	}
}
