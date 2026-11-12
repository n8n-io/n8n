import type { QueryRunner } from '@n8n/typeorm';

type Row = Record<string, unknown>;

const line = (row: Row, keys: string[]) => keys.map((k) => String(row[k] ?? '')).join(' | ');

// SQLite keeps index DDL as written, so a rebuilt table can differ only in quotes and spaces.
const normalizeSql = (sql: unknown) =>
	String(sql ?? '')
		.replace(/['`]/g, '"')
		.replace(/\s+/g, ' ')
		.replace(/\s*([(),])\s*/g, '$1')
		.trim();

/** Returns the index of the parenthesis that closes the one at `open`, or -1. */
function closingParen(sql: string, open: number): number {
	let depth = 0;
	let quote: string | undefined;
	for (let i = open; i < sql.length; i++) {
		const char = sql[i];
		if (quote) {
			if (char === quote) quote = undefined;
		} else if (char === "'" || char === '"') {
			quote = char;
		} else if (char === '(') {
			depth++;
		} else if (char === ')' && --depth === 0) {
			return i;
		}
	}
	return -1;
}

// A rebuilt SQLite table wraps CHECK expressions in extra parentheses.
function unwrap(expression: string): string {
	let result = expression.trim();
	while (result.startsWith('(') && closingParen(result, 0) === result.length - 1) {
		result = result.slice(1, -1).trim();
	}
	return result;
}

function extractChecks(tableSql: string): string[] {
	const checks: string[] = [];
	for (const match of tableSql.matchAll(/\bCHECK\s*\(/gi)) {
		const open = match.index + match[0].length - 1;
		const close = closingParen(tableSql, open);
		if (close === -1) continue;
		checks.push(normalizeSql(unwrap(tableSql.slice(open, close + 1))));
	}
	return checks;
}

async function snapshotSqlite(queryRunner: QueryRunner, tablePrefix: string): Promise<string[]> {
	const tables = "m.type = 'table' AND m.name NOT LIKE 'sqlite_%' AND m.name != :migrations";
	const params = [`${tablePrefix}migrations`];
	const query = async (sql: string) =>
		(await queryRunner.query(sql.replace(':migrations', '?'), params)) as Row[];

	// A rebuilt SQLite table can change the case of types and defaults.
	const columns = await query(
		`SELECT m.name AS tbl, p.name, lower(p.type) AS type, p."notnull", lower(p.dflt_value) AS dflt_value, p.pk
		 FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE ${tables}`,
	);
	const indexes = await query(
		`SELECT m.name AS tbl, il.name, il."unique", il.partial,
		   (SELECT group_concat(ii.name, ',') FROM pragma_index_info(il.name) ii) AS cols,
		   (SELECT s.sql FROM sqlite_master s WHERE s.type = 'index' AND s.name = il.name) AS def
		 FROM sqlite_master m JOIN pragma_index_list(m.name) il WHERE ${tables} AND il.origin != 'pk'`,
	);
	const foreignKeys = await query(
		`SELECT m.name AS tbl, f."table" AS target, f."from", f."to", f.on_update, f.on_delete
		 FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f WHERE ${tables}`,
	);
	const checks = await query(
		`SELECT m.name AS tbl, m.sql FROM sqlite_master m WHERE ${tables} AND m.sql LIKE '%CHECK%'`,
	);
	const triggers = await query(
		"SELECT m.tbl_name AS tbl, m.name, m.sql FROM sqlite_master m WHERE m.type = 'trigger' AND m.tbl_name != :migrations",
	);

	return [
		...columns.map(
			(r) => `column ${line(r, ['tbl', 'name', 'type', 'notnull', 'dflt_value', 'pk'])}`,
		),
		// SQLite gives automatic indexes a generated name, so leave the name out.
		...indexes.map(
			(r) =>
				`index ${line(r, ['tbl', 'cols', 'unique', 'partial'])} | ${
					String(r.name).startsWith('sqlite_autoindex_')
						? ''
						: `${String(r.name)} | ${normalizeSql(r.def)}`
				}`,
		),
		...foreignKeys.map(
			(r) => `fk ${line(r, ['tbl', 'target', 'from', 'to', 'on_update', 'on_delete'])}`,
		),
		// SQLite keeps trigger SQL as written, so quotes around identifiers can differ.
		...triggers.map(
			(r) => `trigger ${line(r, ['tbl', 'name'])} | ${normalizeSql(r.sql).replace(/"/g, '')}`,
		),
		...checks.flatMap((r) =>
			extractChecks(String(r.sql)).map((check) => `check ${String(r.tbl)} | ${check}`),
		),
	].sort();
}

async function snapshotPostgres(queryRunner: QueryRunner, tablePrefix: string): Promise<string[]> {
	const schema = ((await queryRunner.query('SELECT current_schema() AS s')) as Row[])[0].s;
	const params = [schema, `${tablePrefix}migrations`];
	const query = async (sql: string) => (await queryRunner.query(sql, params)) as Row[];

	const columns = await query(
		`SELECT table_name AS tbl, column_name AS name, data_type, udt_name,
		   character_maximum_length AS len, is_nullable, column_default AS dflt, is_identity
		 FROM information_schema.columns
		 WHERE table_schema = $1 AND table_name != $2`,
	);
	const indexes = await query(
		`SELECT tablename AS tbl, indexname AS name, indexdef AS def
		 FROM pg_indexes WHERE schemaname = $1 AND tablename != $2`,
	);
	const constraints = await query(
		`SELECT t.relname AS tbl, c.conname AS name, c.contype AS kind, pg_get_constraintdef(c.oid) AS def
		 FROM pg_constraint c
		 JOIN pg_class t ON t.oid = c.conrelid
		 JOIN pg_namespace n ON n.oid = t.relnamespace
		 WHERE n.nspname = $1 AND t.relname != $2`,
	);
	const triggers = await query(
		`SELECT c.relname AS tbl, t.tgname AS name, pg_get_triggerdef(t.oid) AS def
		 FROM pg_trigger t
		 JOIN pg_class c ON c.oid = t.tgrelid
		 JOIN pg_namespace n ON n.oid = c.relnamespace
		 WHERE n.nspname = $1 AND c.relname != $2 AND NOT t.tgisinternal`,
	);
	const functions = await query(
		`SELECT p.proname AS name, pg_get_functiondef(p.oid) AS def
		 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
		 WHERE n.nspname = $1 AND p.proname != $2 AND p.prokind = 'f'`,
	);
	const enums = await query(
		`SELECT t.typname AS name, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
		 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
		 JOIN pg_namespace n ON n.oid = t.typnamespace
		 WHERE n.nspname = $1 AND t.typname != $2 GROUP BY t.typname`,
	);

	return [
		...columns.map(
			(r) =>
				`column ${line(r, ['tbl', 'name', 'data_type', 'udt_name', 'len', 'is_nullable', 'dflt', 'is_identity'])}`,
		),
		...indexes.map((r) => `index ${line(r, ['tbl', 'name', 'def'])}`),
		...constraints.map((r) => `constraint ${line(r, ['tbl', 'name', 'kind', 'def'])}`),
		...enums.map((r) => `enum ${line(r, ['name', 'labels'])}`),
		...triggers.map((r) => `trigger ${line(r, ['tbl', 'name', 'def'])}`),
		...functions.map((r) => `function ${String(r.name)} | ${String(r.def).replace(/\s+/g, ' ')}`),
	].sort();
}

/** Returns a sorted, comparable description of the schema, without the migrations table. */
export async function snapshotSchema(
	queryRunner: QueryRunner,
	dbType: 'sqlite' | 'postgresdb',
	tablePrefix: string,
): Promise<string[]> {
	return dbType === 'sqlite'
		? await snapshotSqlite(queryRunner, tablePrefix)
		: await snapshotPostgres(queryRunner, tablePrefix);
}

const countLines = (lines: string[]) => {
	const counts = new Map<string, number>();
	for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
	return counts;
};

/** Lists the lines that one snapshot has more often than the other. Two lines can be equal. */
export function diffSnapshots(before: string[], after: string[]): string[] {
	const beforeCounts = countLines(before);
	const afterCounts = countLines(after);
	const diff: string[] = [];
	for (const [l, count] of beforeCounts) {
		for (let i = afterCounts.get(l) ?? 0; i < count; i++) diff.push(`- ${l}`);
	}
	for (const [l, count] of afterCounts) {
		for (let i = beforeCounts.get(l) ?? 0; i < count; i++) diff.push(`+ ${l}`);
	}
	return diff;
}
