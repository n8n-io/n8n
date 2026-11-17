/**
 * Compiled library node: a hand port of `n8n-nodes-base.postgres` versions
 * 2.5 to 2.8, operations `executeQuery`, `select` and `deleteTable`, for a
 * node that stops the workflow on an error.
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
 * The converter runs the node once for all items, with the parameters of
 * each item in `batch`, and adds `nodeVersion` and `replacement`.
 */
import {
	defineNode,
	type Item,
	type SqlError,
	type SqlResult,
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
	options?: PostgresOptions;
	/** The version of the node. Set by the converter. */
	nodeVersion?: number;
	/** The parts of `options.queryReplacement`, as v1 reads its raw text. Set by the converter. */
	replacement?: Replacement;
	/** The parameters of each input item. Set by the converter. */
	batch?: PostgresParameters[];
}

interface Query {
	query: string;
	values: unknown[];
	/** The error of pg-promise for a name of this query. v1 raises it when it sends the query. */
	nameError?: string;
}

const HOST_MARKER = '(limit: sql-host)';
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The error that sends the node to the fallback host. Nothing was sent. */
function hostError(reason: string): Error {
	return new Error(
		`Postgres: ${reason}. The fallback host runs the node ${HOST_MARKER} ${RUNS_IN_HOST}`,
	);
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
			if (c === "'" && isEString(text, i)) throw hostError('A query has an escape string');
			let j = i + 1;
			let closed = false;
			while (j < len && !closed) {
				if (text[j] === c && text[j + 1] === c) j += 2;
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

/** The query and the values of one item of `executeQuery`, as the v1 node makes them. */
function executeQueryOf(p: PostgresParameters, version: number): Query {
	if (typeof p.query !== 'string') throw hostError('The query is not text');
	let query = p.query;
	const open = query.indexOf('{{');
	if (open !== -1 && query.indexOf('}}', open + 2) !== -1) {
		throw hostError('The query text has an expression after its expressions ran');
	}
	const options = p.options ?? {};
	const replacement = p.replacement ?? {};
	let values: unknown[] = [];
	let given: unknown = replacement.present === true ? (options.queryReplacement ?? null) : '';
	if (typeof given === 'number') given = String(given);
	if (typeof given === 'string') {
		if (replacement.raw === true && replacement.parts !== undefined) {
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
	return { query, values };
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
	for (let index = 0; index < clauses.length; index++) {
		const clause = clauses[index];
		let condition = String(clause.condition);
		let value = clause.value;
		if (condition === 'equal') condition = '=';
		if (COMPARISONS.includes(condition)) {
			const numeric = Number(value);
			if (String(value).trim() !== '' && !isNaN(numeric)) value = numeric;
		}
		let place = '';
		if (condition !== 'IS NULL' && condition !== 'IS NOT NULL') {
			query.values.push(value);
			place = ` $${query.values.length}`;
		}
		const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;
		text += ` ${nameIn(query, clause.column)} ${condition}${place}${operator}`;
	}
	query.query += text;
}

/** The query of one item of `select`. */
function selectOf(p: PostgresParameters): Query {
	if (p.options?.outputColumns === null) throw hostError('The output columns are null');
	const columns = p.options?.outputColumns ?? ['*'];
	let all = false;
	if (Array.isArray(columns)) all = columns.includes('*');
	else if (typeof columns === 'string') all = columns.includes('*');
	else throw hostError('The output columns are not a list');
	const query: Query = { query: '', values: [] };
	const from = `${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	query.query = all ? `SELECT * FROM ${from}` : `SELECT ${nameIn(query, columns)} FROM ${from}`;
	addWhere(query, whereClauses(p), p.combineConditions ?? 'AND');
	const rules = p.sort?.values;
	if (Array.isArray(rules) && rules.length > 0) {
		const parts: string[] = [];
		for (const rule of rules) {
			const sort: SortRule = isRecord(rule) ? rule : {};
			parts.push(` ${nameIn(query, sort.column)} ${sort.direction === 'DESC' ? 'DESC' : 'ASC'}`);
		}
		query.query += ` ORDER BY${parts.join(',')}`;
	} else if (rules !== undefined && rules !== null && !Array.isArray(rules)) {
		throw hostError('The sort rules are not a list');
	}
	if (!(p.returnAll ?? false)) {
		if (p.limit === null) throw hostError('The limit is null');
		const limit = Number(p.limit ?? 50);
		if (isNaN(limit)) throw new Error('Failed to parse value to number');
		query.values.push(limit);
		query.query += ` LIMIT $${query.values.length}`;
	}
	return query;
}

/** The query of one item of `deleteTable`. */
function deleteOf(p: PostgresParameters): Query {
	const query: Query = { query: '', values: [] };
	const from = `${nameIn(query, p.schema)}.${nameIn(query, p.table)}`;
	const cascade = p.options?.cascade ? ' CASCADE' : '';
	if (p.deleteCommand === 'drop') query.query = `DROP TABLE IF EXISTS ${from}${cascade}`;
	if (p.deleteCommand === 'truncate') {
		const identity = (p.restartSequences ?? false) ? ' RESTART IDENTITY' : '';
		query.query = `TRUNCATE TABLE ${from}${identity}${cascade}`;
	}
	if (p.deleteCommand === 'delete') {
		query.query = `DELETE FROM ${from}`;
		addWhere(query, whereClauses(p), p.combineConditions ?? 'AND');
	}
	if (query.query === '') {
		throw new Error('Invalid delete command, only drop, delete and truncate are supported ');
	}
	return query;
}

/** The message of `parsePostgresError` of the v1 node. */
function errorMessage(error: SqlError, queries: Query[]): string {
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
			const failed = queries.findIndex((q) => q.query.includes(snippet));
			if (failed !== -1) {
				const lines = queries[failed].query.split('\n');
				const line = lines.findIndex((l) => l.includes(snippet));
				message = `Syntax error at line ${line + 1} near "${snippet}"`;
			}
		}
	}
	let out = message;
	if (message.includes('ECONNREFUSED')) out = 'Connection refused';
	if (message.includes('ENOTFOUND')) out = 'Host not found';
	if (message.includes('ETIMEDOUT')) out = 'Connection timed out';
	return out;
}

/** The items of one result of v1: the rows, or `success` for a query that is not a select. */
function rowsOrSuccess(rows: Item[], query: string): Item[] {
	if (rows.length > 0) return rows;
	return isSelectQuery(query) ? [] : [{ success: true }];
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
				'batch',
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
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		const each = parameters.batch ?? [parameters];
		const first = each[0];
		if (first === undefined) throw hostError('The node has no input item');
		if (credential === undefined) throw hostError('The node has no credential');
		const operation = parameters.operation ?? first.operation;
		const version = parameters.nodeVersion ?? first.nodeVersion ?? 0;
		if (version < 2.5) throw hostError('The node version is below 2.5');
		// The v1 router reads the options of the first item for the connection and the mode.
		const options = first.options ?? {};
		const mode = options.queryBatching || 'single';
		if (mode !== 'single' && mode !== 'transaction' && mode !== 'independently') {
			throw hostError('The query batching mode is unknown');
		}

		const queries: Query[] = [];
		for (const p of each) {
			if (operation === 'executeQuery') queries.push(executeQueryOf(p, version));
			else if (operation === 'select') queries.push(selectOf(p));
			else if (operation === 'deleteTable') queries.push(deleteOf(p));
			else throw hostError('The operation is not in the compiled library');
		}
		const statements: SqlStatement[] = [];
		const joined = mode === 'single' && queries.length > 1;
		// pg-promise raises the error of a name when it writes the query: before all queries in
		// the mode `single`, and after the queries before it in the other modes.
		const badName = queries.findIndex((q) => q.nameError !== undefined);
		if (badName > 0 && mode !== 'single')
			throw hostError('A name is not valid after queries that run');
		if (badName !== -1) throw new Error(queries[badName].nameError ?? '');
		for (const q of queries) {
			const text = clean(q.query);
			checkQuery(text, q.values.length, joined);
			const values: SqlValue[] = [];
			for (const value of q.values) values.push(bindValue(value));
			statements.push({ text, values });
		}

		// `sent`: a statement of an earlier call ran, so the host must not run the node again.
		const send = async (list: SqlStatement[], sent: boolean): Promise<SqlResult> => {
			const batching = mode === 'transaction' ? 'transaction' : 'single';
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
				const message =
					typeof error === 'object' && error !== null && 'message' in error
						? String(error.message)
						: String(error);
				if (!sent && message.includes('(limit: sql-')) {
					throw new Error(`${message} ${RUNS_IN_HOST}`);
				}
				throw error;
			}
			if (result.connect !== undefined) throw new Error(errorMessage(result.connect, []));
			return result;
		};

		const out: Item[] = [];
		if (mode === 'independently') {
			// v1 stops at the first failure, so each statement is one call.
			for (let i = 0; i < statements.length; i++) {
				const result = await send([statements[i]], i > 0);
				const entry = result.results[0];
				if (entry === undefined) throw new Error('Postgres: the runtime gave no result');
				if ('error' in entry) throw new Error(errorMessage(entry.error, queries));
				for (const row of rowsOrSuccess(entry.rows, queries[i].query)) out.push(row);
			}
			return out;
		}
		const result = await send(statements, false);
		for (const entry of result.results) {
			if ('error' in entry) throw new Error(errorMessage(entry.error, queries));
		}
		if (result.results.length !== statements.length) {
			throw new Error('Postgres: the runtime gave no result');
		}
		if (mode === 'transaction') {
			for (let i = 0; i < result.results.length; i++) {
				const entry = result.results[i];
				if ('error' in entry) continue;
				for (const row of rowsOrSuccess(entry.rows, queries[i].query)) out.push(row);
			}
			return out;
		}
		for (const entry of result.results) {
			if ('error' in entry) continue;
			for (const row of entry.rows) out.push(row);
		}
		if (out.length > 0) return out;
		for (const q of queries) if (!isSelectQuery(q.query)) return [{ success: true }];
		return [];
	},
});
