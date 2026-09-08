import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddDataTableKanbanOrder1788858423425 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const dataTables = await runQuery<Array<{ id: string }>>(
			`SELECT ${escape.columnName('id')} AS id FROM ${escape.tableName('data_table')}`,
		);
		for (const { id } of dataTables) {
			const tableName = escape.tableName(`data_table_user_${id}`);
			const orderColumn = escape.columnName('_n8nKanbanOrder');
			const idColumn = escape.columnName('id');
			await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${orderColumn} varchar(32)`);
			await runQuery(
				isPostgres
					? `UPDATE ${tableName} SET ${orderColumn} = LPAD(TO_HEX(${idColumn}::bigint), 16, '0') || '0000000000000000'`
					: `UPDATE ${tableName} SET ${orderColumn} = printf('%016x0000000000000000', ${idColumn})`,
			);
			await runQuery(
				`CREATE INDEX ${escape.indexName(`data_table_kanban_${id}`)} ON ${tableName} (${orderColumn} DESC, ${idColumn} DESC)`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		const dataTables = await runQuery<Array<{ id: string }>>(
			`SELECT ${escape.columnName('id')} AS id FROM ${escape.tableName('data_table')}`,
		);
		for (const { id } of dataTables) {
			const tableName = escape.tableName(`data_table_user_${id}`);
			await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(`data_table_kanban_${id}`)}`);
			await runQuery(
				`ALTER TABLE ${tableName} DROP COLUMN ${escape.columnName('_n8nKanbanOrder')}`,
			);
		}
	}
}
