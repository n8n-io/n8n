import type { TestMigrationContext } from '@n8n/backend-test-utils';

/**
 * Columns of an index, in the order the index declares them.
 *
 * `queryRunner.getTable()` cannot be used for this: the Postgres driver returns index columns
 * alphabetically, so a leading-column assertion passes there whatever the real order is. Reading
 * the DDL back is the only portable way to see the order the index was actually built with.
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

	// The column list is the last parenthesised group: `... ON "t" ("a", "b")`, and on Postgres
	// `... USING btree ("a", b)` — where unreserved identifiers come back unquoted.
	const columnList = definition.slice(definition.lastIndexOf('(') + 1, definition.lastIndexOf(')'));

	return columnList.split(',').map((column) => column.trim().replace(/^"|"$/g, ''));
}
