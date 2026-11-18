import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddRowRuleToDataTable1794984588906 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('data_table');
		const rowRule = escape.columnName('rowRule');

		// Raw ALTER instead of the addColumns DSL: data_table_column references this table
		// with ON DELETE CASCADE, and a SQLite table recreation would drop those rows.
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${rowRule} ${isPostgres ? 'JSON' : 'TEXT'}`,
		);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${rowRule} IS 'Row rule as {column, match: id|email, runsWithoutUser: deny|allRows}. NULL means every caller sees all rows.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('data_table');
		const rowRule = escape.columnName('rowRule');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${rowRule}`);
	}
}
