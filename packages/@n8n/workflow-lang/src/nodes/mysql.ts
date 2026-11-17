/**
 * Compiled library node: a hand port of `n8n-nodes-base.mySql` versions 2 to 2.5, operation
 * `executeQuery`, without a continue setting of the node (spec 9.11).
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
 *   alone. This node sends them in one call, all in one `group`: the first failure stops the
 *   call, as v1 stops without a continue setting.
 * - `transaction`: the same statements in one transaction.
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
 *   statements than one `sql` call takes.
 *
 * A query that is not an expression can hold `{{ }}` parts. v1 evaluates them for each item
 * and puts the text of each value in their place. The converter gives the values in
 * `queryParts`, and this node puts the text in the same places. This is the text of the
 * query: it is not a query parameter.
 *
 * The converter runs the node once for all items, with the parameters of each item in
 * `batch`, and adds `nodeVersion`, `replacement` and `queryParts`.
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
}

interface MySqlParameters {
	resource?: string;
	operation?: string;
	query?: unknown;
	options?: MySqlOptions;
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

/** A statement that v1 sends as one statement must give one result: v1 makes its items from one. */
function checkOneResult(text: string): void {
	if (hasCall(text))
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

/** `prepareOutput` of the v1 node. */
function outputOf(
	response: unknown[],
	detailed: boolean,
	statements: string[],
	version: number,
): Item[] {
	const out: Item[] = [];
	if (detailed) {
		for (let index = 0; index < response.length; index++) {
			const item: Item = {};
			if (index < statements.length) item.sql = statements[index];
			item.data = response[index];
			out.push(item);
		}
	} else {
		for (const entry of response) {
			if (!Array.isArray(entry)) continue;
			for (const row of entry) {
				if (!isRecord(row)) throw resultError();
				out.push(row);
			}
		}
	}
	if (out.length === 0 && (version < 2.2 || !myfAllSelect(statements))) {
		out.push({ success: true });
	}
	return out;
}

/** The message of `parseMySqlError` of the v1 node for an error of the database. */
function failureMessage(error: SqlError, itemIndex: number, queries: string[]): string {
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
				return "Cannot read properties of undefined (reading 'split')";
			}
			const line = queries[queryIndex].split('\n').findIndex((text) => text.includes(failed));
			if (line !== -1) {
				message = `You have an error in your SQL syntax on line ${line + 1} near '${failed}'`;
			}
		}
	}
	if (error.message.includes('ECONNREFUSED')) message = 'Connection refused';
	return message;
}

export default defineNode<MySqlParameters>({
	type: 'n8n-nodes-base.mySql',
	version: 2.5,
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
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		const each = parameters.batch ?? [parameters];
		const first = each[0];
		if (first === undefined) throw hostError('The node has no input item');
		if (credential === undefined) throw hostError('The node has no credential');
		const operation = parameters.operation ?? first.operation;
		if (operation !== 'executeQuery') throw hostError('The node does not have the operation');
		const version = parameters.nodeVersion ?? first.nodeVersion ?? 0;
		if (version < 2) throw hostError('The node version is below 2');
		// The v1 router reads the options of the first item for the connection and the mode.
		const options = first.options ?? {};
		const mode = options.queryBatching || 'single';
		if (mode !== 'single' && mode !== 'transaction' && mode !== 'independently') {
			throw hostError('The query batching mode is unknown');
		}
		const detailed = options.detailedOutput;
		if (detailed !== undefined && detailed !== true && detailed !== false) {
			throw hostError('The detailed output option is not true or false');
		}

		// The formatted query of each item, as `connection.format` of v1 gives it.
		const formatted: string[] = [];
		for (const p of each) {
			try {
				const prepared = myfPrepare(queryTextOf(p), version, replacementsOf(p));
				const values: unknown[] = [];
				for (const value of prepared.values) {
					values.push(version >= 2.3 ? myfNumberOr(value) : value);
				}
				formatted.push(myfFormat(prepared.query, values));
			} catch (error) {
				throw withHost(error);
			}
		}

		const send = async (
			list: SqlStatement[],
			batching: 'single' | 'transaction' | 'independently',
		): Promise<SqlResult> => {
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
			if (result.connect !== undefined) throw new Error(failureMessage(result.connect, 0, []));
			return result;
		};

		if (mode === 'single') {
			const text = myfJoin(formatted);
			const statements = myfStatements(text, version, true);
			if (statements.length === 1) checkOneResult(text);
			const result = await send([{ text, simple: true }], 'single');
			const entry = result.results[0];
			if (entry === undefined || result.results.length !== 1) {
				throw new Error('MySQL: the runtime gave no result');
			}
			if ('error' in entry) throw new Error(failureMessage(entry.error, 0, formatted));
			if (!('sets' in entry) || entry.sets.length === 0) {
				throw new Error('MySQL: the runtime gave no result');
			}
			const response = responseOf(entry.sets);
			let list: unknown[] = [response];
			if (Array.isArray(response) && statements.length !== 1) list = response;
			return outputOf(list, detailed === true, statements, version);
		}

		// `independently` and `transaction`: v1 sends each statement of each item alone.
		const split: string[][] = [];
		const list: SqlStatement[] = [];
		const itemOf: number[] = [];
		for (let i = 0; i < formatted.length; i++) {
			const statements = myfStatements(formatted[i], version, false);
			split.push(statements);
			for (const statement of statements) {
				if (statement === '') continue;
				checkOneResult(statement);
				list.push({ text: statement, simple: true, group: 0 });
				itemOf.push(i);
			}
		}
		if (list.length === 0) throw hostError('The node has no statement to send');
		if (list.length > MAX_STATEMENTS)
			throw hostError('The node has too many statements for one call');
		const result = await send(list, mode);
		const responses: unknown[][] = [];
		for (let i = 0; i < formatted.length; i++) responses.push([]);
		for (let k = 0; k < result.results.length; k++) {
			const entry = result.results[k];
			if ('error' in entry) {
				// A failure of the commit is not in the `try` of v1: the node fails with the error as it is.
				if (k >= list.length) throw new Error(entry.error.message);
				throw new Error(failureMessage(entry.error, itemOf[k], [formatted[itemOf[k]]]));
			}
			if (!('sets' in entry) || k >= list.length)
				throw new Error('MySQL: the runtime gave no result');
			if (entry.sets.length !== 1) throw resultError();
			responses[itemOf[k]].push(responseOf(entry.sets));
		}
		if (result.results.length !== list.length) throw new Error('MySQL: the runtime gave no result');
		const out: Item[] = [];
		for (let i = 0; i < formatted.length; i++) {
			for (const item of outputOf(responses[i], detailed === true, split[i], version)) {
				out.push(item);
			}
		}
		return out;
	},
});
