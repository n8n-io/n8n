/**
 * The query formatter of pg-promise 11.9.1 (`lib/formatting.js`), in the
 * subset of the workflow language. It gives the text that pg-promise gives,
 * character for character, or it throws.
 *
 * This is the only place where a value becomes SQL text. The text is the
 * text of the v1 Postgres node, so it has the safety of v1 and no more: a
 * string becomes `'...'` with each `'` written twice, a backslash stays as it
 * is and there is no `E''` form. That is safe only while the server has
 * `standard_conforming_strings = on`, as with v1.
 *
 * An error is one of two kinds:
 * - an error of pg-promise, with the same message (pg-promise throws
 *   `TypeError` and `RangeError`; the subset has only `Error`, so the class is
 *   not kept);
 * - an input for which this code cannot prove the text of pg-promise. The
 *   message ends with `(limit: sql-host)` and the node must run in the
 *   fallback host. The cases: `values` that is a plain object (the named
 *   parameters `${name}` of pg-promise), an array nested deeper than
 *   `PGF_MAX_DEPTH`, an option other than `partial`, and a value that is not
 *   JSON data (for example a Date object: pg-promise writes it in the time zone
 *   of its process).
 *
 * A Date is a number in a compiled module. This code then writes the number.
 * The caller must not pass a Date.
 *
 * A library node can import only from `@n8n/workflow-lang`, so a node cannot
 * import this file. The node holds a copy of the code between the two marker
 * lines, without the word `export`. `src/nodes/__tests__/pg-format.test.ts`
 * compiles that same text into a test node and proves it against pg-promise.
 */

// pg-format:begin
const PGF_HOST_MARKER = '(limit: sql-host)';
const PGF_MODIFIERS = [
	'^',
	'~',
	'#',
	':raw',
	':alias',
	':name',
	':json',
	':csv',
	':list',
	':value',
];
const PGF_MODES = ['raw', 'name', 'value', 'raw', 'alias', 'name', 'json', 'csv', 'csv', 'value'];
const PGF_MAX_VARIABLE = 100000;
const PGF_MAX_DEPTH = 64;
const PGF_BIGINT_MARK = '#bigint"';

function pgfHostError(reason: string): Error {
	return new Error(`${reason} ${PGF_HOST_MARKER}`);
}

function pgfIsRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pgfIsDigit(code: number): boolean {
	return code >= 48 && code <= 57;
}

/** The characters of `\s` in a regular expression of JavaScript. */
function pgfIsSpace(code: number): boolean {
	if (code === 32 || (code >= 9 && code <= 13)) return true;
	if (code < 160) return false;
	return (
		code === 160 ||
		code === 5760 ||
		(code >= 8192 && code <= 8202) ||
		code === 8232 ||
		code === 8233 ||
		code === 8239 ||
		code === 8287 ||
		code === 12288 ||
		code === 65279
	);
}

function pgfQuote(text: string): string {
	return `'${text.replaceAll("'", "''")}'`;
}

function pgfQuoteName(name: string): string {
	return `"${name.replaceAll('"', '""')}"`;
}

/**
 * `utils.toJson`: `JSON.stringify`, then each `"<integer>#bigint"` of the text
 * loses its quotes and its mark. pg-promise does this to every text with that
 * form, also to a string of the data, so this code does the same.
 */
function pgfToJson(data: unknown): string {
	const text: unknown = JSON.stringify(data);
	if (typeof text !== 'string') throw pgfHostError('A value has no JSON form');
	let at = text.indexOf(PGF_BIGINT_MARK, 0);
	if (at < 0) return text;
	const parts: string[] = [];
	let from = 0;
	while (at >= 0) {
		let start = at;
		while (start > from && pgfIsDigit(text.charCodeAt(start - 1))) start--;
		const digits = start;
		if (digits < at && start > from && text.charAt(start - 1) === '-') start--;
		if (digits < at && start > from && text.charAt(start - 1) === '"') {
			parts.push(text.slice(from, start - 1));
			parts.push(text.slice(start, at));
			from = at + PGF_BIGINT_MARK.length;
			at = text.indexOf(PGF_BIGINT_MARK, from);
		} else {
			at = text.indexOf(PGF_BIGINT_MARK, at + 1);
		}
	}
	parts.push(text.slice(from));
	return parts.join('');
}

/** The text of a value in an error message of pg-promise. */
function pgfJsonText(value: unknown): string {
	return value === undefined ? 'undefined' : pgfToJson(value);
}

function pgfNumber(value: number): string {
	if (Number.isFinite(value)) {
		const text = String(value);
		return value < 0 ? `(${text})` : text;
	}
	if (value > 0) return "'+Infinity'";
	if (value < 0) return "'-Infinity'";
	return "'NaN'";
}

function pgfArrayItems(list: unknown[], depth: number): string {
	if (depth > PGF_MAX_DEPTH) throw pgfHostError('An array has too many levels');
	const parts: string[] = [];
	for (const value of list) {
		parts.push(Array.isArray(value) ? pgfArrayItems(value, depth + 1) : pgfPlain(value, false));
	}
	return `[${parts.join(',')}]`;
}

function pgfArrayText(list: unknown[]): string {
	return list.length === 0 ? "'{}'" : `array${pgfArrayItems(list, 1)}`;
}

/** `formatValue` without a filter, or with the raw filter. */
function pgfPlain(value: unknown, raw: boolean): string {
	if (value === undefined || value === null) {
		if (raw) throw new Error('Values null/undefined cannot be used as raw text.');
		return 'null';
	}
	if (typeof value === 'string') return raw ? value : pgfQuote(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') return pgfNumber(value);
	if (Array.isArray(value)) return pgfArrayText(value);
	if (pgfIsRecord(value)) {
		const text = pgfToJson(value);
		// A plain object gives `{...}`. Another text means the value is not JSON data.
		if (text.charAt(0) !== '{') throw pgfHostError('A value is not JSON data');
		return raw ? text : pgfQuote(text);
	}
	throw pgfHostError('A value is not JSON data');
}

function pgfJson(data: unknown, raw: boolean): string {
	if (data === undefined || data === null) {
		if (raw) throw new Error('Values null/undefined cannot be used as raw text.');
		return 'null';
	}
	if (typeof data === 'object' && !Array.isArray(data)) {
		const text = pgfToJson(data);
		if (text.charAt(0) !== '{') throw pgfHostError('A value is not JSON data');
		return raw ? text : pgfQuote(text);
	}
	if (
		typeof data !== 'string' &&
		typeof data !== 'number' &&
		typeof data !== 'boolean' &&
		!Array.isArray(data)
	) {
		throw pgfHostError('A value is not JSON data');
	}
	const text = pgfToJson(data);
	return raw ? text : pgfQuote(text);
}

function pgfCsv(values: unknown): string {
	if (Array.isArray(values)) {
		const parts: string[] = [];
		for (const value of values) parts.push(pgfPlain(value, false));
		return parts.join(',');
	}
	if (pgfIsRecord(values)) {
		const parts: string[] = [];
		for (const key of Object.keys(values)) parts.push(pgfPlain(values[key], false));
		return parts.join(',');
	}
	return values === undefined ? '' : pgfPlain(values, false);
}

/** `/^\s*\*(\s*)$/`: one `*` with nothing but spaces round it. */
function pgfIsStar(name: string): boolean {
	let stars = 0;
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i);
		if (code === 42) stars++;
		else if (!pgfIsSpace(code)) return false;
	}
	return stars === 1;
}

function pgfName(name: unknown): string {
	if (typeof name === 'string' && name !== '') {
		return pgfIsStar(name) ? name : pgfQuoteName(name);
	}
	if (typeof name === 'object' && name !== null) {
		const keys: unknown[] = Array.isArray(name) ? name : Object.keys(name);
		if (keys.length === 0) {
			throw new Error('Cannot retrieve sql names from an empty array/object.');
		}
		const parts: string[] = [];
		for (const key of keys) {
			if (typeof key !== 'string' || key === '') {
				throw new Error(`Invalid sql name: ${pgfJsonText(key)}`);
			}
			parts.push(pgfQuoteName(key));
		}
		return parts.join(',');
	}
	throw new Error(`Invalid sql name: ${pgfJsonText(name)}`);
}

/** `/^([a-z_][a-z0-9_$]*|[A-Z_][A-Z0-9_$]*)$/` for letters from `first`. */
function pgfIsSimpleAlias(part: string, first: number): boolean {
	for (let i = 0; i < part.length; i++) {
		const code = part.charCodeAt(i);
		const letter = (code >= first && code <= first + 25) || code === 95;
		if (!letter && (i === 0 || !(pgfIsDigit(code) || code === 36))) return false;
	}
	return part.length > 0;
}

function pgfAlias(name: unknown): string {
	if (typeof name !== 'string' || name === '') {
		throw new Error(`Invalid sql alias: ${pgfJsonText(name)}`);
	}
	const parts: string[] = [];
	for (const part of name.split('.')) {
		if (part === '') continue;
		parts.push(
			pgfIsSimpleAlias(part, 97) || pgfIsSimpleAlias(part, 65) ? part : pgfQuoteName(part),
		);
	}
	return parts.join('.');
}

function pgfOpenValue(value: unknown): string {
	if (value === undefined || value === null) {
		throw new Error('Open values cannot be null or undefined.');
	}
	return pgfPlain(value, true).replaceAll("'", "''");
}

function pgfFiltered(value: unknown, mode: string): string {
	if (mode === '') return pgfPlain(value, false);
	if (mode === 'raw') return pgfPlain(value, true);
	if (mode === 'name') return pgfName(value);
	if (mode === 'alias') return pgfAlias(value);
	if (mode === 'json') return pgfJson(value, false);
	if (mode === 'csv') return pgfCsv(value);
	if (mode === 'value') return pgfOpenValue(value);
	throw pgfHostError('A filter is not known');
}

/** The index in `PGF_MODIFIERS` of the filter at `at`, or -1. The order is the order of pg-promise. */
function pgfModifierAt(query: string, at: number): number {
	const next = query.charAt(at);
	if (next !== '^' && next !== '~' && next !== '#' && next !== ':') return -1;
	for (let i = 0; i < PGF_MODIFIERS.length; i++) {
		const modifier = PGF_MODIFIERS[i];
		if (query.slice(at, at + modifier.length) === modifier) return i;
	}
	return -1;
}

/**
 * `formatAs.array` and `formatAs.value`: replaces each `$n` and its filter.
 * pg-promise does not read SQL: it also replaces inside a string, an
 * identifier, a dollar quote and a comment. The text of a value is not read
 * again. With `single`, only `$1` is a variable.
 */
function pgfReplace(query: string, values: unknown[], single: boolean, partial: boolean): string {
	const parts: string[] = [];
	let from = 0;
	let at = query.indexOf('$', 0);
	while (at >= 0) {
		let end = at + 1;
		let next = at + 1;
		const first = end < query.length ? query.charCodeAt(end) : 0;
		if (first >= 49 && first <= 57) {
			end++;
			while (end < query.length && end - at <= 17 && pgfIsDigit(query.charCodeAt(end))) end++;
			const digits = query.slice(at + 1, end);
			const more = end < query.length && pgfIsDigit(query.charCodeAt(end));
			if (!more && (!single || digits === '1')) {
				const modifier = pgfModifierAt(query, end);
				const mode = modifier < 0 ? '' : PGF_MODES[modifier];
				if (modifier >= 0) end += PGF_MODIFIERS[modifier].length;
				const index = Number(digits) - 1;
				if (index >= PGF_MAX_VARIABLE) {
					throw new Error(
						`Variable $${digits} exceeds supported maximum of $${String(PGF_MAX_VARIABLE)}`,
					);
				}
				if (index < values.length) {
					parts.push(query.slice(from, at));
					parts.push(pgfFiltered(values[index], mode));
					from = end;
				} else if (!partial) {
					throw new Error(
						`Variable $${digits} out of range. Parameters array length: ${String(values.length)}`,
					);
				}
				next = end;
			}
		}
		at = query.indexOf('$', next);
	}
	if (from === 0) return query;
	parts.push(query.slice(from));
	return parts.join('');
}

/** `/^[\s;]*|[\s;]*$/g` replaced by nothing. */
function pgfClean(query: string): string {
	let start = 0;
	let end = query.length;
	while (start < end) {
		const code = query.charCodeAt(start);
		if (code !== 59 && !pgfIsSpace(code)) break;
		start++;
	}
	while (end > start) {
		const code = query.charCodeAt(end - 1);
		if (code !== 59 && !pgfIsSpace(code)) break;
		end--;
	}
	return query.slice(start, end);
}

/**
 * `pgp.as.format(query, values, { partial })`. `values` is an array (`$1`,
 * `$2`, ...), or one value that is not an object (`$1` only), or undefined
 * (the query stays as it is). With `partial`, a variable without a value
 * stays in the text. Without it, that variable is an error.
 * `db.any(query, values)` and `db.multi(query, values)` format as
 * `pgFormat(query, values, false)`.
 */
export function pgFormat(query: unknown, values: unknown, partial: boolean): string {
	if (typeof query !== 'string') throw new Error("Parameter 'query' must be a text string.");
	if (values === undefined) return query;
	if (Array.isArray(values)) return pgfReplace(query, values, false, partial);
	if (typeof values === 'object' && values !== null) {
		throw pgfHostError('The values of a query are an object');
	}
	return pgfReplace(query, [values], true, partial);
}

/**
 * `pgp.helpers.concat(queries)`. An entry is a query text, or
 * `{ query, values?, options?: { partial?: boolean } }`. Each text loses the
 * spaces and `;` at its two ends, an empty text goes, and `;` joins the rest.
 */
export function pgConcat(queries: unknown): string {
	if (!Array.isArray(queries)) throw new Error("Parameter 'queries' must be an array.");
	const all: string[] = [];
	for (let i = 0; i < queries.length; i++) {
		const entry: unknown = queries[i];
		let text = '';
		if (typeof entry === 'string') {
			text = pgfClean(entry);
		} else if (pgfIsRecord(entry) && 'query' in entry) {
			const options = entry.options;
			let partial = false;
			if (options !== undefined && options !== null) {
				if (!pgfIsRecord(options)) throw pgfHostError('The options of a query are not an object');
				for (const key of Object.keys(options)) {
					if (key !== 'partial' || typeof options[key] !== 'boolean') {
						throw pgfHostError('A query has an option other than partial');
					}
				}
				partial = options.partial === true;
			}
			text = pgfClean(pgFormat(entry.query, entry.values, partial));
		} else {
			throw new Error(`Invalid query element at index ${String(i)}.`);
		}
		if (text !== '') all.push(text);
	}
	return all.join(';');
}

/** `pgp.as.name(name)`: the filter `:name` and `~`. */
export function pgName(name: unknown): string {
	return pgfName(name);
}

/** `pgp.as.alias(name)`: the filter `:alias`. */
export function pgAlias(name: unknown): string {
	return pgfAlias(name);
}

/** `pgp.as.json(data, raw)`: the filter `:json`. With `raw`, the JSON text has no quotes round it. */
export function pgJson(data: unknown, raw: boolean): string {
	return pgfJson(data, raw);
}

/** `pgp.as.value(value)`: the filter `:value` and `#`. */
export function pgValue(value: unknown): string {
	return pgfOpenValue(value);
}

/** `pgp.as.csv(values)`: the filters `:csv` and `:list`. */
export function pgCsv(values: unknown): string {
	return pgfCsv(values);
}

/** `pgp.as.array(list)` for an array, null or undefined. */
export function pgArray(list: unknown): string {
	if (list === undefined || list === null) return 'null';
	if (Array.isArray(list)) return pgfArrayText(list);
	throw pgfHostError('The value is not an array');
}

/** `pgp.as.text(value, raw)` for a string, null or undefined. */
export function pgText(value: unknown, raw: boolean): string {
	if (value === undefined || value === null || typeof value === 'string') {
		return pgfPlain(value, raw);
	}
	throw pgfHostError('The value is not text');
}
// pg-format:end
