import type { TestMigrationContext } from '@n8n/backend-test-utils';

/**
 * Column list of an index DDL statement, in the order the index declares them.
 *
 * Exported separately from {@link indexColumnsInOrder} so the parsing is testable without a
 * database: the DDL shapes that matter (a `WHERE` clause, a function call) are string cases, not
 * query cases.
 */
export function parseIndexColumns(definition: string): string[] {
	// Scan to the first unquoted `(`, walk to its matching close, split on commas at depth one.
	// Taking the last parenthesised group instead is wrong on every shape below: a partial index
	// ends in its predicate, an expression index nests a call, and a multi-argument call puts
	// commas under the top level. Quoted spans are skipped so a parenthesis or comma inside an
	// identifier or a string literal does not move the depth.
	const open = indexOfUnquoted(definition, '(');
	if (open === -1) return [];

	const columns: string[] = [];
	let depth = 0;
	let start = open + 1;
	let quote: string | null = null;

	for (let i = open; i < definition.length; i++) {
		const char = definition[i];

		if (quote) {
			if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (char === '(') depth++;
		else if (char === ')') {
			depth--;
			if (depth === 0) {
				columns.push(definition.slice(start, i));
				break;
			}
		} else if (char === ',' && depth === 1) {
			columns.push(definition.slice(start, i));
			start = i + 1;
		}
	}

	return columns.map(unquote).filter((column) => column.length > 0);
}

function indexOfUnquoted(text: string, target: string): number {
	let quote: string | null = null;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quote) {
			if (char === quote) quote = null;
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === target) {
			return i;
		}
	}
	return -1;
}

/** Strips the surrounding double quotes Postgres and SQLite put round a plain identifier. */
function unquote(column: string): string {
	const trimmed = column.trim();
	return /^"[^"]*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

/**
 * Columns of an index, in the order the index declares them.
 *
 * `queryRunner.getTable()` cannot be used for this. Its index query joins `pg_attribute` on
 * `attnum = ANY (ix.indkey)` and has no `ORDER BY`, so the ordinal position inside the index is
 * discarded and the order the rows come back in is unspecified. An assertion through it can pass
 * whatever order the index was really built with. Reading the DDL back is the only portable way
 * to see the true order.
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
