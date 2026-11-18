import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'doc_page';
const column = 'resourceType';

/**
 * Lets a root doc page belong to a project. The project page is the home page of the Docs tab.
 * Recreates the table on SQLite, so the SQLite subclass turns foreign keys off.
 */
export class AddProjectResourceTypeToDocPage1795000000001 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.refreshSqliteTable(context);
		await this.setValues(context, ['workflow', 'agent', 'project']);
	}

	async down(context: MigrationContext) {
		const { runQuery, escape } = context;
		const tableName = escape.tableName(table);
		const id = escape.columnName('id');
		const parentId = escape.columnName('parentId');
		const resourceType = escape.columnName(column);
		// The narrow CHECK rejects project pages. Delete their child pages first, then the pages.
		await runQuery(
			`DELETE FROM ${tableName} WHERE ${parentId} IN (SELECT ${id} FROM ${tableName} WHERE ${resourceType} = 'project')`,
		);
		await runQuery(`DELETE FROM ${tableName} WHERE ${resourceType} = 'project'`);
		await this.refreshSqliteTable(context);
		await this.setValues(context, ['workflow', 'agent']);
	}

	private async setValues({ schemaBuilder }: MigrationContext, values: string[]) {
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, values, { recreatesOnSqlite: true });
	}

	/**
	 * A raw `ADD COLUMN` added `properties`, so the cached table of TypeORM can be stale.
	 * Without a reload, the SQLite table rebuild drops that column.
	 */
	private async refreshSqliteTable({ isSqlite, queryRunner, tablePrefix }: MigrationContext) {
		if (isSqlite) await queryRunner.getTable(`${tablePrefix}${table}`);
	}
}
