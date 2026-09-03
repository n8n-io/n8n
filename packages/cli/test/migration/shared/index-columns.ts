import type { TestMigrationContext } from '@n8n/backend-test-utils';

/**
 * Column list of an index DDL statement, in the order the index declares them.
 *
 * Exported separately from {@link indexColumnsInOrder} so the parsing is testable without a
 * database: the DDL shapes that matter (a `WHERE` clause, a function call) are string cases, not
 * query cases.
 */
export function parseIndexColumns(definition: string): string[] {
	const columnList = definition.slice(definition.lastIndexOf('(') + 1, definition.lastIndexOf(')'));

	return columnList.split(',').map((column) => column.trim().replace(/^"|"$/g, ''));
}

/**
 * Columns of an index, in the order the index declares them.
 *
 * `queryRunner.getTable()` cannot be used for this. Its index query joins `pg_attribute` on
 * `attnum = ANY (ix.indkey)` and has no `ORDER BY`, so the ordinal position inside the index is
 * discarded and the columns come back in table-definition order. On a table whose column order
 * happens to match the expectation, an assertion through it passes whatever order the index was
 * really built with. Reading the DDL back is the only portable way to see the true order.
 *
 * Returns `undefined` when no such index exists.
 */
export async function indexColumnsInOrder(
	context: TestMigrationContext,
	indexName: string,
): Promise<string[] | undefined> {
	const name = `IDX_${context.tablePrefix}${indexName}`;

	const definition = context.isSqlite
		? (
				await context.runQuery<Array<{ sql: string | null }>>(
					"SELECT sql FROM sqlite_master WHERE type = 'index' AND name = :name",
					{ name },
				)
			)[0]?.sql
		: (
				await context.runQuery<Array<{ indexdef: string }>>(
					'SELECT indexdef FROM pg_indexes WHERE indexname = :name',
					{ name },
				)
			)[0]?.indexdef;

	if (!definition) return undefined;

	return parseIndexColumns(definition);
}
