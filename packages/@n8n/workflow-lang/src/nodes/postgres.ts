/**
 * Compiled library node: a hand port of `n8n-nodes-base.postgres` versions
 * 2.1 to 2.8 (`insert`, `update` and `upsert` from version 2.2), operations `executeQuery`, `select`, `deleteTable`, `insert`,
 * `update` and `upsert`.
 *
 * With a continue setting of the node (`errorMode`), the node makes the error items of v1
 * itself, from the errors that the `sql` effect gives as data. No statement runs a second
 * time. The result is then one item `{ items, errors, nodeError?, retry? }` (spec 9.10).
 *
 * The v1 node writes values into the query text with pg-promise and sends
 * simple queries. This node never writes a value into the text: each value
 * is a bind value of the `sql` effect (spec 9.10). Identifiers are quoted
 * here, as pg-promise's `:name` filter quotes them.
 *
 * A bind value and a written literal are equal only in some places of a
 * query. When this node cannot prove that an input gives the result of v1, it
 * throws an error that ends with `(limit: sql-host)` before it sends a
 * statement, and n8n runs the v1 node in the fallback host. The cases:
 * a pg-promise filter in the query text (`$1:raw`, `$1^`, `$1~`, `$1#`, ...),
 * a `$n` inside a string, an identifier, a comment or a dollar quote, a `$n`
 * without a value, a `$n` after a word that can start a typed literal
 * (`interval $1`), more than one command in a query, an array as a value, and
 * a query parameter that is null in a version below 2.8 (v1 treats undefined
 * and null differently, and the converter gives both as null).
 *
 * `insert`, `update` and `upsert` read the columns of the table first, as v1
 * does, with `sql` calls that only read. They go to the fallback host for an
 * array that is not for an array column, for a mapped date and time that is
 * not ISO 8601 text with an offset (v1 reads other forms in the time zone of
 * the workflow), and for a value where v1 separates null from undefined.
 *
 * A query that is not an expression can hold `{{ }}` parts. v1 evaluates them
 * for each item and puts the text of each value in their place. The converter
 * gives the values in `queryParts`, and this node puts the text in the same
 * places. This is the text of the query, as with a query that is an
 * expression: it is not a query parameter.
 *
 * The converter runs the node once for all items, with the parameters of
 * each item in `batch`, and adds `nodeVersion`, `replacement` and `queryParts`.
 */
import {
	defineNode,
	type Item,
	type SqlError,
	type SqlFailure,
	type SqlResult,
	type SqlRows,
	type SqlSets,
	type SqlStatement,
	type SqlValue,
} from '@n8n/workflow-lang';

interface Replacement {
	/** The option is in the parameters of the node. */
	present?: boolean;
	/** The raw text of the option is not empty. */
	raw?: boolean;
	/** The value of each `{{ }}` of the raw text, in order. */
	parts?: unknown[];
	/** The raw text has no `{{ }}`: its comma-separated entries. */
	texts?: string[];
	/** Before version 2.5: the comma-separated entries of the raw text. */
	legacy?: LegacyEntry[];
}

/** An entry of the raw query parameters before version 2.5: its text, or the value of each `{{ }}` in it. */
interface LegacyEntry {
	text?: string;
	parts?: unknown[];
}

interface Clause {
	column?: unknown;
	condition?: unknown;
	value?: unknown;
}

interface SortRule {
	column?: unknown;
	direction?: unknown;
}

/** A field of the resource mapper, as the converter keeps it. */
interface MapperField {
	id?: unknown;
	type?: unknown;
	required?: unknown;
	/** The values of an `options` field. */
	options?: unknown;
}

interface Columns {
	mappingMode?: unknown;
	value?: unknown;
	matchingColumns?: unknown;
	/** The fields of the mapper that have a value. Absent: v1 does not cast the values. */
	schema?: unknown;
}

interface PostgresOptions {
	queryReplacement?: unknown;
	queryBatching?: string;
	largeNumbersOutput?: string;
	connectionTimeout?: number;
	delayClosingIdleConnection?: number;
	replaceEmptyStrings?: boolean;
	treatQueryParametersInSingleQuotesAsText?: boolean;
	outputColumns?: unknown;
	cascade?: unknown;
	skipOnConflict?: unknown;
}

interface PostgresParameters {
	resource?: string;
	operation?: string;
	query?: unknown;
	schema?: unknown;
	table?: unknown;
	returnAll?: unknown;
	limit?: unknown;
	where?: { values?: unknown };
	sort?: { values?: unknown };
	combineConditions?: unknown;
	deleteCommand?: unknown;
	restartSequences?: unknown;
	columns?: Columns;
	options?: PostgresOptions;
	/** The version of the node. Set by the converter. */
	nodeVersion?: number;
	/** The parts of `options.queryReplacement`, as v1 reads its raw text. Set by the converter. */
	replacement?: Replacement;
	/** The value of each `{{ }}` of a query that is not an expression, in order. Set by the converter. */
	queryParts?: unknown[];
	/** The parameters of each input item. Set by the converter. */
	batch?: PostgresParameters[];
	/**
	 * The node continues on an error: `regular` for the usual output, `errorOutput` for the
	 * error output. Set by the converter.
	 */
	errorMode?: string;
	/** The node as n8n holds it in a run, for the error items of v1. Set by the converter. */
	node?: unknown;
}

interface Query {
	query: string;
	values: unknown[];
	/** The query text of v1, with the places of pg-promise. An error of v1 shows it. */
	template: string;
	/** The number of values of v1 for `template`. */
	slots: number;
	/** The error of pg-promise for a name of this query. v1 raises it when it sends the query. */
	nameError?: string;
	/**
	 * This node made the text from names and bind values: it is one command, a select or
	 * not, and it needs no check of its text.
	 */
	made?: 'select' | 'write';
}

/** An output item of v1 with the index of the input item that it pairs with. */
interface Out {
	json: Item;
	paired?: number;
}

/** What `parsePostgresError` of v1 and the NodeOperationError of n8n make of an error. */
interface Parsed {
	message: string;
	description?: string;
	itemIndex?: number;
	messages: string[];
}

const HOST_MARKER = '(limit: sql-host)';
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
const CONNECT_ERRORS = [
	['ECONNREFUSED', 'Connection refused'],
	['ENOTFOUND', 'Host not found'],
	['ETIMEDOUT', 'Connection timed out'],
];
/** `RUNS_IN_HOST` of the converter: the workflow runs the host form of the node in the same run. */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';
const CONDITIONS = ['equal', '!=', 'LIKE', '>', '<', '>=', '<=', 'IS NULL', 'IS NOT NULL', '='];
const COMPARISONS = ['>', '<', '>=', '<='];
const FILTERS = [':raw', ':alias', ':name', ':json', ':csv', ':list', ':value'];
/** A bind value after one of these words has the meaning of a written literal. */
const VALUE_WORDS = [
	'SELECT',
	'WHERE',
	'AND',
	'OR',
	'NOT',
	'LIKE',
	'ILIKE',
	'IN',
	'VALUES',
	'LIMIT',
	'OFFSET',
	'BETWEEN',
	'THEN',
	'ELSE',
	'WHEN',
	'ANY',
	'ALL',
	'RETURNING',
	'CASE',
	'HAVING',
	'ON',
];
const VALUE_MARKS = '=<>(,+-*/%|!~[';
const TOP_LEVEL_COMMANDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE'];
const WRITES = ['insert', 'update', 'upsert'];
/** The runtime refuses a call with more statements (`--sql-max-statements`). */
const MAX_STATEMENTS = 256;
/** `getTableSchema` of the v1 node. */
const TABLE_SCHEMA =
	'SELECT column_name, data_type, is_nullable, udt_name, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2';
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
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The error that sends the node to the fallback host. Nothing was sent. */
function hostError(reason: string): Error {
	return new Error(
		`Postgres: ${reason}. The fallback host runs the node ${HOST_MARKER} ${RUNS_IN_HOST}`,
	);
}

function messageOf(error: unknown): string {
	return typeof error === 'object' && error !== null && 'message' in error
		? String(error.message)
		: String(error);
}

/** The next name place of the query text of v1. */
function nameSlot(query: Query): string {
	query.slots++;
	return `$${query.slots}:name`;
}

/** The next value place of the query text of v1. */
function valueSlot(query: Query): string {
	query.slots++;
	return `$${query.slots}`;
}

function isDigit(c: string): boolean {
	return c >= '0' && c <= '9';
}

function isLetter(c: string): boolean {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isWord(c: string): boolean {
	return isLetter(c) || isDigit(c);
}

function isSpace(c: string): boolean {
	return c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f' || c === '\v';
}

/** pg-promise `as.name` for one name. */
function quoteName(name: string): string {
	return `"${name.replaceAll('"', '""')}"`;
}

/** pg-promise's `:name` filter, with its errors. */
function sqlName(name: unknown): string {
	if (typeof name === 'string' && name !== '') {
		return name.trim() === '*' ? name : quoteName(name);
	}
	if (typeof name === 'object' && name !== null) {
		const keys: unknown[] = Array.isArray(name) ? name : Object.keys(name);
		if (keys.length === 0) throw new Error('Cannot retrieve sql names from an empty array/object.');
		const parts: string[] = [];
		for (const key of keys) {
			if (typeof key !== 'string' || key === '') {
				throw new Error(`Invalid sql name: ${JSON.stringify(key)}`);
			}
			parts.push(quoteName(key));
		}
		return parts.join(',');
	}
	throw new Error(`Invalid sql name: ${JSON.stringify(name)}`);
}

/** A value as the bind value that equals the literal that pg-promise writes. */
function bindValue(value: unknown): SqlValue {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string' || typeof value === 'boolean') return value;
	if (typeof value === 'number') {
		if (isNaN(value)) return 'NaN';
		if (!Number.isFinite(value)) return value > 0 ? '+Infinity' : '-Infinity';
		return value;
	}
	if (Array.isArray(value)) throw hostError('A query value is an array');
	return JSON.stringify(value);
}

/** The name in the text of `query`. An error of the name waits until v1 would send the query. */
function nameIn(query: Query, name: unknown): string {
	// v1 has `undefined` where the converter gives null, and the two give different messages.
	if (name === null || name === undefined) throw hostError('A name is null');
	try {
		return sqlName(name);
	} catch (error) {
		if (query.nameError === undefined) {
			query.nameError =
				typeof error === 'object' && error !== null && 'message' in error
					? String(error.message)
					: String(error);
		}
		return '';
	}
}

/** `evaluateExpression` of the v1 node for a value that is not null. */
function valueText(value: unknown): string {
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function isJson(text: string): boolean {
	try {
		JSON.parse(text.trim());
		return true;
	} catch (error) {
		return false;
	}
}

function stringToArray(text: string): string[] {
	const out: string[] = [];
	for (const entry of text.split(',')) if (entry !== '') out.push(entry.trim());
	return out;
}

/** True when `prefix` is at `at` in `text`. */
function hasAt(text: string, at: number, prefix: string): boolean {
	return text.slice(at, at + prefix.length) === prefix;
}

/** The end of a dollar-quote tag (`$$` or `$tag$`) that starts at `at`, or -1. */
function dollarTagEnd(text: string, at: number): number {
	let i = at + 1;
	if (text[i] === '$') return i + 1;
	if (i >= text.length || !isLetter(text[i])) return -1;
	while (i < text.length && isWord(text[i])) i++;
	return text[i] === '$' ? i + 1 : -1;
}

/** True when the quote at `at` starts an escape string (`E'...'`), as v1 reads it. */
function isEString(query: string, at: number): boolean {
	if (at === 0) return false;
	const prev = query[at - 1];
	if (prev !== 'E' && prev !== 'e') return false;
	if (at === 1) return true;
	return !isWord(query[at - 2]);
}

/** `stripStringsAndComments` of the v1 node. */
function stripStringsAndComments(query: string): string {
	const len = query.length;
	let out = '';
	let i = 0;
	while (i < len) {
		const c = query[i];
		const next = query[i + 1];
		if (c === '/' && next === '*') {
			const end = query.indexOf('*/', i + 2);
			i = end === -1 ? len : end + 2;
			out += ' ';
			continue;
		}
		if (c === '-' && next === '-') {
			const newline = query.indexOf('\n', i + 2);
			i = newline === -1 ? len : newline;
			out += ' ';
			continue;
		}
		if (c === "'") {
			const escapes = isEString(query, i);
			i++;
			while (i < len) {
				if (escapes && query[i] === '\\' && i + 1 < len) {
					i += 2;
					continue;
				}
				if (query[i] === "'") {
					if (query[i + 1] === "'") {
						i += 2;
						continue;
					}
					i++;
					break;
				}
				i++;
			}
			out += "''";
			continue;
		}
		if (c === '"') {
			i++;
			while (i < len && query[i] !== '"') {
				if (query[i] === '\\' && i + 1 < len) {
					i += 2;
					continue;
				}
				i++;
			}
			if (i < len) i++;
			out += '""';
			continue;
		}
		if (c === '$') {
			const tagEnd = dollarTagEnd(query, i);
			if (tagEnd !== -1) {
				const tag = query.slice(i, tagEnd);
				const end = query.indexOf(tag, tagEnd);
				i = end === -1 ? len : end + tag.length;
				out += ' ';
				continue;
			}
		}
		out += c;
		i++;
	}
	return out;
}

/** `findTopLevelCommand` of the v1 node. */
function topLevelCommand(statement: string): string | null {
	const upper = statement.toUpperCase();
	let depth = 0;
	let i = 0;
	while (i < statement.length) {
		const c = statement[i];
		if (c === '(') {
			depth++;
			i++;
			continue;
		}
		if (c === ')') {
			if (depth > 0) depth--;
			i++;
			continue;
		}
		if (depth === 0 && isLetter(c)) {
			let j = i;
			while (j < statement.length && isWord(statement[j])) j++;
			const word = upper.slice(i, j);
			if (TOP_LEVEL_COMMANDS.includes(word)) return word;
			i = j;
			continue;
		}
		i++;
	}
	return null;
}

/** `isSelectQuery` of the v1 node. */
function isSelectQuery(query: string): boolean {
	const statements: string[] = [];
	for (const part of stripStringsAndComments(query).split(';')) {
		const text = part.trim();
		if (text.length > 0) statements.push(text);
	}
	for (const statement of statements) {
		if (topLevelCommand(statement) !== 'SELECT') return false;
	}
	return true;
}

/** pg-promise's `clean` of `helpers.concat`: no spaces and semicolons at the ends. */
function clean(query: string): string {
	let start = 0;
	let end = query.length;
	while (start < end && (query[start] === ';' || query[start].trim() === '')) start++;
	while (end > start && (query[end - 1] === ';' || query[end - 1].trim() === '')) end--;
	return query.slice(start, end);
}

/** True when a bind value at `at` (a `$`) has the meaning of the literal that v1 writes there. */
function valuePlace(text: string, at: number): boolean {
	let i = at - 1;
	if (i >= 0 && (isWord(text[i]) || text[i] === '$')) return false;
	while (i >= 0 && isSpace(text[i])) i--;
	if (i < 0) return false;
	if (VALUE_MARKS.includes(text[i])) return true;
	if (!isWord(text[i])) return false;
	const end = i + 1;
	while (i >= 0 && isWord(text[i])) i--;
	return VALUE_WORDS.includes(text.slice(i + 1, end).toUpperCase());
}

/** Checks one `$n` in the code of a query. It gives the position after the number. */
function checkVariable(text: string, at: number, count: number): number {
	let end = at + 1;
	while (end < text.length && isDigit(text[end])) end++;
	const digits = text.slice(at + 1, end);
	if (digits[0] === '0' || digits.length > 9)
		throw hostError('A query has a variable that v1 does not replace');
	if (Number(digits) > count) throw hostError('A query has a variable without a value');
	const after = text[end];
	if (after === '^' || after === '~' || after === '#') {
		throw hostError('A query has a pg-promise filter');
	}
	for (const filter of FILTERS) {
		if (hasAt(text, end, filter)) throw hostError('A query has a pg-promise filter');
	}
	if (!valuePlace(text, at))
		throw hostError('A query has a variable where a bind value can differ from a literal');
	return end;
}

/** True when `text` has a `$` and a digit from `from` to `to`. */
function hasVariable(text: string, from: number, to: number): boolean {
	for (let i = from; i + 1 < to; i++) {
		if (text[i] === '$' && isDigit(text[i + 1])) return true;
	}
	return false;
}

/**
 * Checks that the server reads the text with bind values as it reads the text that
 * pg-promise writes: one command, each `$n` in the code of the query with a value, no
 * `$n` in a place that the server does not read as a variable. `joined`: v1 sends the
 * queries of all items as one text.
 */
function checkQuery(text: string, count: number, joined: boolean): void {
	if (text === '') throw hostError('A query is empty');
	const len = text.length;
	let i = 0;
	let ended = false;
	while (i < len) {
		const c = text[i];
		const next = text[i + 1];
		if (isSpace(c)) {
			i++;
			continue;
		}
		let end = -1;
		if (c === '-' && next === '-') {
			const newline = text.indexOf('\n', i + 2);
			if (newline === -1 && joined) throw hostError('A query ends in a comment');
			end = newline === -1 ? len : newline + 1;
		} else if (c === '/' && next === '*') {
			const close = text.indexOf('*/', i + 2);
			if (close === -1) throw hostError('A query has a comment without an end');
			if (text.slice(i + 2, close).includes('/*')) throw hostError('A query has a nested comment');
			end = close + 2;
		}
		if (end !== -1) {
			if (hasVariable(text, i, end)) throw hostError('A query has a variable in a comment');
			i = end;
			continue;
		}
		if (ended) throw hostError('A query has more than one command');
		if (c === ';') {
			ended = true;
			i++;
			continue;
		}
		if (c === "'" || c === '"') {
			// In an escape string (`E'...'`), a backslash and the character after it are one character.
			const escapes = c === "'" && isEString(text, i);
			// The server reads a letter that is not ASCII before the `E` as a part of a name.
			if (escapes && i >= 2 && text.charCodeAt(i - 2) > 127) {
				throw hostError('A query has an escape string after a letter that is not ASCII');
			}
			let j = i + 1;
			let closed = false;
			while (j < len && !closed) {
				if (escapes && text[j] === '\\' && j + 1 < len) j += 2;
				else if (text[j] === c && text[j + 1] === c) j += 2;
				else if (text[j] === c) closed = true;
				else j++;
			}
			if (!closed) throw hostError('A query has a string without an end');
			if (c === '"' && text.slice(i, j).includes('\\'))
				throw hostError('A query has a backslash in an identifier');
			if (hasVariable(text, i, j + 1)) throw hostError('A query has a variable in a string');
			i = j + 1;
			continue;
		}
		if (c === '$' && next !== undefined && isDigit(next)) {
			i = checkVariable(text, i, count);
			continue;
		}
		if (c === '$') {
			const tagEnd = dollarTagEnd(text, i);
			if (tagEnd === -1) throw hostError('A query has a dollar sign that is not a variable');
			const tag = text.slice(i, tagEnd);
			const close = text.indexOf(tag, tagEnd);
			if (close === -1) throw hostError('A query has a dollar quote without an end');
			if (hasVariable(text, i, close)) throw hostError('A query has a variable in a dollar quote');
			i = close + tag.length;
			continue;
		}
		if (isWord(c)) {
			// A `$` in a word is part of an identifier for the server, and a variable for pg-promise.
			let j = i;
			while (j < len && (isWord(text[j]) || text[j] === '$')) j++;
			if (text.slice(i, j).includes('$'))
				throw hostError('A query has a dollar sign in an identifier');
			i = j;
			continue;
		}
		i++;
	}
}

/** The `'$n'` literals of a query, as the pattern `'\$[0-9]+'` finds them. */
function quotedVariables(query: string): string[] {
	const out: string[] = [];
	let i = 0;
	while (i < query.length) {
		if (query[i] === "'" && query[i + 1] === '$') {
			let j = i + 2;
			while (j < query.length && isDigit(query[j])) j++;
			if (j > i + 2 && query[j] === "'") {
				out.push(query.slice(i, j + 1));
				i = j + 1;
				continue;
			}
		}
		i++;
	}
	return out;
}

/** The `{{ }}` parts of a text, as `getResolvables` of the v1 node finds them. */
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

/** The replacement text of `String.prototype.replace` for a text pattern: its `$` patterns. */
function substitution(value: string, matched: string, before: string, after: string): string {
	if (!value.includes('$')) return value;
	let out = '';
	let i = 0;
	while (i < value.length) {
		const c = value[i];
		const next = value[i + 1];
		if (c === '$' && next === '$') out += '$';
		else if (c === '$' && next === '&') out += matched;
		else if (c === '$' && next === '`') out += before;
		else if (c === '$' && next === "'") out += after;
		else {
			out += c;
			i++;
			continue;
		}
		i += 2;
	}
	return out;
}

/**
 * A query that is not an expression: the text of each `{{ }}` value in the place of its
 * part, as the v1 node puts it with `query.replace(part, value)`.
 */
function withParts(query: string, parts: unknown[]): string {
	const found = resolvables(query);
	if (found.length !== parts.length) throw hostError('The parts of the query text do not fit');
	let text = query;
	for (let i = 0; i < found.length; i++) {
		const value = partText(parts[i]);
		const at = text.indexOf(found[i]);
		if (at === -1) continue;
		const before = text.slice(0, at);
		const after = text.slice(at + found[i].length);
		text = before + substitution(value, found[i], before, after) + after;
	}
	return text;
}

/** The query and the values of one item of `executeQuery`, as the v1 node makes them. */
function executeQueryOf(p: PostgresParameters, version: number): Query {
	if (typeof p.query !== 'string') throw hostError('The query is not text');
	let query = p.query;
	if (p.queryParts !== undefined) {
		query = withParts(query, p.queryParts);
	} else {
		const open = query.indexOf('{{');
		if (open !== -1 && query.indexOf('}}', open + 2) !== -1) {
			throw hostError('The query text has an expression after its expressions ran');
		}
	}
	const options = p.options ?? {};
	const replacement = p.replacement ?? {};
	let values: unknown[] = [];
	let given: unknown = replacement.present === true ? (options.queryReplacement ?? null) : '';
	if (typeof given === 'number') given = String(given);
	if (typeof given === 'string') {
		if (replacement.raw === true && version < 2.5) {
			// Before version 2.5: an entry of the raw text is text, or the values of its `{{ }}`.
			for (const entry of replacement.legacy ?? []) {
				if (entry.parts === undefined) values.push(entry.text ?? '');
				else for (const part of entry.parts) values.push(part);
			}
		} else if (replacement.raw === true && replacement.parts !== undefined) {
			for (const part of replacement.parts) {
				if (Array.isArray(part)) {
					for (const member of part) {
						if (member === null && version < 2.8) throw hostError('A query parameter is null');
						values.push(
							typeof member === 'object' && member !== null ? JSON.stringify(member) : member,
						);
					}
					continue;
				}
				if (version >= 2.8) {
					values.push(part === null || part === undefined ? null : valueText(part));
					continue;
				}
				if (part === null || part === undefined) throw hostError('A query parameter is null');
				const text = valueText(part);
				if (isJson(text)) values.push(text);
				else for (const entry of stringToArray(text)) values.push(entry);
			}
		} else if (replacement.raw === true) {
			for (const entry of replacement.texts ?? []) values.push(entry);
		}
	} else if (Array.isArray(given)) {
		values = given;
	} else if (version >= 2.8 && given === null) {
		values = [null];
	} else {
		throw new Error(
			'Query Parameters must be a string of comma-separated values or an array of values',
		);
	}
	if (given === null || given === '' || options.treatQueryParametersInSingleQuotesAsText) {
		let nextIndex = values.length + 1;
		for (const literal of quotedVariables(query)) {
			query = query.replace(literal, `$${nextIndex}`);
			values.push(literal.replaceAll("'", ''));
			nextIndex++;
		}
	}
	return { query, values, template: query, slots: values.length };
}

/** `getWhereClauses` of the v1 node. */
function whereClauses(p: PostgresParameters): Clause[] {
	const list = p.where?.values;
	if (!Array.isArray(list)) return [];
	const clauses: Clause[] = [];
	for (const clause of list) {
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

/** `addWhereClauses` of the v1 node: the names are in the text, the values are bind values. */
function addWhere(query: Query, clauses: Clause[], combine: unknown): void {
	if (clauses.length === 0) return;
	const combineWith = combine === 'OR' ? 'OR' : 'AND';
	let text = ' WHERE';
	let template = ' WHERE';
	for (let index = 0; index < clauses.length; index++) {
		const clause = clauses[index];
		let condition = String(clause.condition);
		let value = clause.value;
		if (condition === 'equal') condition = '=';
		if (COMPARISONS.includes(condition)) {
			const numeric = Number(value);
			if (String(value).trim() !== '' && !isNaN(numeric)) value = numeric;
		}
		const nameOfV1 = nameSlot(query);
		let place = '';
		let placeOfV1 = '';
		if (condition !== 'IS NULL' && condition !== 'IS NOT NULL') {
			query.values.push(value);
			place = ` $${query.values.length}`;
			placeOfV1 = ` ${valueSlot(query)}`;
		}
		const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;
		text += ` ${nameIn(query, clause.column)} ${condition}${place}${operator}`;
		template += ` ${nameOfV1} ${condition}${placeOfV1}${operator}`;
	}
	query.query += text;
	query.template += template;
}

/** The query of one item of `select`. */
function selectOf(p: PostgresParameters): Query {
	if (p.options?.outputColumns === null) throw hostError('The output columns are null');
	const columns = p.options?.outputColumns ?? ['*'];
	let all = false;
	if (Array.isArray(columns)) all = columns.includes('*');
	else if (typeof columns === 'string') all = columns.includes('*');
	else throw hostError('The output columns are not a list');
	const query: Query = { query: '', values: [], made: 'select', template: '', slots: 2 };
	const from = `${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	query.query = all ? `SELECT * FROM ${from}` : `SELECT ${nameIn(query, columns)} FROM ${from}`;
	query.template = all
		? 'SELECT * FROM $1:name.$2:name'
		: `SELECT ${nameSlot(query)} FROM $1:name.$2:name`;
	addWhere(query, whereClauses(p), p.combineConditions ?? 'AND');
	const rules = p.sort?.values;
	if (Array.isArray(rules) && rules.length > 0) {
		const parts: string[] = [];
		const partsOfV1: string[] = [];
		for (const rule of rules) {
			const sort: SortRule = isRecord(rule) ? rule : {};
			const direction = sort.direction === 'DESC' ? 'DESC' : 'ASC';
			parts.push(` ${nameIn(query, sort.column)} ${direction}`);
			partsOfV1.push(` ${nameSlot(query)} ${direction}`);
		}
		query.query += ` ORDER BY${parts.join(',')}`;
		query.template += ` ORDER BY${partsOfV1.join(',')}`;
	} else if (rules !== undefined && rules !== null && !Array.isArray(rules)) {
		throw hostError('The sort rules are not a list');
	}
	if (!(p.returnAll ?? false)) {
		if (p.limit === null) throw hostError('The limit is null');
		const limit = Number(p.limit ?? 50);
		if (isNaN(limit)) throw new Error('Failed to parse value to number');
		query.values.push(limit);
		query.query += ` LIMIT $${query.values.length}`;
		query.template += ` LIMIT ${valueSlot(query)}`;
	}
	return query;
}

/** The query of one item of `deleteTable`. */
function deleteOf(p: PostgresParameters): Query {
	const query: Query = { query: '', values: [], made: 'write', template: '', slots: 2 };
	const from = `${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	const cascade = p.options?.cascade ? ' CASCADE' : '';
	if (p.deleteCommand === 'drop') {
		query.query = `DROP TABLE IF EXISTS ${from}${cascade}`;
		query.template = `DROP TABLE IF EXISTS $1:name.$2:name${cascade}`;
	}
	if (p.deleteCommand === 'truncate') {
		const identity = (p.restartSequences ?? false) ? ' RESTART IDENTITY' : '';
		query.query = `TRUNCATE TABLE ${from}${identity}${cascade}`;
		query.template = `TRUNCATE TABLE $1:name.$2:name${identity}${cascade}`;
	}
	if (p.deleteCommand === 'delete') {
		query.query = `DELETE FROM ${from}`;
		query.template = 'DELETE FROM $1:name.$2:name';
		addWhere(query, whereClauses(p), p.combineConditions ?? 'AND');
	}
	if (query.query === '') {
		throw new Error('Invalid delete command, only drop, delete and truncate are supported ');
	}
	return query;
}

function digitsAt(text: string, at: number, count: number): boolean {
	if (at + count > text.length) return false;
	for (let i = at; i < at + count; i++) if (!isDigit(text[i])) return false;
	return true;
}

/** The end of `[+-]` and `count` digits at `at`, or -1. */
function signedDigits(text: string, at: number, count: number): number {
	if (text[at] !== '+' && text[at] !== '-') return -1;
	return digitsAt(text, at + 1, count) ? at + 1 + count : -1;
}

/** True when the rest of a time from `at` is the last group of v1's pattern, or nothing. */
function timeEnd(text: string, at: number): boolean {
	if (at === text.length) return true;
	for (const count of [2, 1]) {
		const end = signedDigits(text, at, count);
		if (end === -1) continue;
		if (end === text.length) return true;
		if (text[end] === ':' && digitsAt(text, end + 1, 2) && end + 3 === text.length) return true;
	}
	return false;
}

/** The pattern of `tryToParseTime`: `hh:mm`, seconds, an offset of four digits, an offset. */
function isTime(text: string): boolean {
	if (!digitsAt(text, 0, 2) || text[2] !== ':' || !digitsAt(text, 3, 2)) return false;
	const starts = [5];
	if (text[5] === ':' && digitsAt(text, 6, 2)) starts.push(8);
	for (const start of starts) {
		if (timeEnd(text, start)) return true;
		const four = signedDigits(text, start, 4);
		if (four !== -1 && timeEnd(text, four)) return true;
	}
	return false;
}

/**
 * A mapped date and time as pg-promise writes the Luxon value of v1: the JSON of its ISO
 * text. Only for ISO 8601 text with seconds and an offset. v1 reads other forms too, in
 * the time zone of the workflow, so they go to the host.
 */
function dateTimeJson(value: unknown): string {
	const fail = hostError('A mapped date and time is not ISO 8601 text with an offset');
	if (typeof value !== 'string') throw fail;
	const text = value.trim();
	const shaped =
		digitsAt(text, 0, 4) &&
		text[4] === '-' &&
		digitsAt(text, 5, 2) &&
		text[7] === '-' &&
		digitsAt(text, 8, 2) &&
		text[10] === 'T' &&
		digitsAt(text, 11, 2) &&
		text[13] === ':' &&
		digitsAt(text, 14, 2) &&
		text[16] === ':' &&
		digitsAt(text, 17, 2);
	if (!shaped) throw fail;
	const year = Number(text.slice(0, 4));
	const month = Number(text.slice(5, 7));
	const day = Number(text.slice(8, 10));
	const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const days = month === 2 && leap ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);
	if (year < 1000 || day < 1 || day > days) throw fail;
	if (Number(text.slice(11, 13)) > 23 || Number(text.slice(14, 16)) > 59) throw fail;
	if (Number(text.slice(17, 19)) > 59) throw fail;
	let at = 19;
	let millis = 0;
	if (text[at] === '.') {
		let end = at + 1;
		while (end < text.length && isDigit(text[end])) end++;
		if (end === at + 1 || end > at + 10) throw fail;
		// As Luxon's `parseMillis`.
		millis = Math.floor(Number(`0.${text.slice(at + 1, end)}`) * 1000);
		at = end;
	}
	let offset = 'Z';
	if (text[at] === 'Z') {
		if (at + 1 !== text.length) throw fail;
	} else if (signedDigits(text, at, 2) === at + 3 && text[at + 3] === ':') {
		if (!digitsAt(text, at + 4, 2) || at + 6 !== text.length) throw fail;
		const hours = text.slice(at + 1, at + 3);
		const minutes = text.slice(at + 4, at + 6);
		if (Number(hours) > 23 || Number(minutes) > 59) throw fail;
		if (hours !== '00' || minutes !== '00') offset = `${text[at]}${hours}:${minutes}`;
	} else {
		throw fail;
	}
	const fraction = millis < 10 ? `00${millis}` : millis < 100 ? `0${millis}` : String(millis);
	return JSON.stringify(`${text.slice(0, 19)}.${fraction}${offset}`);
}

interface Cast {
	ok: boolean;
	value?: unknown;
}

function parsed(text: string): Cast {
	try {
		const value: unknown = JSON.parse(text);
		return { ok: true, value };
	} catch (error) {
		return { ok: false };
	}
}

/**
 * A value as n8n's resource mapper casts it for the Postgres node (`validateFieldType`,
 * not strict, strings as they are). Not `ok`: v1 fails the field.
 */
function castField(value: unknown, field: MapperField): Cast {
	const type = typeof field.type === 'string' ? field.type.toLowerCase() : '';
	if (type === 'number') {
		if (!isPrimitive(value)) throw hostError('A mapped number is a list or an object');
		const n = Number(value);
		return isNaN(n) ? { ok: false } : { ok: true, value: n };
	}
	if (type === 'boolean') {
		if (typeof value === 'boolean') return { ok: true, value };
		if (!isPrimitive(value)) throw hostError('A mapped boolean is a list or an object');
		if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
			return { ok: true, value: value.toLowerCase() === 'true' };
		}
		if (!(typeof value === 'string' && value.trim() === '')) {
			const n = Number(value);
			if (n === 0) return { ok: true, value: false };
			if (n === 1) return { ok: true, value: true };
		}
		return { ok: false };
	}
	if (type === 'datetime') return { ok: true, value: dateTimeJson(value) };
	if (type === 'time') {
		if (!isPrimitive(value)) throw hostError('A mapped time is a list or an object');
		return isTime(String(value)) ? { ok: true, value: String(value) } : { ok: false };
	}
	if (type === 'object') {
		if (isRecord(value)) return { ok: true, value };
		if (Array.isArray(value)) throw hostError('A mapped object is a list');
		if (typeof value !== 'string') return { ok: false };
		const read = parsed(value);
		// v1 reads text that is not JSON as a JavaScript object.
		if (!read.ok) throw hostError('A mapped object is text that is not JSON');
		if (typeof read.value !== 'object' || Array.isArray(read.value)) return { ok: false };
		return { ok: true, value: read.value };
	}
	if (type === 'array') {
		if (Array.isArray(value)) return { ok: true, value };
		if (typeof value !== 'string') return { ok: false };
		let read = parsed(value);
		if (!read.ok) read = parsed(value.replaceAll("'", '"'));
		return read.ok && Array.isArray(read.value) ? { ok: true, value: read.value } : { ok: false };
	}
	if (type === 'options') {
		const options: unknown[] = Array.isArray(field.options) ? field.options : [];
		return options.includes(value) ? { ok: true, value } : { ok: false };
	}
	if (type !== '' && type !== 'string' && type !== 'json') {
		throw hostError('A mapped field has a type that the compiled library does not have');
	}
	return { ok: true, value };
}

/**
 * `columns.value` as `getNodeParameter` of v1 gives it (`validateResourceMapperValue`):
 * each field with a type is cast, and null becomes undefined. `add`: the mode of `insert`,
 * where a required field must have a value. The error is v1's message.
 */
function mappedValues(
	value: Record<string, unknown>,
	schema: unknown,
	index: number,
	add: boolean,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(value)) out[key] = value[key];
	if (!Array.isArray(schema)) return out;
	for (const key of Object.keys(out)) {
		let field: MapperField | undefined;
		for (const entry of schema) {
			if (field === undefined && isRecord(entry) && entry.id === key) field = entry;
		}
		const given = out[key];
		const empty = given === null || given === undefined;
		if (add && field?.required === true && field.type !== 'boolean' && empty) {
			throw new Error(`Invalid input for '${key}' [item ${index}]`);
		}
		if (field === undefined || typeof field.type !== 'string' || field.type === '') continue;
		if (empty) {
			out[key] = undefined;
			continue;
		}
		const cast = castField(given, field);
		if (!cast.ok) throw new Error(`Invalid input for '${key}' [item ${index}]`);
		out[key] = cast.value;
	}
	return out;
}

/** The JSON of an input item for a write, with `replaceEmptyStringsByNulls` of the v1 node. */
function inputValues(item: Item | undefined, replace: boolean): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (item === undefined) return out;
	for (const key of Object.keys(item)) {
		if (key === '$binary') continue;
		const value: unknown = item[key];
		out[key] = replace && value === '' ? null : value;
	}
	return out;
}

/** `convertArraysToPostgresFormat` of the v1 node: a list for an array column as `{...}` text. */
function withArrayText(data: Record<string, unknown>, columns: Item[]): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(data)) out[key] = data[key];
	for (const column of columns) {
		if (String(column.data_type).toUpperCase() !== 'ARRAY') continue;
		const name = String(column.column_name);
		let value = out[name];
		if (typeof value === 'string') {
			const read = parsed(value);
			// v1 fails here with the message of its JSON reader.
			if (!read.ok) throw hostError('The text for an array column is not JSON');
			value = read.value;
		}
		if (Array.isArray(value)) {
			const entries: string[] = [];
			for (const entry of value) {
				if (typeof entry === 'number') {
					entries.push(String(entry));
				} else {
					const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
					entries.push(`"${text.replaceAll('"', '\\"')}"`);
				}
			}
			out[name] = `{${entries.join(',')}}`;
		} else if (column.is_nullable === 'NO') {
			throw new Error(`Column '${name}' has to be an array`);
		}
	}
	return out;
}

/**
 * `checkItemAgainstSchema` of the v1 node. v1 fails a null of a column that is not
 * nullable, and sends an undefined to the database. `passed`: the values that are
 * undefined in v1. `unsure`: a null of this item can be undefined in v1.
 */
function checkItem(
	item: Record<string, unknown>,
	columns: Item[],
	unsure: boolean,
	passed: string[],
): void {
	if (columns.length === 0) return;
	for (const key of Object.keys(item)) {
		if (OBJECT_NAMES.includes(key)) throw hostError('A column has the name of an object member');
		const column = columns.find((c) => c.column_name === key);
		if (column === undefined) throw new Error(`Column '${key}' does not exist in selected table`);
		if (item[key] === null && column.is_nullable !== 'YES' && !passed.includes(key)) {
			if (unsure) throw hostError('A value is null or undefined');
			throw new Error(`Column '${key}' is not nullable`);
		}
	}
}

/** Adds a value to `query` and gives its place in the text. */
function place(query: Query, value: unknown): string {
	query.values.push(value);
	return `$${query.values.length}`;
}

/** `addReturning` of the v1 node. */
function addReturning(query: Query, options: PostgresOptions | undefined): void {
	if (options?.outputColumns === null) throw hostError('The output columns are null');
	const columns = options?.outputColumns ?? ['*'];
	if (!Array.isArray(columns) && typeof columns !== 'string') {
		throw hostError('The output columns are not a list');
	}
	if (columns.includes('*')) {
		query.query += ' RETURNING *';
		query.template += ' RETURNING *';
	} else {
		query.query += ` RETURNING ${nameIn(query, columns)}`;
		query.template += ` RETURNING ${nameSlot(query)}`;
	}
}

/** The names of the columns to match on, for `update` and `upsert`. */
function matchingColumns(columns: Columns): string[] {
	const out: string[] = [];
	if (!Array.isArray(columns.matchingColumns)) {
		throw hostError('The columns to match on are not a list');
	}
	for (const name of columns.matchingColumns) {
		if (typeof name !== 'string') throw hostError('A column to match on is not text');
		out.push(name);
	}
	return out;
}

/** The names of the columns of a write in the text of `query`: pg-promise's `:name` of an object. */
function columnNames(query: Query, names: string[]): string {
	const parts: string[] = [];
	for (const name of names) parts.push(nameIn(query, [name]));
	return parts.join(',');
}

/** The query of one item of `insert`, from the checked values. */
function insertOf(p: PostgresParameters, item: Record<string, unknown>, version: number): Query {
	const query: Query = { query: '', values: [], made: 'write', template: '', slots: 3 };
	const into = `INSERT INTO ${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	const names = Object.keys(item);
	if (version >= 2.6 && names.length === 0) {
		query.query = `${into} DEFAULT VALUES`;
		query.template = 'INSERT INTO $1:name.$2:name DEFAULT VALUES';
	} else {
		if (names.length === 0 && query.nameError === undefined) {
			query.nameError = 'Cannot retrieve sql names from an empty array/object.';
		}
		const columns = columnNames(query, names);
		const places: string[] = [];
		for (const name of names) places.push(place(query, item[name]));
		const conflict = p.options?.skipOnConflict ? ' ON CONFLICT DO NOTHING' : '';
		query.query = `${into}(${columns}) VALUES(${places.join(',')})${conflict}`;
		query.template = `INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv)${conflict}`;
	}
	addReturning(query, p.options);
	return query;
}

/** The query of one item of `update`, from the checked values. */
function updateOf(p: PostgresParameters, item: Record<string, unknown>, matching: string[]): Query {
	const query: Query = { query: '', values: [], made: 'write', template: '', slots: 2 };
	const table = `${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	// v1 numbers the places of the conditions before the places of the updates.
	const conditionsOfV1: string[] = [];
	for (let k = 0; k < matching.length; k++) {
		conditionsOfV1.push(`${nameSlot(query)} = ${valueSlot(query)}`);
	}
	const updates: string[] = [];
	const updatesOfV1: string[] = [];
	for (const name of Object.keys(item)) {
		if (matching.includes(name)) continue;
		updates.push(`${nameIn(query, name)} = ${place(query, item[name])}`);
		updatesOfV1.push(`${nameSlot(query)} = ${valueSlot(query)}`);
	}
	if (updates.length === 0) {
		throw new Error(
			"Add values to update to the input item or set the 'Data Mode' to 'Define Below' to define the values to update.",
		);
	}
	const conditions: string[] = [];
	for (const name of matching) {
		conditions.push(`${nameIn(query, name)} = ${place(query, item[name])}`);
	}
	query.query = `UPDATE ${table} SET ${updates.join(', ')} WHERE ${conditions.join(' AND ')}`;
	query.template = `UPDATE $1:name.$2:name SET ${updatesOfV1.join(', ')} WHERE ${conditionsOfV1.join(' AND ')}`;
	addReturning(query, p.options);
	return query;
}

/** The query of one item of `upsert`, from the checked values. */
function upsertOf(p: PostgresParameters, item: Record<string, unknown>, matching: string[]): Query {
	const query: Query = { query: '', values: [], made: 'write', template: '', slots: 2 };
	const into = `INSERT INTO ${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	const names = Object.keys(item);
	const columns = columnNames(query, names);
	const places: string[] = [];
	for (const name of names) places.push(place(query, item[name]));
	const conflict: string[] = [];
	const conflictOfV1: string[] = [];
	for (const name of matching) {
		conflict.push(nameIn(query, name));
		conflictOfV1.push(nameSlot(query));
	}
	query.slots++;
	const itemSlot = query.slots;
	const updates: string[] = [];
	const updatesOfV1: string[] = [];
	for (const name of names) {
		if (matching.includes(name)) continue;
		updates.push(`${nameIn(query, name)} = ${place(query, item[name])}`);
		updatesOfV1.push(`${nameSlot(query)} = ${valueSlot(query)}`);
	}
	const action = updates.length > 0 ? ` DO UPDATE  SET ${updates.join(', ')}` : ' DO NOTHING ';
	const actionOfV1 =
		updates.length > 0 ? ` DO UPDATE  SET ${updatesOfV1.join(', ')}` : ' DO NOTHING ';
	query.query = `${into}(${columns}) VALUES(${places.join(',')}) ON CONFLICT (${conflict.join(',')})${action}`;
	query.template = `INSERT INTO $1:name.$2:name($${itemSlot}:name) VALUES($${itemSlot}:csv) ON CONFLICT (${conflictOfV1.join(',')})${actionOfV1}`;
	addReturning(query, p.options);
	return query;
}

/**
 * `parsePostgresError` of the v1 node, and what the NodeOperationError of n8n does with its
 * result. `index`: the index of the query that failed, when v1 gives it.
 */
function parseError(error: SqlError, queries: Query[], index: number | undefined): Parsed {
	let itemIndex = index;
	let message = error.message;
	const head = 'syntax error at or near "';
	const at = message.indexOf(head);
	if (at !== -1 && queries.length > 0) {
		const start = at + head.length;
		let lineEnd = message.length;
		for (const mark of ['\n', '\r', ' ', ' ']) {
			const found = message.indexOf(mark, start);
			if (found !== -1 && found < lineEnd) lineEnd = found;
		}
		const rest = message.slice(start, lineEnd);
		let quote = -1;
		for (let k = 0; k < rest.length; k++) if (rest[k] === '"') quote = k;
		if (quote !== -1) {
			const snippet = rest.slice(0, quote);
			const failed = queries.findIndex((q) => q.template.includes(snippet));
			if (failed !== -1) {
				if (!itemIndex) itemIndex = failed;
				const lines = queries[failed].template.split('\n');
				const line = lines.findIndex((l) => l.includes(snippet));
				message = `Syntax error at line ${line + 1} near "${snippet}"`;
			}
		}
	}
	let out = message;
	let description: string | undefined = error.detail || error.hint || undefined;
	const failedQuery = queries[itemIndex || 0];
	if (!description && failedQuery !== undefined && failedQuery.template !== '') {
		description = `Failed query: ${failedQuery.template}`;
	}
	for (const [code, text] of CONNECT_ERRORS) {
		if (!message.includes(code)) continue;
		out = text;
		const rest = message.split(`${code} `)[1];
		if (rest !== undefined) description = rest.trim();
	}
	if (!description || description === out) description = undefined;
	const messages: string[] = [];
	const upper = out.toUpperCase();
	for (const [code, text] of COMMON_ERRORS) {
		if (!upper.includes(code)) continue;
		messages.push(out);
		out = text;
		break;
	}
	const parsed: Parsed = { message: out, messages };
	if (description !== undefined) parsed.description = description;
	if (itemIndex !== undefined) parsed.itemIndex = itemIndex;
	return parsed;
}

/** The rows of one statement: of all its commands when the statement is a simple one. */
function rowsOf(entry: SqlRows | SqlSets): Item[] {
	if (!('sets' in entry)) return entry.rows;
	const out: Item[] = [];
	for (const set of entry.sets) for (const row of set.rows) out.push(row);
	return out;
}

/** The items of one result of v1: the rows, or `success` for a query that is not a select. */
function rowsOrSuccess(rows: Item[], query: Query, legacyEmpty: Item[] | null): Item[] {
	if (rows.length > 0) return rows;
	if (legacyEmpty !== null) return legacyEmpty;
	if (query.made !== undefined) return query.made === 'select' ? [] : [{ success: true }];
	return isSelectQuery(query.query) ? [] : [{ success: true }];
}

export default defineNode<PostgresParameters>({
	type: 'n8n-nodes-base.postgres',
	version: 2.6,
	supports: {
		resource: 'database',
		operation: { database: 'insert' },
		operations: {
			'database.executeQuery': [
				'query',
				'options',
				'options.queryReplacement',
				'options.queryBatching',
				'options.largeNumbersOutput',
				'options.connectionTimeout',
				'options.delayClosingIdleConnection',
				'options.replaceEmptyStrings',
				'options.treatQueryParametersInSingleQuotesAsText',
				'nodeVersion',
				'replacement',
				'queryParts',
				'batch',
				'errorMode',
				'node',
			],
			'database.select': [
				'schema',
				'table',
				'returnAll',
				'limit',
				'where',
				'where.values',
				'sort',
				'sort.values',
				'combineConditions',
				'options',
				'options.outputColumns',
				'options.queryBatching',
				'options.largeNumbersOutput',
				'options.connectionTimeout',
				'options.delayClosingIdleConnection',
				'options.replaceEmptyStrings',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.insert': [
				'schema',
				'table',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.matchingColumns',
				'columns.schema',
				'options',
				'options.skipOnConflict',
				'options.outputColumns',
				'options.queryBatching',
				'options.largeNumbersOutput',
				'options.connectionTimeout',
				'options.delayClosingIdleConnection',
				'options.replaceEmptyStrings',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.update': [
				'schema',
				'table',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.matchingColumns',
				'columns.schema',
				'options',
				'options.outputColumns',
				'options.queryBatching',
				'options.largeNumbersOutput',
				'options.connectionTimeout',
				'options.delayClosingIdleConnection',
				'options.replaceEmptyStrings',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.upsert': [
				'schema',
				'table',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.matchingColumns',
				'columns.schema',
				'options',
				'options.outputColumns',
				'options.queryBatching',
				'options.largeNumbersOutput',
				'options.connectionTimeout',
				'options.delayClosingIdleConnection',
				'options.replaceEmptyStrings',
				'nodeVersion',
				'batch',
				'errorMode',
				'node',
			],
			'database.deleteTable': [
				'schema',
				'table',
				'deleteCommand',
				'restartSequences',
				'where',
				'where.values',
				'combineConditions',
				'options',
				'options.cascade',
				'options.queryBatching',
				'options.largeNumbersOutput',
				'options.connectionTimeout',
				'options.delayClosingIdleConnection',
				'options.replaceEmptyStrings',
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
		const version = parameters.nodeVersion ?? first.nodeVersion ?? 0;
		if (version < 2.1) throw hostError('The node version is below 2.1');
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
		// Before version 2.3, the result of a query without rows depends on the operation only.
		// In the modes `transaction` and `independently`, v1 then wraps its item two times.
		const select = operation === 'select';
		const legacySingle: Item[] | null = version >= 2.3 ? null : select ? [] : [{ success: true }];
		const legacyEach: Item[] | null =
			version >= 2.3 ? null : select ? [] : [{ json: { success: true } }];
		// The v1 router reads the options of the first item for the connection and the mode.
		const options = first.options ?? {};
		const mode = options.queryBatching || 'single';
		if (mode !== 'single' && mode !== 'transaction' && mode !== 'independently') {
			throw hostError('The query batching mode is unknown');
		}

		let calls = 0;
		// An error that is not an error of v1: it fails the step also under a continue setting.
		let effectFailed = false;
		// The first call found no connection, as the connection that v1 opens before all else.
		let connectFailure: Parsed | undefined;
		const broken = (): Error => {
			effectFailed = true;
			return new Error('Postgres: the runtime gave no result');
		};
		// `sent`: a statement of an earlier call ran, so the host must not run the node again.
		const send = async (
			list: SqlStatement[],
			sent: boolean,
			batching: 'single' | 'transaction' | 'independently',
		): Promise<SqlResult> => {
			calls++;
			const largeNumbers = options.largeNumbersOutput === 'numbers' ? 'numbers' : 'text';
			const dates = version >= 2.7 ? 'text' : 'legacy';
			let result: SqlResult;
			try {
				if (options.connectionTimeout) {
					result = await ctx.sql({
						credential,
						dialect: 'postgres',
						mode: batching,
						statements: list,
						largeNumbers,
						dates,
						connectTimeoutMs: options.connectionTimeout * 1000,
					});
				} else {
					result = await ctx.sql({
						credential,
						dialect: 'postgres',
						mode: batching,
						statements: list,
						largeNumbers,
						dates,
					});
				}
			} catch (error) {
				effectFailed = true;
				const message = messageOf(error);
				if (!sent && message.includes('(limit: sql-')) {
					throw new Error(`${message} ${RUNS_IN_HOST}`);
				}
				throw error;
			}
			if (result.connect !== undefined) {
				const parsed = parseError(result.connect, [], undefined);
				if (calls === 1) connectFailure = parsed;
				else effectFailed = true;
				throw new Error(parsed.message);
			}
			return result;
		};
		// The rows of one statement that only reads, alone, as v1 reads the columns of a table.
		// v1 gives the error of the database as it is.
		const read = async (text: string, given: unknown[]): Promise<Item[]> => {
			const values: SqlValue[] = [];
			for (const value of given) values.push(bindValue(value));
			const result = await send([{ text, values }], false, 'single');
			const entry = result.results[0];
			if (entry === undefined) throw broken();
			if ('error' in entry) throw new Error(entry.error.message);
			return rowsOf(entry);
		};
		// The spread of the NodeOperationError of v1, as an error item holds it.
		const errorObject = (parsed: Parsed, withMessage: boolean): Item => {
			const out: Item = { name: 'NodeOperationError', level: 'warning', shouldReport: true };
			if (parsed.description !== undefined) out.description = parsed.description;
			out.tags = { packageName: 'workflow' };
			out.timestamp = Date.now();
			out.context = parsed.itemIndex === undefined ? {} : { itemIndex: parsed.itemIndex };
			out.functionality = 'regular';
			out.node = nodeCopy;
			out.messages = parsed.messages;
			if (withMessage) out.message = parsed.message;
			return out;
		};
		// The result under a continue setting. With the error output, n8n pairs the items that
		// the node did not pair (`assignPairedItems`), and moves each item that is only an error
		// to the error output, on top of its input item (`handleNodeErrorOutput`).
		const finish = (outs: Out[]): Item[] => {
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
				let onlyError = errorMode === 'errorOutput' && json.error ? true : false;
				for (const key of Object.keys(json)) {
					if (key !== 'error' && key !== 'message' && key !== 'details') onlyError = false;
				}
				if (!onlyError) {
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
			const firstError = outs[0]?.json.error;
			if (firstError !== undefined && firstError !== null && firstError !== false) {
				return [{ items: main, errors, retry: true }];
			}
			return [{ items: main, errors }];
		};
		// The items of a call in the mode `single` that gave no row.
		const emptySingle = (queries: Query[]): Item[] => {
			if (legacySingle !== null) return legacySingle;
			for (const q of queries) {
				if (q.made === 'write') return [{ success: true }];
				if (q.made === undefined && !isSelectQuery(q.query)) return [{ success: true }];
			}
			return [];
		};

		try {
			const queries: Query[] = [];
			if (typeof operation === 'string' && WRITES.includes(operation)) {
				if (version < 2.2) throw hostError('The node version is below 2.2');
				const replace = options.replaceEmptyStrings ? true : false;
				let schema = first.schema;
				let table = first.table;
				let columnsInfo = await read(TABLE_SCHEMA, [schema, table]);
				for (let i = 0; i < each.length; i++) {
					try {
						const p = each[i];
						const columns = p.columns;
						if (!isRecord(columns) || typeof columns.mappingMode !== 'string') {
							throw hostError('The columns of the node are not a mapping');
						}
						const matching = operation === 'insert' ? [] : matchingColumns(columns);
						let item: Record<string, unknown> = {};
						// v1 has undefined for these values, and does not check them against the columns.
						const passed: string[] = [];
						let unsure = false;
						if (columns.mappingMode === 'autoMapInputData') item = inputValues(items?.[i], replace);
						if (columns.mappingMode === 'defineBelow') {
							const value = columns.value;
							if (!isRecord(value)) throw hostError('The values of the columns are not an object');
							const json = columnsInfo.filter((c) => c.data_type === 'json');
							if (operation === 'insert' && json.length > 0) {
								// `convertValuesToJsonWithPgp`: v1 reads the values without a cast.
								unsure = true;
								for (const key of Object.keys(value)) item[key] = value[key];
								for (const column of json) {
									const name = String(column.column_name);
									const member = item[name];
									if (member !== null && member !== undefined) item[name] = JSON.stringify(member);
								}
							} else {
								item = mappedValues(value, columns.schema, i, operation === 'insert');
								for (const key of Object.keys(item)) {
									if (item[key] === undefined) {
										item[key] = null;
										passed.push(key);
									}
								}
							}
						}
						if (operation === 'update') {
							// `doesRowExist` of the v1 node.
							const exists: Query = { query: '', values: [], template: '', slots: 0 };
							const from = `${nameIn(exists, p.schema)}.${nameIn(exists, p.table)}`;
							const conditions: string[] = [];
							for (const name of matching) {
								conditions.push(`${nameIn(exists, name)}=${place(exists, item[name])}`);
							}
							if (exists.nameError !== undefined) throw new Error(exists.nameError);
							const rows = await read(
								`SELECT EXISTS(SELECT 1 FROM ${from} WHERE ${conditions.join(' AND ')})`,
								exists.values,
							);
							if (rows[0]?.exists !== true) {
								throw new Error("The row you are trying to update doesn't exist");
							}
						}
						if (operation === 'upsert') {
							const key = matching[0];
							if (key === undefined || !item[key]) {
								throw new Error(
									"Column to match on not found in input item. Add a column to match on or set the 'Data Mode' to 'Define Below' to define the value to match on.",
								);
							}
							if (Object.keys(item).length === 1) {
								throw new Error(
									"Add values to update or insert to the input item or set the 'Data Mode' to 'Define Below' to define the values to insert or update.",
								);
							}
						}
						if (p.schema !== schema || p.table !== table) {
							schema = p.schema;
							table = p.table;
							columnsInfo = await read(TABLE_SCHEMA, [schema, table]);
						}
						if (version >= 2.4) item = withArrayText(item, columnsInfo);
						checkItem(item, columnsInfo, unsure, passed);
						if (operation === 'insert') queries.push(insertOf(p, item, version));
						else if (operation === 'update') queries.push(updateOf(p, item, matching));
						else queries.push(upsertOf(p, item, matching));
					} catch (error) {
						if (errorMode === undefined || effectFailed) throw error;
						if (messageOf(error).includes('(limit: sql-')) throw error;
						// v1 keeps the error object of this item in an error item. Its JSON has no
						// message, but a later node can read the message. Only reads ran.
						throw hostError('An item fails before its query under a continue setting');
					}
				}
			} else {
				for (const p of each) {
					if (operation === 'executeQuery') queries.push(executeQueryOf(p, version));
					else if (operation === 'select') queries.push(selectOf(p));
					else if (operation === 'deleteTable') queries.push(deleteOf(p));
					else throw hostError('The operation is not in the compiled library');
				}
			}
			const statements: SqlStatement[] = [];
			const joined = mode === 'single' && queries.length > 1;
			// pg-promise raises the error of a name when it writes the query: before all queries in
			// the mode `single`, and after the queries before it in the other modes.
			const badName = queries.findIndex((q) => q.nameError !== undefined);
			const nameFailure = (index: number, at: number | undefined): Parsed =>
				parseError({ message: queries[index].nameError ?? '' }, queries, at);
			if (errorMode === undefined) {
				if (badName > 0 && mode !== 'single') {
					throw hostError('A name is not valid after queries that run');
				}
				if (badName !== -1) throw new Error(nameFailure(badName, undefined).message);
			}
			if (mode !== 'independently' && queries.length > MAX_STATEMENTS) {
				throw hostError('The node has more statements than one call takes');
			}
			// The text of the query before, with its number of values: the check gives the same.
			let checked = '';
			let checkedValues = -1;
			for (const q of queries) {
				const text = q.made !== undefined ? q.query : clean(q.query);
				if (q.made === undefined && (text !== checked || q.values.length !== checkedValues)) {
					checkQuery(text, q.values.length, joined);
					checked = text;
					checkedValues = q.values.length;
				}
				const values: SqlValue[] = [];
				for (const value of q.values) values.push(bindValue(value));
				statements.push({ text, values });
			}

			const out: Item[] = [];
			if (errorMode === undefined) {
				if (mode === 'independently') {
					// v1 stops at the first failure, so each statement is one call.
					for (let i = 0; i < statements.length; i++) {
						const result = await send([statements[i]], i > 0, 'single');
						const entry = result.results[0];
						if (entry === undefined) throw broken();
						if ('error' in entry) throw new Error(parseError(entry.error, queries, i).message);
						for (const row of rowsOrSuccess(rowsOf(entry), queries[i], legacyEach)) out.push(row);
					}
					return out;
				}
				const result = await send(statements, false, mode);
				for (let i = 0; i < result.results.length; i++) {
					const entry = result.results[i];
					if ('error' in entry) {
						const at = mode === 'single' ? undefined : i;
						throw new Error(parseError(entry.error, queries, at).message);
					}
				}
				if (result.results.length !== statements.length) throw broken();
				for (let i = 0; i < result.results.length; i++) {
					const entry = result.results[i];
					if ('error' in entry) continue;
					const rows = rowsOf(entry);
					const given = mode === 'transaction' ? rowsOrSuccess(rows, queries[i], legacyEach) : rows;
					for (const row of given) out.push(row);
				}
				if (mode === 'transaction' || out.length > 0) return out;
				return emptySingle(queries);
			}

			// Under a continue setting, an error of a query is data. No query runs two times.
			const outs: Out[] = [];
			if (mode === 'single') {
				let failure: Parsed | undefined;
				if (badName !== -1) {
					if (calls === 0) await read('SELECT 1', []);
					failure = nameFailure(badName, undefined);
				} else {
					const result = await send(statements, false, 'single');
					for (const entry of result.results) {
						if (failure === undefined && 'error' in entry) {
							failure = parseError(entry.error, queries, undefined);
						}
					}
					if (failure === undefined && result.results.length !== statements.length) throw broken();
					for (let i = 0; i < result.results.length; i++) {
						const entry = result.results[i];
						if ('error' in entry) continue;
						for (const row of rowsOf(entry)) outs.push({ json: row, paired: i });
					}
				}
				if (failure !== undefined) {
					return finish([
						{ json: { message: failure.message, error: errorObject(failure, false) } },
					]);
				}
				if (outs.length === 0) {
					for (const row of emptySingle(queries)) outs.push({ json: row, paired: 0 });
				}
				return finish(outs);
			}
			if (mode === 'transaction') {
				// v1 ends at the first failure and gives the items before it. A name that is not
				// valid fails when its query is next, and the queries before it are committed.
				const count = badName === -1 ? statements.length : badName;
				if (count === 0 && calls === 0) await read('SELECT 1', []);
				const results =
					count > 0 ? (await send(statements.slice(0, count), false, 'transaction')).results : [];
				for (let i = 0; i < results.length; i++) {
					const entry = results[i];
					if ('error' in entry) {
						// A failure of the commit is not in the `try` of v1: the node fails.
						if (i >= count) throw new Error(entry.error.message);
						const parsed = parseError(entry.error, queries, i);
						outs.push({ json: { error: errorObject(parsed, false) }, paired: i });
						return finish(outs);
					}
					for (const row of rowsOrSuccess(rowsOf(entry), queries[i], legacyEach)) {
						outs.push({ json: row, paired: i });
					}
				}
				if (results.length !== count) throw broken();
				if (badName !== -1) {
					const parsed = nameFailure(badName, badName);
					outs.push({ json: { error: errorObject(parsed, false) }, paired: badName });
				}
				return finish(outs);
			}
			// `independently`: each query runs alone, and a failure does not stop the next one.
			const good: number[] = [];
			for (let i = 0; i < queries.length; i++) {
				if (queries[i].nameError === undefined) good.push(i);
			}
			if (good.length === 0 && calls === 0) await read('SELECT 1', []);
			const entries: Array<SqlRows | SqlSets | SqlFailure | undefined> = [];
			for (let start = 0; start < good.length; start += MAX_STATEMENTS) {
				const part = good.slice(start, start + MAX_STATEMENTS);
				const list: SqlStatement[] = [];
				for (const index of part) list.push(statements[index]);
				const result = await send(list, start > 0, 'independently');
				if (result.results.length !== part.length) throw broken();
				for (let k = 0; k < part.length; k++) entries[part[k]] = result.results[k];
			}
			for (let i = 0; i < queries.length; i++) {
				const entry = entries[i];
				if (entry === undefined) {
					const parsed = nameFailure(i, i);
					outs.push({ json: { error: errorObject(parsed, false) }, paired: i });
				} else if ('error' in entry) {
					const parsed = parseError(entry.error, queries, i);
					outs.push({ json: { error: errorObject(parsed, false) }, paired: i });
				} else {
					for (const row of rowsOrSuccess(rowsOf(entry), queries[i], legacyEach)) {
						outs.push({ json: row, paired: i });
					}
				}
			}
			return finish(outs);
		} catch (error) {
			let failure: unknown = error;
			if (effectFailed || messageOf(failure).includes('(limit: sql-')) throw failure;
			if (calls === 0) {
				// v1 opens a connection before it reads a parameter: a failure of the connection
				// comes before the failure of a parameter.
				try {
					await read('SELECT 1', []);
				} catch (probe) {
					failure = probe;
				}
				if (effectFailed || messageOf(failure).includes('(limit: sql-')) throw failure;
			}
			if (errorMode === undefined) throw failure;
			if (connectFailure !== undefined) {
				const outs: Out[] = [];
				for (let k = 0; k < inputs.length; k++) {
					outs.push({ json: { error: errorObject(connectFailure, true) }, paired: k });
				}
				return finish(outs);
			}
			// The node of v1 fails: n8n gives the input items on, and keeps the error on the run.
			return [{ items: inputs, errors: [], nodeError: messageOf(failure), retry: true }];
		}
	},
});
