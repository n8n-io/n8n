/**
 * The statements that the v1 Microsoft SQL node sends, in the subset of the workflow
 * language: the text functions of the v1 node
 * (`packages/nodes-base/nodes/Microsoft/Sql/GenericFunctions.ts`) and the bind rules of
 * `request.input(name, value)` of `mssql` 12.7.0. Each function gives the text, and the
 * names, order and values of the parameters of its original, or it throws.
 *
 * The v1 node binds every value: `request.query` of `mssql` sends the RPC `sp_executesql`.
 * No function here writes a value into a text. A statement is `{ text, params }`, and the
 * `sql` effect with the dialect `mssql` sends it as the same RPC.
 *
 * An error is one of two kinds:
 * - an error of the v1 node, with the same message (the class is not kept: the subset has
 *   only `Error`);
 * - an input for which the runtime has no exact bind. The message ends with
 *   `(limit: sql-host)` and the node must run in the fallback host. The cases: a value that
 *   is not a string, a number, a boolean, null or undefined (`mssql` binds a Date as
 *   `datetime` and a Buffer as `varbinary`, and writes an object as text); NaN, which
 *   `mssql` sends as a NULL of the type `float`; a whole number outside 64 bits, which
 *   tedious refuses; a column name that is a whole number, because JavaScript moves it to
 *   the front of the values of a row.
 *
 * A library node can import only from `@n8n/workflow-lang`, so a node cannot import this
 * file. A node holds a copy of the code between the two marker lines, without the word
 * `export`. `src/nodes/__tests__/mssql-format.test.ts` proves this text against the built
 * v1 node and the real `mssql` request.
 */

// mssql-format:begin
const MSF_HOST_MARKER = '(limit: sql-host)';
/** The limit of SQL Server for the parameters of one request (`MSSQL_PARAMETER_LIMIT`). */
const MSF_PARAMETER_LIMIT = 2100;
/** The rows of one `DELETE` statement of the v1 node. */
const MSF_DELETE_ROWS = 1000;
const MSF_MAX_INT64 = 9223372036854775807;

export type MsfValue = string | number | boolean | null;

export interface MsfParam {
	/** The name without the `@`. */
	name: string;
	value: MsfValue;
}

export interface MsfStatement {
	text: string;
	/** In the order of the `request.input` calls of the v1 node. */
	params: MsfParam[];
}

export function msfHostError(reason: string): Error {
	return new Error(`Microsoft SQL: ${reason} ${MSF_HOST_MARKER}`);
}

/**
 * The value that `request.input(name, value)` binds, when the runtime binds the same type:
 * a string and null as `nvarchar`, a whole number as `int` or `bigint`, another number as
 * `float`, a boolean as `bit`. `mssql` changes undefined to null.
 */
export function msfValue(value: unknown): MsfValue {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string' || typeof value === 'boolean') return value;
	if (typeof value !== 'number') {
		throw msfHostError('A bind value is not a string, a number, a boolean or null');
	}
	if (value !== value) throw msfHostError('A bind value is NaN');
	const whole = Math.floor(value) === value && value !== Infinity && value !== -Infinity;
	if (whole && (value >= MSF_MAX_INT64 || value < -MSF_MAX_INT64)) {
		throw msfHostError('A bind value is a whole number outside 64 bits');
	}
	return value;
}

function msfIsDigit(code: number): boolean {
	return code >= 48 && code <= 57;
}

/** `isInsideQuotes` of `@utils/sql-query-parameters`. */
export function msfInsideQuotes(text: string, index: number): boolean {
	let quote = '';
	for (let i = 0; i < index; i++) {
		const ch = text[i];
		if (quote === '') {
			if (ch === "'" || ch === '"') quote = ch;
		} else if (ch === quote) {
			if (text[i + 1] === quote) i++;
			else quote = '';
		}
	}
	return quote !== '';
}

/** `text.replace(/\$<number>(?!\d)/g, replacement)`. */
function msfReplacePlaceholder(text: string, number: number, replacement: string): string {
	const token = `$${number}`;
	let out = '';
	let from = 0;
	for (;;) {
		const at = text.indexOf(token, from);
		if (at < 0) break;
		const after = at + token.length;
		if (after < text.length && msfIsDigit(text.charCodeAt(after))) {
			out += text.slice(from, at + 1);
			from = at + 1;
			continue;
		}
		out += text.slice(from, at) + replacement;
		from = after;
	}
	return out + text.slice(from);
}

/**
 * `bindQueryParameters` of the v1 node: `$N` becomes `@pN` from the highest number down,
 * each value is bound in that order, and a `$N` outside quotes that has no value is the
 * error of v1.
 */
export function msfBind(rawQuery: string, values: unknown[]): MsfStatement {
	let text = rawQuery;
	const params: MsfParam[] = [];
	for (let i = values.length; i >= 1; i--) {
		text = msfReplacePlaceholder(text, i, `@p${i}`);
		params.push({ name: `p${i}`, value: msfValue(values[i - 1]) });
	}
	let highest = -1;
	for (let at = 0; at < text.length; at++) {
		if (text[at] !== '$') continue;
		let end = at + 1;
		while (end < text.length && msfIsDigit(text.charCodeAt(end))) end++;
		if (end === at + 1) continue;
		if (!msfInsideQuotes(text, at)) {
			const number = Number(text.slice(at + 1, end));
			if (number > highest) highest = number;
		}
		at = end - 1;
	}
	if (highest >= 0) {
		throw new Error(
			`The query references $${highest}, but only ${values.length} query parameter(s) are set`,
		);
	}
	return { text, params };
}

/** `escapeIdentifier` of the v1 node. */
export function msfEscapeIdentifier(identifier: string): string {
	let name = identifier;
	if (name.startsWith('[') && name.endsWith(']')) name = name.slice(1, -1);
	return `[${name.split(']').join(']]')}]`;
}

/** `escapeTableName` of the v1 node. */
export function msfEscapeTableName(table: string): string {
	const name = table.trim();
	if (name.startsWith('[') && name.endsWith(']')) {
		return name
			.slice(1, -1)
			.split('].[')
			.map((part) => msfEscapeIdentifier(`[${part}]`))
			.join('.');
	}
	return msfEscapeIdentifier(name);
}

/** `formatColumns` of the v1 node. */
export function msfFormatColumns(columns: string): string {
	return columns
		.split(',')
		.map((column) => msfEscapeIdentifier(column.trim()))
		.join(', ');
}

function msfIsIndexKey(key: string): boolean {
	if (key === '' || key.length > 10) return false;
	for (let i = 0; i < key.length; i++) {
		if (!msfIsDigit(key.charCodeAt(i))) return false;
	}
	return (key === '0' || key[0] !== '0') && Number(key) < 4294967295;
}

/** The values of a row in the order of `Object.values`, for a row without a number as a key. */
function msfRowValues(row: Record<string, unknown>): unknown[] {
	const values: unknown[] = [];
	for (const key of Object.keys(row)) {
		if (msfIsIndexKey(key)) throw msfHostError('A column name is a whole number');
		values.push(row[key]);
	}
	return values;
}

/** `mssqlChunk` of the v1 node: a new group when the count of values reaches the limit. */
export function msfChunk(
	rows: Array<Record<string, unknown>>,
): Array<Array<Record<string, unknown>>> {
	const chunked: Array<Array<Record<string, unknown>>> = [[]];
	let count = 0;
	for (const row of rows) {
		const size = msfRowValues(row).length;
		if (count + size >= MSF_PARAMETER_LIMIT) {
			chunked.push([]);
			count = 0;
		}
		chunked[chunked.length - 1].push(row);
		count += size;
	}
	return chunked;
}

/**
 * The statements of `insertOperation` for the rows of one table and one column list. A row
 * is what `copyInputItem` of the v1 node gives for the columns.
 */
export function msfInsert(
	table: string,
	columnString: string,
	rows: Array<Record<string, unknown>>,
): MsfStatement[] {
	return msfChunk(rows).map((group) => {
		const places: string[] = [];
		const params: MsfParam[] = [];
		for (let r = 0; r < group.length; r++) {
			const values = msfRowValues(group[r]);
			places.push(`(${values.map((_, v) => `@r${r}v${v}`).join(', ')})`);
			for (let v = 0; v < values.length; v++) {
				params.push({ name: `r${r}v${v}`, value: msfValue(values[v]) });
			}
		}
		const text = `INSERT INTO ${msfEscapeTableName(table)} (${msfFormatColumns(
			columnString,
		)}) VALUES ${places.join(', ')};`;
		return { text, params };
	});
}

/**
 * The statement of `updateOperation` for one item. The item is what `createTableStruct` of
 * the v1 node gives: the columns, and `updateKey` with the name of the key column.
 */
export function msfUpdate(
	table: string,
	columnString: string,
	item: Record<string, unknown>,
): MsfStatement {
	const columns = columnString.split(',').map((column) => column.trim());
	const updateKey = item.updateKey;
	if (typeof updateKey !== 'string') throw msfHostError('The update key is not a text');
	const params: MsfParam[] = [{ name: 'condition', value: msfValue(item[updateKey]) }];
	const sets: string[] = [];
	for (let index = 0; index < columns.length; index++) {
		sets.push(`${msfEscapeIdentifier(columns[index])} = @v${index}`);
		params.push({ name: `v${index}`, value: msfValue(item[columns[index]]) });
	}
	const text = `UPDATE ${msfEscapeTableName(table)} SET ${sets.join(', ')} WHERE ${msfEscapeIdentifier(
		updateKey,
	)} = @condition;`;
	return { text, params };
}

/**
 * The statements of `deleteOperation` for the key values of one table and one key column:
 * 1,000 values for each statement.
 */
export function msfDelete(table: string, deleteKey: string, values: unknown[]): MsfStatement[] {
	const statements: MsfStatement[] = [];
	for (let from = 0; from < values.length; from += MSF_DELETE_ROWS) {
		const group = values.slice(from, from + MSF_DELETE_ROWS);
		const places: string[] = [];
		const params: MsfParam[] = [];
		for (let index = 0; index < group.length; index++) {
			places.push(`@v${index}`);
			params.push({ name: `v${index}`, value: msfValue(group[index]) });
		}
		const text = `DELETE FROM ${msfEscapeTableName(table)} WHERE ${msfEscapeIdentifier(
			deleteKey,
		)} IN (${places.join(', ')});`;
		statements.push({ text, params });
	}
	return statements;
}
// mssql-format:end
