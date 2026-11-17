/**
 * The text that the v1 MySQL node makes on the client, in the subset of the workflow
 * language: the formatter of mysql2 3.23.1 (`connection.format`, which is `format` of
 * sql-escaper 1.5.1 with `stringifyObjects: false`), and the text functions of the v1 node
 * (`packages/nodes-base/nodes/MySql/v2/helpers/utils.ts`). Each function gives the text of
 * its original, character for character, or it throws.
 *
 * The v1 node never binds a value: mysql2 writes each value into the text and sends the
 * text with the text protocol. This is the only place where a value becomes SQL text. The
 * text is the text of v1, so it has the safety of v1 and no more: a string becomes `'...'`
 * with a backslash before `\0 \b \t \n \r \x1a " ' \`. That is safe only while the session
 * does not have the SQL mode `NO_BACKSLASH_ESCAPES`, as with v1.
 *
 * An error is one of two kinds:
 * - an error of the v1 node, with the same message (the class is not kept: the subset has
 *   only `Error`);
 * - an input for which this code cannot prove the text of v1. The message ends with
 *   `(limit: sql-host)` and the node must run in the fallback host. The cases: a value that
 *   is not JSON data, and an object with its own `toString` member (JavaScript then fails
 *   to make a text of it).
 *
 * A Date is a number in a compiled module. This code then writes the number. The caller
 * must not pass a Date: mysql2 writes it in the time zone of its process.
 *
 * A library node can import only from `@n8n/workflow-lang`, so a node cannot import this
 * file. The node holds a copy of the code between the two marker lines, without the word
 * `export`. `src/nodes/__tests__/mysql-format.test.ts` compiles that same text into a test
 * node and proves it against mysql2 and the v1 node.
 */

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

export interface MyfQuery {
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
export function myfString(value: unknown): string {
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
export function myfEscapeId(value: unknown, forbidQualified: boolean): string {
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
export function myfEscape(value: unknown): string {
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
export function myfFormat(sql: string, values: unknown[]): string {
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
export function myfIdentifier(identifier: string): string {
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
export function myfReplaceFirst(text: string, pattern: string, replacement: string): string {
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
export function myfPrepare(rawQuery: string, version: number, replacements: unknown[]): MyfQuery {
	return version >= 2.5
		? myfPrepareSafe(rawQuery, replacements)
		: myfPrepareLegacy(rawQuery, replacements);
}

/**
 * `Number(value) ? Number(value) : value` of the v1 node (`executeQuery` from version
 * 2.3): a value that is a number other than 0 for JavaScript becomes that number.
 */
export function myfNumberOr(value: unknown): unknown {
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
export function myfStatements(query: string, version: number, single: boolean): string[] {
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
export function myfJoin(queries: string[]): string {
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
export function myfAllSelect(statements: string[]): boolean {
	for (const statement of statements) {
		if (statement.startsWith('--')) continue;
		const text = myfWithoutLineFeeds(myfWithoutComments(statement)).toLowerCase();
		if (!text.startsWith('select')) return false;
	}
	return true;
}
// mysql-format:end
