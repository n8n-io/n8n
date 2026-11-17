/**
 * Compiled library node: a hand port of `n8n-nodes-base.mySql` versions 2 to 2.5, operations
 * `executeQuery`, `select`, `insert`, `update`, `upsert` and `deleteTable` (spec 9.11).
 *
 * The v1 node never binds a value. mysql2 writes each value into the query text on the
 * client (`connection.format`) and sends the text with the text protocol. This node makes
 * that same text with the formatter below, which is proven against mysql2 and the v1 node
 * (`src/nodes/shared/mysql-format.ts`), and sends it as a simple statement of the `sql`
 * effect. The formatter is the only place where a value becomes SQL text. The text has the
 * safety of v1 and no more.
 *
 * The three batching modes of v1:
 * - `single`: the queries of all items are one text, sent as one statement. Each command of
 *   the text commits alone, as in v1.
 * - `independently`: v1 splits the query of each item into statements and sends each one
 *   alone. This node sends them in one call. Without a continue setting they are all in one
 *   `group`: the first failure stops the call, as v1 stops. With a continue setting each
 *   item is a `group`: a failure drops the other statements of its item only.
 * - `transaction`: the same statements in one transaction.
 *
 * With a continue setting of the node (`errorMode`), the node makes the error items of v1
 * itself, from the errors that the `sql` effect gives as data. No statement runs a second
 * time. The result is then one item `{ items, errors, nodeError?, retry? }`, as the
 * Postgres node gives it (spec 9.10). v1 keeps the error object of an item that fails
 * beside its JSON (`error` of the item). This node gives the JSON only.
 *
 * When the node cannot make the result of v1, it throws an error that ends with
 * `(limit: sql-host)` before it sends a statement, and n8n runs the v1 node in the fallback
 * host. The cases:
 * - a `{{ }}` part of the query text, or a query parameter, with a value that JavaScript
 *   writes in a way this node cannot prove (null or an object as a part of the text; an
 *   object with its own `toString`);
 * - a query before version 2.5 with a `$n` that has no query parameter;
 * - a statement that v1 sends as one statement and that can give more than one result: a
 *   `CALL`, or a `;` that is not in a string, a quoted name or a comment. v1 then gives
 *   lists as items;
 * - the modes `independently` and `transaction` with no statement to send, or with more
 *   statements than one `sql` call takes;
 * - a table, a column or a list of the node that is not the type that v1 reads without a
 *   failure of JavaScript (a table that is not text, values to send that are not a list);
 * - a member of a where clause, a sort rule or a value to send that is not in the
 *   parameters: n8n gives it a default that this node does not see;
 * - a column name that is a number (JavaScript moves it to the front of the columns) or a
 *   name that a plain object of JavaScript has;
 * - a where clause with `>`, `<`, `>=` or `<=` and a value that is null: v1 reads null and
 *   undefined in two ways there;
 * - a `priority` option that is not one of its two values: v1 writes it into the text.
 *
 * A query that is not an expression can hold `{{ }}` parts. v1 evaluates them for each item
 * and puts the text of each value in their place. The converter gives the values in
 * `queryParts`, and this node puts the text in the same places. This is the text of the
 * query: it is not a query parameter.
 *
 * The converter runs the node once for all items, with the parameters of each item in
 * `batch`, and adds `nodeVersion`, `replacement` and `queryParts`, and `errorMode` and
 * `node` with a continue setting.
 */
import {
	defineNode,
	type Item,
	type SqlError,
	type SqlOk,
	type SqlResult,
	type SqlRows,
	type SqlStatement,
} from '@n8n/workflow-lang';

/** One comma-separated entry of the raw text of the query parameters, as v1 reads it. */
interface Segment {
	/** The text of the entry. */
	text?: string;
	/** The entry is one `{{ }}`: its value. */
	one?: unknown;
	/** The `{{ }}` parts of an entry with text around them, and the value of each. */
	sources?: string[];
	values?: unknown[];
}

interface Replacement {
	/** The option is in the parameters of the node. */
	present?: boolean;
	/** The raw text is an expression: its entries. Absent: the raw text is not an expression. */
	segments?: Segment[];
}

interface MySqlOptions {
	queryReplacement?: unknown;
	queryBatching?: unknown;
	detailedOutput?: unknown;
	largeNumbersOutput?: unknown;
	decimalNumbers?: unknown;
	replaceEmptyStrings?: unknown;
	connectionTimeoutMillis?: unknown;
	connectionLimit?: unknown;
	outputColumns?: unknown;
	selectDistinct?: unknown;
	priority?: unknown;
	skipOnConflict?: unknown;
}

interface MySqlParameters {
	resource?: string;
	operation?: string;
	query?: unknown;
	table?: unknown;
	returnAll?: unknown;
	limit?: unknown;
	where?: unknown;
	sort?: unknown;
	combineConditions?: unknown;
	deleteCommand?: unknown;
	dataMode?: unknown;
	columnToMatchOn?: unknown;
	valueToMatchOn?: unknown;
	valuesToSend?: unknown;
	options?: MySqlOptions;
	/**
	 * The node continues on an error: `regular` for the usual output, `errorOutput` for the
	 * error output. Set by the converter.
	 */
	errorMode?: string;
	/** The node as n8n holds it in a run, for the error items of v1. Set by the converter. */
	node?: unknown;
	/** The version of the node. Set by the converter. */
	nodeVersion?: number;
	/** The parts of `options.queryReplacement`, as v1 reads its raw text. Set by the converter. */
	replacement?: Replacement;
	/** The value of each `{{ }}` of the query text, in order. Set by the converter. */
	queryParts?: unknown[];
	/** The parameters of each input item. Set by the converter. */
	batch?: MySqlParameters[];
}

const HOST_MARKER = '(limit: sql-host)';
/** `RUNS_IN_HOST` of the converter: the workflow runs the host form of the node in the same run. */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';
/** The runtime refuses a call with more statements (`--sql-max-statements`). */
const MAX_STATEMENTS = 256;
/**
 * The operations and the error settings of the node that have no recording against the v1
 * node yet (`mysql-recordings.json`). The converter keeps a node with one of them in the
 * fallback host (`mysqlInHost` of `src/convert/library.ts`). Only the recording harness
 * converts them (`ConvertOptions.mysqlRecordFirst`). After the recording: make this list
 * empty.
 */
// biome-ignore format: the converter reads this list as one line of text
export const MYSQL_RECORD_FIRST: string[] = ['select', 'insert', 'update', 'upsert', 'deleteTable', 'continueRegularOutput', 'continueErrorOutput'];
const OPERATIONS = ['executeQuery', 'select', 'insert', 'update', 'upsert', 'deleteTable'];
const AUTO_MAP = 'autoMapInputData';
const MANUAL = 'defineBelow';
const CONDITIONS = ['equal', '!=', 'LIKE', '>', '<', '>=', '<=', 'IS NULL', 'IS NOT NULL', '='];
const COMPARISONS = ['>', '<', '>=', '<='];
/** Names that a plain object of JavaScript has before a column gives them. */
const OBJECT_NAMES = [
	'constructor',
	'toString',
	'valueOf',
	'toLocaleString',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'__proto__',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
];
/** `COMMON_ERRORS` of n8n-workflow: a message that holds a code gets the text of the code. */
const COMMON_ERRORS = [
	['ECONNREFUSED', 'The service refused the connection - perhaps it is offline'],
	[
		'ECONNRESET',
		'The connection to the server was closed unexpectedly, perhaps it is offline. You can retry the request immediately or wait and retry later.',
	],
	[
		'ENOTFOUND',
		'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
	],
	[
		'ETIMEDOUT',
		"The connection timed out, consider setting the 'Retry on Fail' option in the node settings",
	],
	[
		'ERRADDRINUSE',
		'The port is already occupied by some other application, if possible change the port or kill the application that is using it',
	],
	['EADDRNOTAVAIL', 'The address is not available, ensure that you have the right IP address'],
	['ECONNABORTED', 'The connection was aborted, perhaps the server is offline'],
	['EHOSTUNREACH', 'The host is unreachable, perhaps the server is offline'],
	['EAI_AGAIN', 'The DNS server returned an error, perhaps the server is offline'],
	['ENOENT', 'The file or directory does not exist'],
	['EISDIR', 'The file path was expected but the given path is a directory'],
	['ENOTDIR', 'The directory path was expected but the given path is a file'],
	['EACCES', 'Forbidden by access permissions, make sure you have the right permissions'],
	['EEXIST', 'The file or directory already exists'],
	['EPERM', 'Operation not permitted, make sure you have the right permissions'],
	['GETADDRINFO', 'The server closed the connection unexpectedly'],
];

/** A query of v1 with its values (`QueryWithValues`). */
interface Prepared {
	query: string;
	values: unknown[];
	/** The index of the input item. The one query of `insert` in the mode `single` has none. */
	itemIndex?: number;
}

/** An output item of v1 with the index of the input item that it pairs with. */
interface Out {
	json: Item;
	paired?: number;
	/** v1 keeps an error object beside the JSON of the item (`prepareErrorItem`). */
	failed?: boolean;
}

/** What `parseMySqlError` of v1 and the NodeOperationError of n8n make of an error. */
interface Parsed {
	message: string;
	description?: string;
	itemIndex: number;
	messages: string[];
	/** v1 fails with an error of JavaScript while it reads the error of the database. */
	crash?: boolean;
}

// mysql-format:begin
const MYF_HOST_MARKER = '(limit: sql-host)';
/** `SET_CLAUSE_TERMINATORS` of sql-escaper. */
const MYF_SET_TERMINATORS = [
	'where',
	'order',
	'group',
	'having',
	'limit',
	'union',
	'returning',
	'into',
	'for',
	'lock',
	'offset',
	'window',
	'procedure',
	'on',
];

interface MyfQuery {
	query: string;
	values: unknown[];
}

function myfHostError(reason: string): Error {
	return new Error(`${reason} ${MYF_HOST_MARKER}`);
}

function myfIsRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `String(value)` of JavaScript for JSON data. */
function myfString(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		const parts: string[] = [];
		for (const member of value) {
			parts.push(member === null || member === undefined ? '' : myfString(member));
		}
		return parts.join(',');
	}
	if (myfIsRecord(value)) {
		// JavaScript calls the `toString` member. A member that is data makes it fail.
		if (Object.keys(value).includes('toString')) {
			throw myfHostError('An object has its own toString member');
		}
		return '[object Object]';
	}
	throw myfHostError('A value is not JSON data');
}

/** `escapeString` of sql-escaper. */
function myfEscapeString(value: string): string {
	let out = "'";
	let start = 0;
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		let escaped = '';
		if (code === 0) escaped = '\\0';
		else if (code === 8) escaped = '\\b';
		else if (code === 9) escaped = '\\t';
		else if (code === 10) escaped = '\\n';
		else if (code === 13) escaped = '\\r';
		else if (code === 26) escaped = '\\Z';
		else if (code === 34) escaped = '\\"';
		else if (code === 39) escaped = "\\'";
		else if (code === 92) escaped = '\\\\';
		else continue;
		out += value.slice(start, i) + escaped;
		start = i + 1;
	}
	return `${out}${value.slice(start)}'`;
}

/** `escapeId` of sql-escaper: `connection.escapeId(value)`, and a `??` place of `format`. */
function myfEscapeId(value: unknown, forbidQualified: boolean): string {
	if (Array.isArray(value)) {
		const parts: string[] = [];
		for (const member of value) parts.push(myfEscapeId(member, forbidQualified));
		return parts.join(', ');
	}
	const identifier = myfString(value);
	const quoted = identifier.replaceAll('`', '``');
	if (forbidQualified || identifier.includes('->')) return `\`${quoted}\``;
	return `\`${quoted.replaceAll('.', '`.`')}\``;
}

/** `arrayToList` of sql-escaper. */
function myfList(list: unknown[]): string {
	const parts: string[] = [];
	for (const value of list) {
		parts.push(Array.isArray(value) ? `(${myfList(value)})` : myfEscape(value));
	}
	return parts.join(', ');
}

/**
 * `escape` of sql-escaper with `stringifyObjects` set, which is each call that mysql2
 * makes: `connection.escape(value)`, and each value of `format` that is not a number.
 */
function myfEscape(value: unknown): string {
	if (value === undefined || value === null) return 'NULL';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') return String(value);
	if (typeof value === 'string') return myfEscapeString(value);
	if (Array.isArray(value)) return myfList(value);
	if (myfIsRecord(value)) return myfEscapeString(myfString(value));
	throw myfHostError('A value is not JSON data');
}

/** `objectToValues` of sql-escaper: the members of an object as a `SET` list. */
function myfAssignments(value: Record<string, unknown>): string {
	const parts: string[] = [];
	for (const key of Object.keys(value)) {
		parts.push(`${myfEscapeId(key, false)} = ${myfEscape(value[key])}`);
	}
	return parts.join(', ');
}

function myfIsWordChar(code: number): boolean {
	return (
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122) ||
		(code >= 48 && code <= 57) ||
		code === 95
	);
}

function myfIsBlank(code: number): boolean {
	return code === 32 || code === 9 || code === 10 || code === 13;
}

/** `matchesWord` of sql-escaper: the word `word` (lower case) is at `position`, in any case. */
function myfMatchesWord(sql: string, position: number, word: string): boolean {
	for (let offset = 0; offset < word.length; offset++) {
		const code = sql.charCodeAt(position + offset);
		const letter = word.charCodeAt(offset);
		if (code !== letter && code !== letter - 32) return false;
	}
	const end = position + word.length;
	return (
		(position === 0 || !myfIsWordChar(sql.charCodeAt(position - 1))) &&
		(end >= sql.length || !myfIsWordChar(sql.charCodeAt(end)))
	);
}

/**
 * `skipSqlContext` of sql-escaper: the end of the string, the quoted name or the comment
 * that starts at `position`, or -1.
 */
function myfSkipContext(sql: string, position: number): number {
	const current = sql.charCodeAt(position);
	const next = sql.charCodeAt(position + 1);
	if (current === 39) {
		for (let cursor = position + 1; cursor < sql.length; cursor++) {
			const code = sql.charCodeAt(cursor);
			if (code === 92) cursor++;
			else if (code === 39) return cursor + 1;
		}
		return sql.length;
	}
	if (current === 96) {
		for (let cursor = position + 1; cursor < sql.length; cursor++) {
			if (sql.charCodeAt(cursor) !== 96) continue;
			if (sql.charCodeAt(cursor + 1) === 96) {
				cursor++;
				continue;
			}
			return cursor + 1;
		}
		return sql.length;
	}
	if (current === 45 && next === 45) {
		const after = sql.charCodeAt(position + 2);
		if (position + 2 >= sql.length || after <= 32) {
			const lineBreak = sql.indexOf('\n', position + 2);
			return lineBreak === -1 ? sql.length : lineBreak + 1;
		}
		return -1;
	}
	if (current === 47 && next === 42) {
		const marker = sql.charCodeAt(position + 2);
		if (marker === 33 || marker === 43) return -1;
		const commentEnd = sql.indexOf('*/', position + 2);
		return commentEnd === -1 ? sql.length : commentEnd + 2;
	}
	return -1;
}

function myfIsContextStart(code: number): boolean {
	return code === 39 || code === 96 || code === 45 || code === 47;
}

/** `findNextPlaceholder` of sql-escaper. */
function myfNextPlaceholder(sql: string, start: number): number {
	for (let position = start; position < sql.length; position++) {
		const code = sql.charCodeAt(position);
		if (code === 63) return position;
		if (myfIsContextStart(code)) {
			const contextEnd = myfSkipContext(sql, position);
			if (contextEnd !== -1) position = contextEnd - 1;
		}
	}
	return -1;
}

/** `isInSetAssignmentList` of sql-escaper. */
function myfInSetList(sql: string, setEnd: number, placeholder: number): boolean {
	let depth = 0;
	let sawContent = false;
	let lastWasComma = false;
	let i = setEnd;
	while (i < placeholder) {
		const code = sql.charCodeAt(i);
		if (myfIsContextStart(code)) {
			const contextEnd = myfSkipContext(sql, i);
			if (contextEnd !== -1) {
				i = contextEnd;
				sawContent = true;
				lastWasComma = false;
				continue;
			}
		}
		if (myfIsBlank(code)) {
			i++;
			continue;
		}
		if (code === 40) {
			depth++;
			sawContent = true;
			lastWasComma = false;
			i++;
			continue;
		}
		if (code === 41) {
			depth--;
			if (depth < 0) return false;
			sawContent = true;
			lastWasComma = false;
			i++;
			continue;
		}
		if (myfIsWordChar(code)) {
			if (depth === 0 && !(code >= 48 && code <= 57)) {
				for (const word of MYF_SET_TERMINATORS) {
					if (myfMatchesWord(sql, i, word)) return false;
				}
			}
			i++;
			while (i < placeholder && myfIsWordChar(sql.charCodeAt(i))) i++;
			sawContent = true;
			lastWasComma = false;
			continue;
		}
		if (depth === 0) {
			if (code === 59) return false;
			if (code === 44) {
				lastWasComma = true;
				sawContent = true;
				i++;
				continue;
			}
		}
		sawContent = true;
		lastWasComma = false;
		i++;
	}
	return depth === 0 && (!sawContent || lastWasComma);
}

/** `findSetKeyword` of sql-escaper: the end of the next `SET` or `KEY UPDATE`, or -1. */
function myfSetKeyword(sql: string, startFrom: number): number {
	for (let position = startFrom; position < sql.length; position++) {
		const code = sql.charCodeAt(position);
		if (myfIsContextStart(code)) {
			const contextEnd = myfSkipContext(sql, position);
			if (contextEnd !== -1) {
				position = contextEnd - 1;
				continue;
			}
		}
		if (myfMatchesWord(sql, position, 'set')) return position + 3;
		if (myfMatchesWord(sql, position, 'key')) {
			let cursor = position + 3;
			while (cursor < sql.length && myfIsBlank(sql.charCodeAt(cursor))) cursor++;
			if (myfMatchesWord(sql, cursor, 'update')) return cursor + 6;
		}
	}
	return -1;
}

/**
 * `connection.format(sql, values)` of mysql2 for a connection without the options
 * `stringifyObjects`, `namedPlaceholders` and `queryFormat`, as the v1 node makes it.
 */
function myfFormat(sql: string, values: unknown[]): string {
	let setIndex = -2;
	let nextSetIndex = -1;
	let result = '';
	let chunkIndex = 0;
	let valuesIndex = 0;
	let placeholder = myfNextPlaceholder(sql, 0);
	while (valuesIndex < values.length && placeholder !== -1) {
		let placeholderEnd = placeholder + 1;
		while (sql.charCodeAt(placeholderEnd) === 63) placeholderEnd++;
		const length = placeholderEnd - placeholder;
		const value = values[valuesIndex];
		if (length > 2) {
			placeholder = myfNextPlaceholder(sql, placeholderEnd);
			continue;
		}
		let escaped = '';
		if (length === 2) escaped = myfEscapeId(value, false);
		else if (typeof value === 'number') escaped = String(value);
		else if (myfIsRecord(value)) {
			let previous = placeholder - 1;
			while (previous >= chunkIndex && myfIsBlank(sql.charCodeAt(previous))) previous--;
			const code = previous >= chunkIndex ? sql.charCodeAt(previous) : 0;
			// sql-escaper sets bit 5 of the character and then tests for a letter or a comma:
			// a form feed (12) becomes a comma (44).
			const letter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
			if (!letter && code !== 44 && code !== 12) escaped = myfEscape(value);
			else {
				if (setIndex === -2) {
					setIndex = myfSetKeyword(sql, 0);
					nextSetIndex = setIndex === -1 ? -1 : myfSetKeyword(sql, setIndex);
				}
				while (nextSetIndex !== -1 && nextSetIndex <= placeholder) {
					setIndex = nextSetIndex;
					nextSetIndex = myfSetKeyword(sql, nextSetIndex);
				}
				if (
					setIndex !== -1 &&
					setIndex <= placeholder &&
					myfInSetList(sql, setIndex, placeholder)
				) {
					escaped = myfAssignments(value);
				} else escaped = myfEscape(value);
			}
		} else escaped = myfEscape(value);
		result += sql.slice(chunkIndex, placeholder) + escaped;
		chunkIndex = placeholderEnd;
		valuesIndex++;
		placeholder = myfNextPlaceholder(sql, placeholderEnd);
	}
	if (chunkIndex === 0) return sql;
	return result + sql.slice(chunkIndex);
}

/** `escapeSqlIdentifier` of the v1 node: each part between dots in backticks. */
function myfIdentifier(identifier: string): string {
	const parts: string[] = [];
	let i = 0;
	while (i < identifier.length) {
		const code = identifier.charCodeAt(i);
		if (code === 96) {
			const close = identifier.indexOf('`', i + 1);
			// A backtick without a second one is in no part.
			if (close === -1) {
				i++;
				continue;
			}
			parts.push(identifier.slice(i, close + 1));
			i = close + 1;
			continue;
		}
		if (code === 46) {
			i++;
			continue;
		}
		let end = i;
		while (end < identifier.length) {
			const next = identifier.charCodeAt(end);
			if (next === 46 || next === 96) break;
			end++;
		}
		const part = identifier.slice(i, end).trim();
		parts.push(`\`${part}\``);
		i = end;
	}
	return parts.join('.');
}

/** `isInsideQuotes` of n8n (`utils/sql-query-parameters.ts`). */
function myfInsideQuotes(text: string, index: number): boolean {
	let quote = 0;
	for (let i = 0; i < index; i++) {
		const code = text.charCodeAt(i);
		if (quote === 0) {
			if (code === 39 || code === 34) quote = code;
		} else if (code === quote) {
			if (text.charCodeAt(i + 1) === quote) i++;
			else quote = 0;
		}
	}
	return quote !== 0;
}

/**
 * `text.replace(pattern, replacement)` of JavaScript for a pattern that is text: the first
 * place of the pattern, with the `$` forms of the replacement text.
 */
function myfReplaceFirst(text: string, pattern: string, replacement: string): string {
	const at = text.indexOf(pattern);
	if (at === -1) return text;
	const before = text.slice(0, at);
	const after = text.slice(at + pattern.length);
	if (!replacement.includes('$')) return before + replacement + after;
	let out = '';
	let i = 0;
	while (i < replacement.length) {
		const code = replacement.charCodeAt(i);
		const next = replacement.charCodeAt(i + 1);
		if (code === 36 && next === 36) out += '$';
		else if (code === 36 && next === 38) out += pattern;
		else if (code === 36 && next === 96) out += before;
		else if (code === 36 && next === 39) out += after;
		else {
			out += replacement.charAt(i);
			i++;
			continue;
		}
		i += 2;
	}
	return before + out + after;
}

interface MyfMatch {
	text: string;
	index: number;
	number: string;
	isName: boolean;
}

/** The matches of `/\$(\d+)(?::name)?/g` in `query`. */
function myfMatches(query: string): MyfMatch[] {
	const out: MyfMatch[] = [];
	let i = 0;
	while (i < query.length) {
		if (query.charCodeAt(i) !== 36) {
			i++;
			continue;
		}
		let end = i + 1;
		while (end < query.length) {
			const code = query.charCodeAt(end);
			if (code < 48 || code > 57) break;
			end++;
		}
		if (end === i + 1) {
			i++;
			continue;
		}
		const number = query.slice(i + 1, end);
		const isName = query.startsWith(':name', end);
		if (isName) end += 5;
		out.push({ text: query.slice(i, end), index: i, number, isName });
		i = end;
	}
	return out;
}

/** `toIdentifierText` of the v1 node. */
function myfIdentifierText(value: unknown, number: string): string {
	if (value === null || value === undefined) {
		throw new Error(`Parameter $${number} has no value to use as an identifier`);
	}
	return myfString(value);
}

/** `prepareSafeQuery` of the v1 node (version 2.5 and later). */
function myfPrepareSafe(rawQuery: string, replacements: unknown[]): MyfQuery {
	const valid: MyfMatch[] = [];
	for (const match of myfMatches(rawQuery)) {
		if (!myfInsideQuotes(rawQuery, match.index)) valid.push(match);
	}
	for (const match of valid) {
		const index = Number(match.number) - 1;
		if (index >= replacements.length || index < 0) {
			throw new Error(
				`Parameter $${match.number} referenced in query but no replacement value provided at index ${index + 1}`,
			);
		}
	}
	let query = rawQuery;
	// v1 goes from the last match to the first, and replaces the first place of the text of
	// the match each time.
	for (let k = valid.length - 1; k >= 0; k--) {
		const match = valid[k];
		const index = Number(match.number) - 1;
		if (match.isName) {
			query = myfReplaceFirst(
				query,
				match.text,
				myfIdentifier(myfIdentifierText(replacements[index], match.number)),
			);
		} else query = myfReplaceFirst(query, match.text, '?');
	}
	// The values in the order of their numbers. Two matches of one number have one value.
	const numbers: number[] = [];
	for (const match of valid) {
		if (!match.isName) numbers.push(Number(match.number));
	}
	numbers.sort((a, b) => a - b);
	const values: unknown[] = [];
	for (const number of numbers) values.push(replacements[number - 1]);
	return { query, values };
}

/** `prepareQueryLegacy` of the v1 node (before version 2.5). */
function myfPrepareLegacy(rawQuery: string, replacements: unknown[]): MyfQuery {
	let query = rawQuery;
	const values: unknown[] = [];
	for (const match of myfMatches(rawQuery)) {
		const index = Number(match.number) - 1;
		// v1 reads a value that is not there as undefined. This code has no undefined in a list.
		if (index < 0 || index >= replacements.length) {
			if (match.isName) myfIdentifierText(undefined, match.number);
			throw myfHostError(`The query has $${match.number}, and no query parameter is there`);
		}
		if (match.isName) {
			query = myfReplaceFirst(
				query,
				match.text,
				myfIdentifier(myfIdentifierText(replacements[index], match.number)),
			);
		} else {
			query = myfReplaceFirst(query, match.text, '?');
			values.push(replacements[index]);
		}
	}
	return { query, values };
}

/** `prepareQueryAndReplacements` of the v1 node, for a list of query parameters. */
function myfPrepare(rawQuery: string, version: number, replacements: unknown[]): MyfQuery {
	return version >= 2.5
		? myfPrepareSafe(rawQuery, replacements)
		: myfPrepareLegacy(rawQuery, replacements);
}

/**
 * `Number(value) ? Number(value) : value` of the v1 node (`executeQuery` from version
 * 2.3): a value that is a number other than 0 for JavaScript becomes that number.
 */
function myfNumberOr(value: unknown): unknown {
	let number = 0;
	if (typeof value === 'number') number = value;
	else if (typeof value === 'string') number = Number(value);
	else if (typeof value === 'boolean') number = value ? 1 : 0;
	else if (value === null || value === undefined) number = 0;
	else number = Number(myfString(value));
	return number !== 0 && !isNaN(number) ? number : value;
}

function myfWithoutLineFeeds(text: string): string {
	return text.replaceAll('\n', '');
}

/**
 * `text.split(END_OF_STATEMENT)` of the v1 node: a `;` ends a statement when the text after
 * it reads to its end as characters, `'...'` strings and backslash pairs.
 */
function myfSplitAtEnds(text: string): string[] {
	const n = text.length;
	// reads[i]: the text from `i` reads to its end.
	const reads: boolean[] = [];
	for (let i = 0; i <= n + 1; i++) reads.push(i === n);
	for (let i = n - 1; i >= 0; i--) {
		const code = text.charCodeAt(i);
		if (code === 92) reads[i] = i + 1 < n && reads[i + 2];
		else if (code === 39) {
			const close = text.indexOf("'", i + 1);
			reads[i] = close !== -1 && reads[close + 1];
		} else reads[i] = reads[i + 1];
	}
	const parts: string[] = [];
	let start = 0;
	for (let i = 0; i < n; i++) {
		if (text.charCodeAt(i) === 59 && reads[i + 1]) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts;
}

/**
 * The statements of a formatted query, as the v1 node splits it. `single`: the mode
 * `single`, where v1 drops an empty statement. Version 2.3 and earlier split at each `;`.
 */
function myfStatements(query: string, version: number, single: boolean): string[] {
	const out: string[] = [];
	if (version <= 2.3) {
		if (single) {
			for (const part of myfWithoutLineFeeds(query).split(';')) {
				if (part !== '') out.push(part);
			}
			return out;
		}
		for (const part of query.split(';')) out.push(part.trim());
		return out;
	}
	for (const part of myfSplitAtEnds(myfWithoutLineFeeds(query))) {
		const statement = part.trim();
		if (!single || statement !== '') out.push(statement);
	}
	return out;
}

/** The one text of the mode `single` of the v1 node for the formatted queries of all items. */
function myfJoin(queries: string[]): string {
	if (queries.length === 1) return queries[0];
	const parts: string[] = [];
	for (const query of queries) {
		const text = query.trim();
		parts.push(text.endsWith(';') ? text.slice(0, text.length - 1) : text);
	}
	return parts.join(';');
}

function myfIsLineEnd(code: number): boolean {
	return code === 10 || code === 13 || code === 8232 || code === 8233;
}

/** `text.replace(/\/\*.*?\*\//g, '')`: each comment that has no line end in it. */
function myfWithoutComments(text: string): string {
	let out = '';
	let i = 0;
	while (i < text.length) {
		if (text.charCodeAt(i) === 47 && text.charCodeAt(i + 1) === 42) {
			let end = -1;
			for (let j = i + 2; j + 1 < text.length; j++) {
				const code = text.charCodeAt(j);
				if (code === 42 && text.charCodeAt(j + 1) === 47) {
					end = j + 2;
					break;
				}
				if (myfIsLineEnd(code)) break;
			}
			if (end !== -1) {
				i = end;
				continue;
			}
		}
		out += text.charAt(i);
		i++;
	}
	return out;
}

/** The check of `prepareOutput` of the v1 node: each statement that is not a `--` line starts with `select`. */
function myfAllSelect(statements: string[]): boolean {
	for (const statement of statements) {
		if (statement.startsWith('--')) continue;
		const text = myfWithoutLineFeeds(myfWithoutComments(statement)).toLowerCase();
		if (!text.startsWith('select')) return false;
	}
	return true;
}
// mysql-format:end

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The error that sends the node to the fallback host. Nothing was sent. */
function hostError(reason: string): Error {
	return new Error(
		`MySQL: ${reason}. The fallback host runs the node ${HOST_MARKER} ${RUNS_IN_HOST}`,
	);
}

function messageOf(error: unknown): string {
	return typeof error === 'object' && error !== null && 'message' in error
		? String(error.message)
		: String(error);
}

/** An error of the formatter that goes to the host gets the text of this node. */
function withHost(error: unknown): unknown {
	const message = messageOf(error);
	if (!message.endsWith(HOST_MARKER)) return error;
	return hostError(message.slice(0, message.length - HOST_MARKER.length).trim());
}

/** `getResolvables` of n8n: each `{{ }}` of a text. */
function resolvables(text: string): string[] {
	const out: string[] = [];
	let at = text.indexOf('{{');
	while (at !== -1) {
		const end = text.indexOf('}}', at + 2);
		if (end === -1) break;
		out.push(text.slice(at, end + 2));
		at = text.indexOf('{{', end + 2);
	}
	return out;
}

function isPrimitive(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** The text of JavaScript's `String` for the value of a part of a query. */
function partText(value: unknown): string {
	if (isPrimitive(value)) return String(value);
	if (Array.isArray(value)) {
		const members: string[] = [];
		for (const member of value) {
			if (!isPrimitive(member)) {
				throw hostError('A part of the query text is a list with a null or an object');
			}
			members.push(String(member));
		}
		return members.join(',');
	}
	// v1 writes `undefined`, `null` or `[object Object]`, and the converter gives null for undefined.
	throw hostError('A part of the query text is null or an object');
}

/**
 * The query text of one item: the text of each `{{ }}` value in the place of its part, as
 * the v1 node puts it with `query.replace(part, value)`.
 */
function queryTextOf(p: MySqlParameters): string {
	if (typeof p.query !== 'string') throw hostError('The query is not text');
	const found = resolvables(p.query);
	if (p.queryParts === undefined) {
		if (found.length > 0) throw hostError('The query text has an expression that did not run');
		return p.query;
	}
	if (found.length !== p.queryParts.length)
		throw hostError('The parts of the query text do not fit');
	let text = p.query;
	for (let i = 0; i < found.length; i++) {
		text = myfReplaceFirst(text, found[i], partText(p.queryParts[i]));
	}
	return text;
}

/** `renderAsText` of n8n for a `{{ }}` with text around it. */
function renderedText(value: unknown): string {
	if (value === undefined || value === null) return '';
	return myfString(value);
}

/** The query parameters of one item, as `executeQuery` of v1 reads them. */
function replacementsOf(p: MySqlParameters): unknown[] {
	const replacement = p.replacement ?? {};
	const given = replacement.present === true ? (p.options ?? {}).queryReplacement : undefined;
	// `options.queryReplacement || []`.
	if (given === undefined || given === null || given === '' || given === false) return [];
	if (typeof given === 'number' && (given === 0 || isNaN(given))) return [];
	if (Array.isArray(given)) return given;
	if (typeof given !== 'string') {
		throw new Error(
			'Query Replacement must be a string of comma-separated values, or an array of values',
		);
	}
	const values: unknown[] = [];
	if (replacement.segments === undefined) {
		// The raw text is not an expression: its entries are text.
		for (const entry of given.split(',')) values.push(entry.trim());
		return values;
	}
	const segments = replacement.segments;
	for (const segment of segments) {
		if (segment.sources !== undefined) {
			const parts = segment.values ?? [];
			if (typeof segment.text !== 'string' || parts.length !== segment.sources.length) {
				throw hostError('The parts of a query parameter do not fit');
			}
			let rendered = segment.text;
			for (let k = 0; k < segment.sources.length; k++) {
				const at = rendered.indexOf(segment.sources[k]);
				if (at === -1) continue;
				rendered =
					rendered.slice(0, at) +
					renderedText(parts[k]) +
					rendered.slice(at + segment.sources[k].length);
			}
			values.push(rendered);
		} else if (typeof segment.text === 'string') values.push(segment.text);
		else {
			const value = segment.one ?? null;
			if (segments.length !== 1 && typeof value === 'object' && value !== null) {
				throw new Error(
					'Query Parameters cannot resolve a value with multiple fields (like an array or an object) for one of several comma-separated values. Use a single value for this parameter, or move it to its own expression.',
				);
			}
			values.push(value);
		}
	}
	return values;
}

function isWordCode(code: number): boolean {
	return (
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122) ||
		(code >= 48 && code <= 57) ||
		code === 95
	);
}

/** True when the text has the word `call`, in any case. */
function hasCall(text: string): boolean {
	const lower = text.toLowerCase();
	let at = lower.indexOf('call');
	while (at !== -1) {
		const before = at === 0 || !isWordCode(lower.charCodeAt(at - 1));
		const after = at + 4 >= lower.length || !isWordCode(lower.charCodeAt(at + 4));
		if (before && after) return true;
		at = lower.indexOf('call', at + 1);
	}
	return false;
}

/**
 * True when the text is one command for a MySQL server with the default SQL mode: each `;`
 * is in a string, a quoted name or a comment, or only blanks follow it.
 */
function isOneCommand(text: string): boolean {
	let i = 0;
	while (i < text.length) {
		const code = text.charCodeAt(i);
		const next = text.charCodeAt(i + 1);
		if (code === 39 || code === 34 || code === 96) {
			let end = i + 1;
			while (end < text.length) {
				const inner = text.charCodeAt(end);
				if (inner === 92 && code !== 96) end += 2;
				else if (inner !== code) end++;
				else if (text.charCodeAt(end + 1) === code) end += 2;
				else break;
			}
			i = end + 1;
		} else if (code === 35 || (code === 45 && next === 45)) {
			const lineEnd = text.indexOf('\n', i);
			if (lineEnd === -1) return true;
			i = lineEnd + 1;
		} else if (code === 47 && next === 42) {
			const close = text.indexOf('*/', i + 2);
			if (close === -1) return true;
			i = close + 2;
		} else if (code === 59) {
			return text.slice(i + 1).trim() === '';
		} else i++;
	}
	return true;
}

/**
 * A statement that v1 sends as one statement must give one result: v1 makes its items from
 * one. `made`: this node made the statement from names and written values, so it is not a
 * call of a procedure.
 */
function checkOneResult(text: string, made: boolean): void {
	if (!made && hasCall(text))
		throw hostError('A statement can call a procedure, which gives more than one result');
	if (!isOneCommand(text))
		throw hostError('A statement of v1 is more than one command for the database');
}

/** `/\schanged:\s*(\d+)/i` of mysql2 on the text of an OK packet: the number, or 0. */
function changedRows(info: string): number {
	for (let i = 0; i + 9 <= info.length; i++) {
		if (info.charAt(i).trim() !== '') continue;
		if (info.slice(i + 1, i + 9).toLowerCase() !== 'changed:') continue;
		let at = i + 9;
		while (at < info.length && info.charAt(at).trim() === '') at++;
		let end = at;
		while (end < info.length) {
			const code = info.charCodeAt(end);
			if (code < 48 || code > 57) break;
			end++;
		}
		if (end > at) return parseInt(info.slice(at, end), 10);
	}
	return 0;
}

/** The `ResultSetHeader` of mysql2 for an OK packet. */
function headerOf(ok: SqlOk): Item {
	return {
		fieldCount: 0,
		affectedRows: ok.affectedRows,
		insertId: ok.insertId,
		info: ok.info,
		serverStatus: ok.serverStatus,
		warningStatus: ok.warningStatus,
		changedRows: changedRows(ok.info),
	};
}

/** What mysql2 gives for the results of one text: the rows, a header, or a list of them. */
function responseOf(sets: SqlRows[]): unknown {
	const list: unknown[] = [];
	for (const set of sets) list.push(set.ok !== undefined ? headerOf(set.ok) : set.rows);
	return list.length === 1 ? list[0] : list;
}

/** The statements ran, and their result has a form from which this node cannot make the items of v1. */
function resultError(): Error {
	return new Error(
		'MySQL: the database gave more results than one command gives. The node cannot make the items of v1 from them',
	);
}

function outOf(json: Item, paired: number | undefined): Out {
	return paired === undefined ? { json } : { json, paired };
}

/**
 * `prepareOutput` of the v1 node. `pairs`: the input items of the queries. `shared`: each
 * item pairs with the first of them (the modes `independently` and `transaction`). Else
 * the rows of result `k` pair with the item of query `k` (the mode `single`).
 */
function outputOf(
	response: unknown[],
	detailed: boolean,
	statements: string[],
	version: number,
	pairs: number[],
	shared: boolean,
): Out[] {
	const out: Out[] = [];
	const firstPair = pairs.length > 0 ? pairs[0] : undefined;
	if (detailed) {
		for (let index = 0; index < response.length; index++) {
			const item: Item = {};
			if (index < statements.length) item.sql = statements[index];
			item.data = response[index];
			out.push(outOf(item, firstPair));
		}
	} else {
		let index = 0;
		for (const entry of response) {
			if (!Array.isArray(entry)) continue;
			const paired = shared ? firstPair : index < pairs.length ? pairs[index] : undefined;
			index++;
			for (const row of entry) {
				if (!isRecord(row)) throw resultError();
				out.push(outOf(row, paired));
			}
		}
	}
	if (out.length === 0 && (version < 2.2 || !myfAllSelect(statements))) {
		out.push(outOf({ success: true }, firstPair));
	}
	return out;
}

/** What the NodeOperationError of n8n makes of a message and a description. */
function described(message: string, description: string | undefined, itemIndex: number): Parsed {
	let out = message;
	const messages: string[] = [];
	const upper = message.toUpperCase();
	for (const [code, text] of COMMON_ERRORS) {
		if (!upper.includes(code)) continue;
		messages.push(message);
		out = text;
		break;
	}
	const parsed: Parsed = { message: out, itemIndex, messages };
	if (description !== undefined && description !== '' && description !== message) {
		parsed.description = description;
	}
	return parsed;
}

/**
 * `parseMySqlError` of the v1 node for an error of the database. `sql`: the text that v1
 * sent when the error came, which mysql2 puts on the error.
 */
function parseFailure(
	error: SqlError,
	itemIndex: number,
	queries: string[],
	sql: string | undefined,
): Parsed {
	let message = error.message;
	if (
		queries.length > 0 &&
		message.toLowerCase().includes('you have an error in your sql syntax')
	) {
		let queryIndex = itemIndex;
		const near = message.split("near '");
		const tail = near.length > 1 ? near[1] : '';
		const failed = tail.split("' at")[0].split(';')[0];
		if (failed !== '') {
			if (queryIndex === 0 && queries.length > 1) {
				const found = queries.findIndex((query) => query.includes(failed));
				if (found !== -1) queryIndex = found;
			}
			// v1 reads a query that is not in its list, and fails with this error of JavaScript.
			if (queryIndex >= queries.length) {
				return {
					message: "Cannot read properties of undefined (reading 'split')",
					itemIndex,
					messages: [],
					crash: true,
				};
			}
			const line = queries[queryIndex].split('\n').findIndex((text) => text.includes(failed));
			if (line !== -1) {
				message = `You have an error in your SQL syntax on line ${line + 1} near '${failed}'`;
			}
		}
	}
	if (error.message.includes('ECONNREFUSED')) message = 'Connection refused';
	const code = error.code === undefined ? 'undefined' : error.code;
	return described(
		message,
		`sql: ${sql === undefined ? 'undefined' : sql}, code: ${code}`,
		itemIndex,
	);
}

/** The value is true for an `if` of JavaScript. */
function truthy(value: unknown): boolean {
	if (value === undefined || value === null || value === false || value === '') return false;
	if (typeof value === 'number') return value !== 0 && !isNaN(value);
	return true;
}

/** `Number(value)` of JavaScript for JSON data that is not null. */
function numberOf(value: unknown): number {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') return Number(value);
	if (typeof value === 'boolean') return value ? 1 : 0;
	return Number(myfString(value));
}

/** True when JavaScript puts the key before the other keys of an object: an array index. */
function isIndexKey(key: string): boolean {
	if (key === '' || key.length > 10) return false;
	for (let i = 0; i < key.length; i++) {
		const code = key.charCodeAt(i);
		if (code < 48 || code > 57) return false;
	}
	if (key.length > 1 && key.charCodeAt(0) === 48) return false;
	return Number(key) < 4294967295;
}

/** A column name that is a key of an object of v1. */
function checkKey(key: string): void {
	if (isIndexKey(key)) {
		throw hostError('A column name is a number, and JavaScript moves it before the other columns');
	}
	if (OBJECT_NAMES.includes(key)) {
		throw hostError('A column has a name that a plain object of JavaScript has');
	}
}

/** The JSON of an input item, with null for each empty string when `replace` is set. */
function inputJson(item: Item | undefined, replace: boolean): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (item === undefined) return out;
	for (const key of Object.keys(item)) {
		if (key === '$binary') continue;
		const value: unknown = item[key];
		out[key] = replace && value === '' ? null : value;
	}
	return out;
}

/** The table of the node as `escapeSqlIdentifier` of v1 writes it. */
function tableOf(p: MySqlParameters): string {
	const table = isRecord(p.table) ? p.table.value : p.table;
	if (typeof table !== 'string') throw hostError('The table is not text');
	return myfIdentifier(table);
}

/** `getWhereClauses` of the v1 node. */
function whereClauses(p: MySqlParameters): Array<Record<string, unknown>> {
	const list = isRecord(p.where) ? p.where.values : undefined;
	if (!Array.isArray(list)) return [];
	const clauses: Array<Record<string, unknown>> = [];
	for (const clause of list) {
		if (isRecord(clause) && !('condition' in clause)) {
			throw hostError('A where clause has no condition in the parameters');
		}
		if (
			!isRecord(clause) ||
			!('column' in clause) ||
			typeof clause.condition !== 'string' ||
			!CONDITIONS.includes(clause.condition)
		) {
			throw new Error('Invalid where clause');
		}
		clauses.push(clause);
	}
	return clauses;
}

/** `addWhereClauses` of the v1 node. */
function addWhere(
	query: Prepared,
	clauses: Array<Record<string, unknown>>,
	combine: unknown,
): void {
	if (clauses.length === 0) return;
	const combineWith = combine === 'OR' ? 'OR' : 'AND';
	let text = ' WHERE';
	const values: unknown[] = [];
	for (let index = 0; index < clauses.length; index++) {
		const clause = clauses[index];
		let condition = String(clause.condition);
		let value = clause.value;
		if (condition === 'equal') condition = '=';
		const unary = condition === 'IS NULL' || condition === 'IS NOT NULL';
		// n8n hides the value of a condition that takes none, and gives a default to a value
		// that is not in the parameters.
		if (!unary && !('value' in clause)) {
			throw hostError('A where clause has no value in the parameters');
		}
		if (COMPARISONS.includes(condition)) {
			// `Number(null)` is 0 and `Number(undefined)` is not a number.
			if (value === null || value === undefined) {
				throw hostError('A where clause compares a value that is null');
			}
			const numeric = numberOf(value);
			if (isNaN(numeric)) {
				throw new Error(
					`Operator in entry ${index + 1} of 'Select Rows' works with numbers, but value ${myfString(value)} is not a number`,
				);
			}
			value = numeric;
		}
		let place = ' ';
		if (!unary) {
			place = ' ?';
			values.push(value);
		}
		if (typeof clause.column !== 'string')
			throw hostError('The column of a where clause is not text');
		const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;
		text += ` ${myfIdentifier(clause.column)} ${condition}${place}${operator}`;
	}
	query.query += text;
	// `replacements.concat.apply(replacements, values)` of v1: the members of a list are values.
	for (const value of values) {
		if (Array.isArray(value)) for (const member of value) query.values.push(member);
		else query.values.push(value);
	}
}

/** The query of one item of `select`. */
function selectOf(p: MySqlParameters, itemIndex: number): Prepared {
	const table = tableOf(p);
	const options = p.options ?? {};
	if (options.outputColumns === null) throw hostError('The output columns are null');
	const columns = options.outputColumns ?? ['*'];
	if (!Array.isArray(columns)) throw hostError('The output columns are not a list');
	const names: string[] = [];
	let all = false;
	for (const column of columns) {
		if (typeof column !== 'string') throw hostError('An output column is not text');
		if (column === '*') all = true;
		names.push(myfIdentifier(column));
	}
	const head = truthy(options.selectDistinct) ? 'SELECT DISTINCT' : 'SELECT';
	const query: Prepared = {
		query: all ? `${head} * FROM ${table}` : `${head} ${names.join(', ')} FROM ${table}`,
		values: [],
		itemIndex,
	};
	addWhere(query, whereClauses(p), p.combineConditions ?? 'AND');
	const rules = isRecord(p.sort) ? p.sort.values : undefined;
	if (truthy(rules)) {
		if (!Array.isArray(rules)) throw hostError('The sort rules are not a list');
		const parts: string[] = [];
		for (const rule of rules) {
			if (!isRecord(rule) || typeof rule.column !== 'string' || !('direction' in rule)) {
				throw hostError('A sort rule has no column text or no direction');
			}
			parts.push(` ${myfIdentifier(rule.column)} ${rule.direction === 'ASC' ? 'ASC' : 'DESC'}`);
		}
		if (parts.length > 0) query.query += ` ORDER BY${parts.join(',')}`;
	}
	if (!truthy(p.returnAll ?? false)) {
		if (p.limit === null) throw hostError('The limit is null');
		query.query += ' LIMIT ?';
		query.values.push(p.limit ?? 50);
	}
	return query;
}

/** The query of one item of `deleteTable`. */
function deleteOf(p: MySqlParameters, itemIndex: number): Prepared {
	const table = tableOf(p);
	const command = p.deleteCommand === undefined ? 'truncate' : p.deleteCommand;
	const query: Prepared = { query: '', values: [], itemIndex };
	if (command === 'drop') query.query = `DROP TABLE IF EXISTS ${table}`;
	if (command === 'truncate') query.query = `TRUNCATE TABLE ${table}`;
	if (command === 'delete') {
		query.query = `DELETE FROM ${table}`;
		addWhere(query, whereClauses(p), p.combineConditions ?? 'AND');
	}
	if (query.query === '') {
		throw new Error('Invalid delete command, only drop, delete and truncate are supported ');
	}
	return query;
}

/** The item that v1 makes from `valuesToSend`: the value of each column. */
function manualItem(p: MySqlParameters): Record<string, unknown> {
	const list = isRecord(p.valuesToSend) ? p.valuesToSend.values : undefined;
	if (!Array.isArray(list)) throw hostError('The values to send are not a list');
	const item: Record<string, unknown> = {};
	for (const entry of list) {
		if (!isRecord(entry) || typeof entry.column !== 'string' || !('value' in entry)) {
			throw hostError('A value to send has no column text or no value');
		}
		checkKey(entry.column);
		item[entry.column] = entry.value;
	}
	return item;
}

/** The input item as v1 maps it to columns: each key is a column. */
function autoItem(item: Item | undefined, replace: boolean): Record<string, unknown> {
	const json = inputJson(item, replace);
	for (const key of Object.keys(json)) checkKey(key);
	return json;
}

function dataModeOf(p: MySqlParameters): unknown {
	return p.dataMode === undefined ? AUTO_MAP : p.dataMode;
}

/** `INSERT`, with the two options that v1 writes into the text. */
function insertHead(options: MySqlOptions): string {
	let priority = '';
	if (truthy(options.priority)) {
		if (options.priority !== 'LOW_PRIORITY' && options.priority !== 'HIGH_PRIORITY') {
			throw hostError('The priority option is not one of its values');
		}
		priority = options.priority;
	}
	return `INSERT ${priority} ${truthy(options.skipOnConflict) ? 'IGNORE' : ''} INTO`;
}

function columnList(columns: string[]): string {
	const names: string[] = [];
	for (const column of columns) names.push(myfIdentifier(column));
	return names.join(', ');
}

function places(count: number): string {
	const marks: string[] = [];
	for (let i = 0; i < count; i++) marks.push('?');
	return marks.join(',');
}

/** The one query of `insert` in the mode `single`, for all items. */
function insertAll(each: MySqlParameters[], inputs: Item[], replace: boolean): Prepared {
	const first = each[0];
	const table = tableOf(first);
	const dataMode = dataModeOf(first);
	const head = insertHead(first.options ?? {});
	const columns: string[] = [];
	const values: unknown[] = [];
	if (dataMode === AUTO_MAP) {
		const rows: Array<Record<string, unknown>> = [];
		for (let i = 0; i < each.length; i++) {
			const row = autoItem(inputs[i], replace);
			rows.push(row);
			for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
		}
		// `copyInputItems` of n8n: null for a column that an item does not have.
		for (const row of rows) {
			const keys = Object.keys(row);
			for (const column of columns) values.push(keys.includes(column) ? row[column] : null);
		}
	}
	if (dataMode === MANUAL) {
		for (const p of each) {
			const row = manualItem(p);
			for (const key of Object.keys(row)) {
				if (!columns.includes(key)) columns.push(key);
				// v1 gives the values of each item as they are, also when an item has fewer columns.
				values.push(row[key]);
			}
		}
	}
	const rowPlaces: string[] = [];
	for (let i = 0; i < each.length; i++) rowPlaces.push(`(${places(columns.length)})`);
	return {
		query: `${head} ${table} (${columnList(columns)}) VALUES ${rowPlaces.join(',')}`,
		values,
	};
}

/** The query of one item of `insert` in the modes `independently` and `transaction`. */
function insertOf(
	p: MySqlParameters,
	first: MySqlParameters,
	item: Item | undefined,
	replace: boolean,
	itemIndex: number,
): Prepared {
	const head = insertHead(p.options ?? {});
	const dataMode = dataModeOf(first);
	let row: Record<string, unknown> = {};
	if (dataMode === AUTO_MAP) row = autoItem(item, replace);
	if (dataMode === MANUAL) row = manualItem(p);
	const columns = Object.keys(row);
	const values: unknown[] = [];
	for (const column of columns) values.push(row[column]);
	return {
		query: `${head} ${tableOf(first)} (${columnList(columns)}) VALUES (${places(columns.length)});`,
		values,
		itemIndex,
	};
}

/** The column to match on of `update` and `upsert`. */
function matchColumn(p: MySqlParameters): string {
	const column = p.columnToMatchOn === undefined ? '' : p.columnToMatchOn;
	if (typeof column !== 'string') throw hostError('The column to match on is not text');
	return column;
}

/** The query of one item of `update`. */
function updateOf(
	p: MySqlParameters,
	item: Item | undefined,
	replace: boolean,
	itemIndex: number,
): Prepared {
	const table = tableOf(p);
	const column = matchColumn(p);
	const dataMode = dataModeOf(p);
	let row: Record<string, unknown> = {};
	let matchValue: unknown = '';
	if (dataMode === AUTO_MAP) {
		row = autoItem(item, replace);
		if (Object.keys(row).includes(column)) matchValue = row[column];
		else {
			// `item[columnToMatchOn]` of v1 reads a name of the object itself.
			checkKey(column);
			matchValue = null;
		}
	}
	if (dataMode === MANUAL) {
		row = manualItem(p);
		matchValue = p.valueToMatchOn === undefined ? '' : p.valueToMatchOn;
	}
	const updates: string[] = [];
	const values: unknown[] = [];
	for (const key of Object.keys(row)) {
		if (key === column) continue;
		updates.push(`${myfIdentifier(key)} = ?`);
		values.push(row[key]);
	}
	values.push(matchValue);
	return {
		query: `UPDATE ${table} SET ${updates.join(', ')} WHERE ${myfIdentifier(column)} = ?`,
		values,
		itemIndex,
	};
}

/** The query of one item of `upsert`. */
function upsertOf(
	p: MySqlParameters,
	item: Item | undefined,
	replace: boolean,
	itemIndex: number,
): Prepared {
	const table = tableOf(p);
	const column = matchColumn(p);
	const dataMode = dataModeOf(p);
	let row: Record<string, unknown> = {};
	if (dataMode === AUTO_MAP) row = autoItem(item, replace);
	if (dataMode === MANUAL) {
		row = manualItem(p);
		checkKey(column);
		row[column] = p.valueToMatchOn === undefined ? '' : p.valueToMatchOn;
	}
	const columns = Object.keys(row);
	const values: unknown[] = [];
	for (const key of columns) values.push(row[key]);
	const updates: string[] = [];
	for (const key of columns) {
		if (key === column) continue;
		updates.push(`${myfIdentifier(key)} = ?`);
		values.push(row[key]);
	}
	return {
		query: `INSERT INTO ${table}(${columnList(columns)}) VALUES(${places(columns.length)}) ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
		values,
		itemIndex,
	};
}

/** The query of one item of `executeQuery`. */
function executeQueryOf(p: MySqlParameters, version: number, itemIndex: number): Prepared {
	const prepared = myfPrepare(queryTextOf(p), version, replacementsOf(p));
	const values: unknown[] = [];
	for (const value of prepared.values) values.push(version >= 2.3 ? myfNumberOr(value) : value);
	return { query: prepared.query, values, itemIndex };
}

export default defineNode<MySqlParameters>({
	type: 'n8n-nodes-base.mySql',
	version: 2.5,
	// The converter keeps each operation and error setting of `MYSQL_RECORD_FIRST` in the host.
	supports: {
		resource: 'database',
		operation: { database: 'insert' },
		operations: {
			'database.executeQuery': [
				'query',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.detailedOutput',
				'options.largeNumbersOutput',
				'options.decimalNumbers',
				'options.replaceEmptyStrings',
				'options.connectionTimeoutMillis',
				'options.connectionLimit',
				'nodeVersion',
				'replacement',
				'queryParts',
				'batch',
				'errorMode',
				'node',
			],
			'database.select': [
				'table',
				'returnAll',
				'limit',
				'where',
				'where.values',
				'sort',
				'sort.values',
				'combineConditions',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.detailedOutput',
				'options.largeNumbersOutput',
				'options.decimalNumbers',
				'options.replaceEmptyStrings',
				'options.connectionTimeoutMillis',
				'options.connectionLimit',
				'options.outputColumns',
				'options.selectDistinct',
				'options.priority',
				'options.skipOnConflict',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.insert': [
				'table',
				'dataMode',
				'valuesToSend',
				'valuesToSend.values',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.detailedOutput',
				'options.largeNumbersOutput',
				'options.decimalNumbers',
				'options.replaceEmptyStrings',
				'options.connectionTimeoutMillis',
				'options.connectionLimit',
				'options.outputColumns',
				'options.selectDistinct',
				'options.priority',
				'options.skipOnConflict',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.update': [
				'table',
				'dataMode',
				'columnToMatchOn',
				'valueToMatchOn',
				'valuesToSend',
				'valuesToSend.values',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.detailedOutput',
				'options.largeNumbersOutput',
				'options.decimalNumbers',
				'options.replaceEmptyStrings',
				'options.connectionTimeoutMillis',
				'options.connectionLimit',
				'options.outputColumns',
				'options.selectDistinct',
				'options.priority',
				'options.skipOnConflict',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.upsert': [
				'table',
				'dataMode',
				'columnToMatchOn',
				'valueToMatchOn',
				'valuesToSend',
				'valuesToSend.values',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.detailedOutput',
				'options.largeNumbersOutput',
				'options.decimalNumbers',
				'options.replaceEmptyStrings',
				'options.connectionTimeoutMillis',
				'options.connectionLimit',
				'options.outputColumns',
				'options.selectDistinct',
				'options.priority',
				'options.skipOnConflict',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.deleteTable': [
				'table',
				'deleteCommand',
				'where',
				'where.values',
				'combineConditions',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.detailedOutput',
				'options.largeNumbersOutput',
				'options.decimalNumbers',
				'options.replaceEmptyStrings',
				'options.connectionTimeoutMillis',
				'options.connectionLimit',
				'options.outputColumns',
				'options.selectDistinct',
				'options.priority',
				'options.skipOnConflict',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const each = parameters.batch ?? [parameters];
		const first = each[0];
		if (first === undefined) throw hostError('The node has no input item');
		if (credential === undefined) throw hostError('The node has no credential');
		const operation = parameters.operation ?? first.operation;
		if (typeof operation !== 'string' || !OPERATIONS.includes(operation)) {
			throw hostError('The node does not have the operation');
		}
		const version = parameters.nodeVersion ?? first.nodeVersion ?? 0;
		if (version < 2) throw hostError('The node version is below 2');
		// A continue setting of the node: v1 gives error items, and this node gives
		// `[{ items, errors, nodeError? }]` to the converted workflow.
		const errorMode = parameters.errorMode;
		if (errorMode !== undefined && errorMode !== 'regular' && errorMode !== 'errorOutput') {
			throw hostError('The error setting is unknown');
		}
		const nodeCopy = parameters.node;
		if (errorMode !== undefined && !isRecord(nodeCopy)) {
			throw hostError('The node has no copy of itself for its error items');
		}
		const inputs: Item[] = items ?? [];
		// The v1 router reads the options of the first item for the connection and the mode.
		const options = first.options ?? {};
		const mode = options.queryBatching || 'single';
		if (mode !== 'single' && mode !== 'transaction' && mode !== 'independently') {
			throw hostError('The query batching mode is unknown');
		}
		if (
			options.detailedOutput !== undefined &&
			options.detailedOutput !== true &&
			options.detailedOutput !== false
		) {
			throw hostError('The detailed output option is not true or false');
		}
		const detailed = options.detailedOutput === true;
		// `select` and `deleteTable` of v1 do not write null into the empty strings of the items.
		const made = operation !== 'executeQuery';
		const replace =
			operation !== 'select' && operation !== 'deleteTable' && truthy(options.replaceEmptyStrings);

		const outs: Out[] = [];
		// The spread of the NodeOperationError of v1, as an error item holds it.
		const errorObject = (parsed: Parsed): Item => {
			const out: Item = { name: 'NodeOperationError', level: 'warning', shouldReport: true };
			if (parsed.description !== undefined) out.description = parsed.description;
			out.tags = { packageName: 'workflow' };
			out.timestamp = Date.now();
			out.context = { itemIndex: parsed.itemIndex };
			out.functionality = 'regular';
			out.node = nodeCopy;
			out.messages = parsed.messages;
			return out;
		};
		// The result under a continue setting. With the error output, n8n pairs the items that
		// the node did not pair (`assignPairedItems`), and moves each item that is an error to
		// the error output, on top of its input item (`handleNodeErrorOutput`).
		const finish = (): Item[] => {
			const main: Item[] = [];
			const errors: Item[] = [];
			const single = inputs.length === 1;
			const same = outs.length === inputs.length;
			const one = outs.length === 1 && inputs.length > 1;
			let pairing = true;
			for (let k = 0; k < outs.length; k++) {
				const json = outs[k].json;
				let paired = outs[k].paired;
				if (paired === undefined && pairing) {
					if (single || one) paired = 0;
					else if (same) paired = k;
					else pairing = false;
				}
				let onlyError = truthy(json.error);
				for (const key of Object.keys(json)) {
					if (key !== 'error' && key !== 'message' && key !== 'details') onlyError = false;
				}
				if (outs[k].failed === true) onlyError = true;
				if (errorMode !== 'errorOutput' || !onlyError) {
					main.push(json);
					continue;
				}
				const input = paired === undefined ? undefined : inputs[paired];
				if (input === undefined) {
					errors.push(json);
					continue;
				}
				const merged: Item = {};
				for (const key of Object.keys(input)) if (key !== '$binary') merged[key] = input[key];
				for (const key of Object.keys(json)) merged[key] = json[key];
				errors.push(merged);
			}
			// "Retry on fail" of n8n runs the node again while the first item that the node gives
			// has an error.
			const firstError = outs.length > 0 ? outs[0].json.error : undefined;
			if (firstError !== undefined && firstError !== null && firstError !== false) {
				return [{ items: main, errors, retry: true }];
			}
			return [{ items: main, errors }];
		};
		const done = (): Item[] => {
			if (errorMode !== undefined) return finish();
			const list: Item[] = [];
			for (const out of outs) list.push(out.json);
			return list;
		};
		// The node of v1 fails as a whole. Under a continue setting, n8n gives the input items
		// on, and keeps the error on the run.
		const whole = (message: string): Item[] => {
			if (errorMode === undefined) throw new Error(message);
			return [{ items: inputs, errors: [], nodeError: message, retry: true }];
		};

		// The query of each item. v1 makes all queries before it opens a connection.
		const queries: Prepared[] = [];
		if (operation === 'insert' && mode === 'single') {
			try {
				queries.push(insertAll(each, inputs, replace));
			} catch (error) {
				throw withHost(error);
			}
		} else {
			for (let i = 0; i < each.length; i++) {
				const p = each[i];
				try {
					if (operation === 'executeQuery') queries.push(executeQueryOf(p, version, i));
					else if (operation === 'select') queries.push(selectOf(p, i));
					else if (operation === 'deleteTable') queries.push(deleteOf(p, i));
					else if (operation === 'insert') queries.push(insertOf(p, first, inputs[i], replace, i));
					else if (operation === 'update') queries.push(updateOf(p, inputs[i], replace, i));
					else queries.push(upsertOf(p, inputs[i], replace, i));
				} catch (error) {
					const message = messageOf(error);
					if (message.includes(HOST_MARKER)) throw withHost(error);
					const parsed = described(message, undefined, i);
					if (errorMode === undefined) throw new Error(parsed.message);
					// `prepareErrorItem` of v1 with the input item.
					outs.push({
						json: { message: parsed.message, item: inputJson(inputs[i], replace), itemIndex: i },
						paired: i,
						failed: true,
					});
				}
			}
		}
		if (queries.length === 0) return done();

		// The formatted query of each item, as `connection.format` of v1 gives it.
		const formatted: string[] = [];
		for (const query of queries) {
			try {
				formatted.push(myfFormat(query.query, query.values));
			} catch (error) {
				throw withHost(error);
			}
		}
		const pairs: number[] = [];
		for (let q = 0; q < queries.length; q++) pairs.push(queries[q].itemIndex ?? q);

		// The one call of the node. Undefined: v1 found no connection, and under a continue
		// setting it gives one error item.
		const send = async (
			list: SqlStatement[],
			batching: 'single' | 'transaction' | 'independently',
		): Promise<SqlResult | undefined> => {
			let result: SqlResult;
			try {
				result = await ctx.sql({
					credential,
					dialect: 'mysql',
					mode: batching,
					statements: list,
					largeNumbers: options.largeNumbersOutput === 'text' ? 'text' : 'numbers',
					decimals: options.decimalNumbers === true ? 'numbers' : 'text',
					dates: version >= 2.1 ? 'text' : 'legacy',
				});
			} catch (error) {
				// This is the first call of the node: no statement is committed.
				const message = messageOf(error);
				if (message.includes('(limit: sql-')) throw new Error(`${message} ${RUNS_IN_HOST}`);
				throw error;
			}
			if (result.connect === undefined) return result;
			const parsed = parseFailure(result.connect, 0, [], undefined);
			if (errorMode === undefined) throw new Error(parsed.message);
			outs.push({ json: { message: parsed.message, error: errorObject(parsed) } });
			return undefined;
		};

		if (mode === 'single') {
			const text = myfJoin(formatted);
			const statements = myfStatements(text, version, true);
			if (statements.length === 1) checkOneResult(text, made);
			const result = await send([{ text, simple: true }], 'single');
			if (result === undefined) return done();
			const entry = result.results[0];
			if (entry === undefined || result.results.length !== 1) {
				throw new Error('MySQL: the runtime gave no result');
			}
			if ('error' in entry) {
				const parsed = parseFailure(entry.error, 0, formatted, text);
				if (errorMode === undefined) throw new Error(parsed.message);
				outs.push({ json: { message: parsed.message, error: errorObject(parsed) } });
				return done();
			}
			if (!('sets' in entry) || entry.sets.length === 0) {
				throw new Error('MySQL: the runtime gave no result');
			}
			const response = responseOf(entry.sets);
			let list: unknown[] = [response];
			if (Array.isArray(response) && statements.length !== 1) list = response;
			for (const out of outputOf(list, detailed, statements, version, pairs, false)) {
				outs.push(out);
			}
			return done();
		}

		// `independently` and `transaction`: v1 sends each statement of each item alone.
		const split: string[][] = [];
		const list: SqlStatement[] = [];
		const queryOf: number[] = [];
		for (let q = 0; q < formatted.length; q++) {
			const statements = myfStatements(formatted[q], version, false);
			split.push(statements);
			let count = 0;
			for (const statement of statements) if (statement !== '') count++;
			for (const statement of statements) {
				if (statement === '') continue;
				checkOneResult(statement, made && count === 1);
				// A failure drops the other statements: of all items, or of its item only.
				list.push({ text: statement, simple: true, group: errorMode === undefined ? 0 : q });
				queryOf.push(q);
			}
		}
		if (list.length === 0) throw hostError('The node has no statement to send');
		if (list.length > MAX_STATEMENTS)
			throw hostError('The node has too many statements for one call');
		const result = await send(list, mode);
		if (result === undefined) return done();
		const responses: unknown[][] = [];
		const failures: Array<SqlError | undefined> = [];
		const failedTexts: string[] = [];
		const ran: boolean[] = [];
		for (let q = 0; q < formatted.length; q++) {
			responses.push([]);
			failures.push(undefined);
			failedTexts.push('');
			ran.push(false);
		}
		let failed = false;
		let commitFailure: string | undefined;
		for (let k = 0; k < result.results.length; k++) {
			const entry = result.results[k];
			if (k >= list.length) {
				// A failure of the commit is not in the `try` of v1: the node fails with the error as it is.
				if (!('error' in entry) || k > list.length) {
					throw new Error('MySQL: the runtime gave no result');
				}
				commitFailure = entry.error.message;
				continue;
			}
			const q = queryOf[k];
			if ('error' in entry) {
				if (failures[q] === undefined) {
					failures[q] = entry.error;
					failedTexts[q] = list[k].text;
				}
				failed = true;
			} else if ('sets' in entry) {
				if (entry.sets.length !== 1) throw resultError();
				responses[q].push(responseOf(entry.sets));
				ran[q] = true;
			} else if ('rows' in entry) throw new Error('MySQL: the runtime gave no result');
		}
		const complete = result.results.length >= list.length;
		if (!complete && (mode === 'independently' || !failed)) {
			throw new Error('MySQL: the runtime gave no result');
		}
		for (let q = 0; q < queries.length; q++) {
			const failure = failures[q];
			if (failure === undefined) {
				for (const out of outputOf(responses[q], detailed, split[q], version, [pairs[q]], true)) {
					outs.push(out);
				}
				continue;
			}
			const parsed = parseFailure(failure, pairs[q], [formatted[q]], failedTexts[q]);
			if (parsed.crash === true) {
				// v1 fails here and does not run the items after this one.
				for (let later = q + 1; later < queries.length; later++) {
					if (ran[later]) {
						throw new Error(
							'MySQL: statements ran that v1 does not run after this failure. The node cannot make the result of v1',
						);
					}
				}
				return whole(parsed.message);
			}
			if (errorMode === undefined) throw new Error(parsed.message);
			// `prepareErrorItem` of v1 with the query of the item.
			outs.push({
				json: {
					message: parsed.message,
					item: { query: queries[q].query, values: queries[q].values, itemIndex: pairs[q] },
					itemIndex: pairs[q],
				},
				paired: pairs[q],
				failed: true,
			});
			// v1 rolls the transaction back and gives the items that it has.
			if (mode === 'transaction') return done();
		}
		if (commitFailure !== undefined) return whole(commitFailure);
		return done();
	},
});
