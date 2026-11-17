/**
 * Helper functions that generated workflows can use. Each helper is subset
 * source. The converter appends the helpers that a workflow uses, and the
 * helpers they call, at the end of the generated file.
 *
 * The helpers copy the behaviour of the v1 node code that they replace
 * (lodash `get`, `set`, `merge` and the field rules of the Set node) for
 * plain JSON values.
 */

import { str } from './code.ts';
import { CODE_HELPERS } from './code-native/helpers.ts';
import { EXTENSION_HELPER_SOURCES } from './extension-helpers.ts';

interface HelperSource {
	uses: string[];
	source: string;
}

/**
 * The end of the error of a compiled node that reached the largest size of a stored file of
 * the runtime (`(limit: binary-max-file)`) after it sent only GET requests.
 */
export const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';

const HELPERS: Record<string, HelperSource> = {
	// Helpers of native Code node steps (`code-native/`).
	...CODE_HELPERS,
	// Helpers of n8n's expression extensions (`extension-helpers.ts`).
	...EXTENSION_HELPER_SOURCES,
	pathOf: {
		uses: [],
		source: `/** Splits a lodash-style path such as \`a.b[0].c\` into keys. */
function pathOf(path: string): string[] {
	const keys: string[] = [];
	if (path.indexOf('[') < 0 && path.indexOf(']') < 0) {
		if (path.indexOf('.') < 0) return path === '' ? [] : [path];
		for (const part of path.split('.')) if (part !== '') keys.push(part);
		return keys;
	}
	const size = path.length;
	// A quote that has no end from one start has no end from a later start.
	let openDouble = false;
	let openSingle = false;
	let start = 0;
	let k = 0;
	while (k < size) {
		const c = path.charCodeAt(k);
		if (c === 91 && k + 1 < size) {
			const quote = path.charCodeAt(k + 1);
			if ((quote === 34 && !openDouble) || (quote === 39 && !openSingle)) {
				// A quoted key, as lodash reads it: \`['a.b [c]']\` is the key \`a.b [c]\`.
				let text = '';
				let from = k + 2;
				let end = -1;
				let j = from;
				while (j < size) {
					const d = path.charCodeAt(j);
					if (d === 92 && j + 1 < size) {
						text += path.slice(from, j);
						from = j + 1;
						j += 2;
					} else if (d === quote && j + 1 < size && path.charCodeAt(j + 1) === 93) {
						end = j + 1;
						break;
					} else {
						j++;
					}
				}
				if (end !== -1) {
					if (start < k) keys.push(path.slice(start, k));
					keys.push(text + path.slice(from, end - 1));
					k = end + 1;
					start = k;
					continue;
				}
				if (quote === 34) openDouble = true;
				else openSingle = true;
			}
		}
		if (c === 46 || c === 91 || c === 93) {
			if (start < k) keys.push(path.slice(start, k));
			start = k + 1;
		}
		k++;
	}
	if (start < size) keys.push(path.slice(start, size));
	return keys;
}`,
	},
	getKeys: {
		uses: [],
		source: `/** As \`getPath\`, with the keys of the path (\`pathOf\`) from the caller. */
function getKeys(value: Json, path: string, keys: string[]): Json {
	if (value != null && typeof value === 'object' && value[path] !== undefined) return value[path];
	let current = value;
	for (const key of keys) {
		if (current == null) return undefined;
		current = current[key];
	}
	return current;
}`,
	},
	setKeys: {
		uses: [],
		source: `/** As \`setPath\`, with the keys of the path (\`pathOf\`) from the caller. */
function setKeys(target: Json, path: string, keys: string[], value: Json): void {
	if (target[path] !== undefined) {
		target[path] = value;
		return;
	}
	let current = target;
	for (let k = 0; k < keys.length - 1; k++) {
		const key = keys[k];
		if (current[key] == null || typeof current[key] !== 'object') {
			const next = keys[k + 1];
			current[key] = String(Number(next)) === next ? [] : {};
		}
		current = current[key];
	}
	current[keys[keys.length - 1]] = value;
}`,
	},
	unsetKeys: {
		uses: [],
		source: `/** As \`unsetPath\`, with the keys of the path (\`pathOf\`) from the caller. */
function unsetKeys(target: Json, keys: string[]): void {
	let current = target;
	for (let k = 0; k < keys.length - 1; k++) {
		current = current[keys[k]];
		if (current == null || typeof current !== 'object') return;
	}
	delete current[keys[keys.length - 1]];
}`,
	},
	getPath: {
		uses: ['pathOf'],
		source: `/** Reads a value by path, as lodash \`get\`. */
function getPath(value: Json, path: string): Json {
	// As lodash: a key that the object has is not split.
	if (value != null && typeof value === 'object' && value[path] !== undefined) return value[path];
	let current = value;
	for (const key of pathOf(path)) {
		if (current == null) return undefined;
		current = current[key];
	}
	return current;
}`,
	},
	setPath: {
		uses: ['pathOf'],
		source: `/** Writes a value by path and creates missing objects and arrays, as lodash \`set\`. */
function setPath(target: Json, path: string, value: Json): void {
	// As lodash: a key that the object has is not split.
	if (target[path] !== undefined) {
		target[path] = value;
		return;
	}
	const keys = pathOf(path);
	let current = target;
	for (let k = 0; k < keys.length - 1; k++) {
		const key = keys[k];
		if (current[key] == null || typeof current[key] !== 'object') {
			const next = keys[k + 1];
			current[key] = String(Number(next)) === next ? [] : {};
		}
		current = current[key];
	}
	current[keys[keys.length - 1]] = value;
}`,
	},
	unsetPath: {
		uses: ['pathOf'],
		source: `/** Deletes a value by path, as lodash \`unset\`. */
function unsetPath(target: Json, path: string): void {
	const keys = pathOf(path);
	let current = target;
	for (let k = 0; k < keys.length - 1; k++) {
		current = current[keys[k]];
		if (current == null || typeof current !== 'object') return;
	}
	delete current[keys[keys.length - 1]];
}`,
	},
	copyJson: {
		uses: [],
		source: `/** A deep copy of a JSON value. */
function copyJson(value: Json): Json {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}`,
	},
	parseRawJson: {
		uses: [],
		source: `/**
 * The JSON output of the Set node in raw mode. v1 parses it with \`repairJSON\`: when plain
 * JSON fails, a bare \`undefined\` outside strings becomes null, as \`jsonrepair\` does.
 */
function parseRawJson(text: string): Json {
	try {
		return JSON.parse(text);
	} catch (error) {
		let out = '';
		let quote = false;
		let k = 0;
		while (k < text.length) {
			const ch = text.charAt(k);
			if (quote) {
				out += ch;
				if (ch === '\\\\' && k + 1 < text.length) {
					out += text.charAt(k + 1);
					k += 2;
					continue;
				}
				if (ch === '"') quote = false;
				k++;
				continue;
			}
			if (ch === '"') quote = true;
			if (text.slice(k, k + 9) === 'undefined') {
				out += 'null';
				k += 9;
				continue;
			}
			out += ch;
			k++;
		}
		try {
			return JSON.parse(out);
		} catch (error2) {
			throw error;
		}
	}
}`,
	},
	toText: {
		uses: [],
		source: `/** Text of a value in a JSON template: objects as JSON, other values as String(). */
function toText(value: Json): string {
	return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
}`,
	},
	jsonValue: {
		uses: [],
		source: `/** Parses a string as JSON and keeps any other value. */
function jsonValue(value: Json): Json {
	return typeof value === 'string' ? JSON.parse(value) : value;
}`,
	},
	asString: {
		uses: [],
		source: `/** The string rule of the Set node: objects become JSON, null stays null. */
function asString(value: Json): Json {
	if (value == null) return null;
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}`,
	},
	describeValue: {
		uses: [],
		source: `/** A value as v1's \`getValueDescription\` names it in an error message. */
function describeValue(value: Json): string {
	if (value === null) return "'null'";
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object') return 'object';
	return "'" + String(value) + "'";
}`,
	},
	setTypeError: {
		uses: ['describeValue'],
		source: `/**
 * The error of a Set field whose value fails the type conversion. The text is the one of v1
 * (\`validateEntry\`), also the item index at its end.
 */
function setTypeError(value: Json, type: string, name: string, index: number): never {
	throw new Error(
		"'" + name + "' expects a " + type + ' but we got ' + describeValue(value) + ' [item ' + index + ']',
	);
}`,
	},
	asNumber: {
		uses: ['setTypeError'],
		source: `/**
 * The number rule of the Set node. A value that is not a number is an error, or with
 * \`ignore\` the value stays as it is.
 */
function asNumber(value: Json, name: string, index: number, ignore?: boolean): Json {
	if (value == null) return null;
	// A Date of a v1 node (a database timestamp) is a Date in v1, and \`Number(date)\` is its time.
	// It reaches us as the text that \`Date.toJSON\` gives: only that exact form is read as a date.
	if (typeof value === 'string' && value.length === 24) {
		// YYYY-MM-DDTHH:MM:SS.sssZ, checked by position (no regular expressions in workflows).
		const marks = '----------T--:--:--.---Z';
		let date = true;
		for (let i = 0; i < 24 && date; i++) {
			const c = value[i];
			const want = marks[i];
			date = want === '-' && i !== 4 && i !== 7 ? c >= '0' && c <= '9' : c === want;
		}
		if (date) {
			const time = Date.parse(value);
			if (!isNaN(time)) return time;
		}
	}
	const n = Number(value);
	// An empty string is 0, as n8n's Set node 3.4 gives it (\`Number('')\`).
	if (isNaN(n)) return ignore === true ? value : setTypeError(value, 'number', name, index);
	return n;
}`,
	},
	asBoolean: {
		uses: ['setTypeError'],
		source: `/**
 * The boolean rule of the Set node and of loose filter conditions. A value that is not a
 * boolean is an error, or with \`ignore\` the value stays as it is.
 */
function asBoolean(value: Json, name: string, index: number, ignore?: boolean): Json {
	if (value == null) return null;
	if (typeof value === 'boolean') return value;
	// tryToParseBoolean of n8n-workflow: "true" or "false" in any case, else a number 0 or 1.
	if (typeof value === 'string') {
		const lower = value.toLowerCase();
		if (lower === 'true') return true;
		if (lower === 'false') return false;
	}
	if (!(typeof value === 'string' && value.trim() === '')) {
		const n = Number(value);
		if (n === 0) return false;
		if (n === 1) return true;
	}
	return ignore === true ? value : setTypeError(value, 'boolean', name, index);
}`,
	},
	looseBoolean: {
		uses: ['asBoolean'],
		source: `/**
 * A boolean operand of a loose filter condition, as n8n's \`parseSingleFilterValue\`:
 * version 2 parses the value and else takes its truth; version 1 takes its truth.
 */
function looseBoolean(value: Json, parse: boolean): Json {
	if (value == null) return value;
	if (parse) {
		try {
			return asBoolean(value, '', 0);
		} catch (error) {
			return Boolean(value);
		}
	}
	return Boolean(value);
}`,
	},
	asJson: {
		uses: ['parseJsLiteral', 'setTypeError'],
		source: `/**
 * The array and object rule of the Set node (\`validateFieldType\`). A text is parsed as JSON.
 * An object also reads a JavaScript object literal (\`jsonParse\` with \`acceptJSObject\`), and an
 * array also reads JSON with single quotes. With \`ignore\` a value that fails the conversion
 * stays as it is.
 */
function asJson(value: Json, kind: string, name: string, index: number, ignore?: boolean): Json {
	if (value == null) return null;
	const fail = (): Json =>
		ignore === true ? value : setTypeError(value, kind, name, index);
	if (kind === 'array') {
		if (Array.isArray(value)) return value;
		let parsed: Json = null;
		try {
			parsed = JSON.parse(String(value));
		} catch (error) {
			try {
				parsed = JSON.parse(String(value).replaceAll("'", '"'));
			} catch (error2) {
				return fail();
			}
		}
		return Array.isArray(parsed) ? parsed : fail();
	}
	if (typeof value === 'object' && !Array.isArray(value)) return value;
	let parsed: Json = null;
	try {
		parsed = JSON.parse(String(value));
	} catch (error) {
		parsed = parseJsLiteral(String(value));
	}
	return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : fail();
}`,
	},
	parseJsLiteral: {
		uses: [],
		source: `/**
 * A JavaScript object literal as n8n's \`parseJSObject\` reads it: quoted or bare keys,
 * single or double quotes, trailing commas. A bare word as a value gives its name. Null
 * when the text is not an object literal.
 */
function parseJsLiteral(text: string): Json {
	let at = 0;
	let bad = false;
	const space = (): void => {
		while (at < text.length && ' \\t\\n\\r'.includes(text.charAt(at))) at++;
	};
	const word = (): string => {
		const start = at;
		while (at < text.length && 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$.+-'.includes(text.charAt(at))) at++;
		if (at === start) bad = true;
		return text.slice(start, at);
	};
	const quoted = (): string => {
		const q = text.charAt(at);
		at++;
		let out = '';
		while (at < text.length && text.charAt(at) !== q) {
			let ch = text.charAt(at);
			if (ch === '\\\\') {
				at++;
				const e = text.charAt(at);
				ch = e === 'n' ? '\\n' : e === 't' ? '\\t' : e === 'r' ? '\\r' : e;
			}
			out += ch;
			at++;
		}
		if (at >= text.length) bad = true;
		at++;
		return out;
	};
	const value = (depth: number): Json => {
		space();
		if (depth > 64) {
			bad = true;
			return null;
		}
		const ch = text.charAt(at);
		if (ch === '{') {
			at++;
			const obj: Json = {};
			space();
			while (!bad && at < text.length && text.charAt(at) !== '}') {
				const k = text.charAt(at) === '"' || text.charAt(at) === "'" ? quoted() : word();
				space();
				if (text.charAt(at) !== ':') {
					bad = true;
					break;
				}
				at++;
				obj[k] = value(depth + 1);
				space();
				if (text.charAt(at) === ',') {
					at++;
					space();
				} else if (text.charAt(at) !== '}') bad = true;
			}
			if (text.charAt(at) !== '}') bad = true;
			at++;
			return obj;
		}
		if (ch === '[') {
			at++;
			const list: Json[] = [];
			space();
			while (!bad && at < text.length && text.charAt(at) !== ']') {
				list.push(value(depth + 1));
				space();
				if (text.charAt(at) === ',') {
					at++;
					space();
				} else if (text.charAt(at) !== ']') bad = true;
			}
			if (text.charAt(at) !== ']') bad = true;
			at++;
			return list;
		}
		if (ch === '"' || ch === "'") return quoted();
		const w = word();
		if (w === 'true') return true;
		if (w === 'false') return false;
		if (w === 'null') return null;
		if (w === 'undefined') return null;
		const n = Number(w);
		return w !== '' && !isNaN(n) ? n : w;
	};
	space();
	if (text.charAt(at) !== '{') return null;
	const result = value(0);
	space();
	return bad || at < text.length ? null : result;
}`,
	},
	assignFields: {
		uses: ['setPath'],
		source: `/** Writes each field of \`fields\` into \`target\`; with dot notation, by path. */
function assignFields(target: Json, fields: Json, dotNotation: boolean): Json {
	for (const key of Object.keys(fields)) {
		if (dotNotation) setPath(target, key, fields[key]);
		else target[key] = fields[key];
	}
	return target;
}`,
	},
	deepMerge: {
		uses: ['copyJson'],
		source: `/** Merges objects into a new object, as lodash \`merge\`: later objects win, nested objects merge. */
function deepMerge(objects: Json[]): Json {
	const out: Json = {};
	for (const source of objects) mergeInto(out, source);
	return out;
}

function mergeInto(target: Json, source: Json): void {
	if (source == null) return;
	for (const key of Object.keys(source)) {
		const value = source[key];
		if (value === undefined) continue;
		const current = target[key];
		if (
			typeof value === 'object' &&
			value !== null &&
			typeof current === 'object' &&
			current !== null &&
			Array.isArray(value) === Array.isArray(current)
		) {
			mergeInto(current, value);
		} else {
			target[key] = copyJson(value);
		}
	}
}`,
	},
	shallowMerge: {
		uses: [],
		source: `/** Merges objects into a new object; later objects win per top-level key. */
function shallowMerge(objects: Json[]): Json {
	const out: Json = {};
	for (const source of objects) {
		if (source == null) continue;
		for (const key of Object.keys(source)) out[key] = source[key];
	}
	return out;
}`,
	},
	withSuffix: {
		uses: [],
		source: `/** Adds \`_<suffix>\` to each top-level key, as the Merge node does to resolve clashes. */
function withSuffix(item: Json, suffix: string): Json {
	const out: Json = {};
	for (const key of Object.keys(item)) out[\`\${key}_\${suffix}\`] = item[key];
	return out;
}`,
	},
	sameJson: {
		uses: [],
		source: `/** Compares two JSON values by their text. */
function sameJson(a: Json, b: Json): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}`,
	},
	mergeByPosition: {
		uses: ['deepMerge', 'shallowMerge', 'withSuffix'],
		source: `/** The Merge node, mode "Combine by position". */
function mergeByPosition(
	inputs: Json[][],
	preferred: number,
	addSuffix: boolean,
	deep: boolean,
	includeUnpaired: boolean,
): Json[] {
	const lists = inputs.map((list, k) => (addSuffix ? list.map((item) => withSuffix(item, String(k + 1))) : list));
	let count = includeUnpaired ? 0 : lists[preferred].length;
	for (const list of lists) {
		count = includeUnpaired ? Math.max(count, list.length) : Math.min(count, list.length);
	}
	const out: Json[] = [];
	for (let k = 0; k < count; k++) {
		const parts: Json[] = lists.map((list) => list[k] ?? {});
		parts.push(lists[preferred][k] ?? {});
		out.push(deep ? deepMerge(parts) : shallowMerge(parts));
	}
	return out;
}`,
	},
	mergeByFields: {
		uses: ['pathOf', 'getKeys', 'deepMerge', 'shallowMerge', 'withSuffix', 'sameJson'],
		source: `/** The Merge node, mode "Combine by matching fields". */
function mergeByFields(
	input1: Json[],
	input2: Json[],
	fields: string[][],
	options: Json,
): Json[] {
	const join: string = options.joinMode;
	const from: string = options.outputDataFrom;
	const dotNotation: boolean = options.dotNotation;
	const paths: string[][][] = fields.map((pair) => (dotNotation ? [pathOf(pair[0]), pathOf(pair[1])] : []));
	const read = (item: Json, f: number, side: number) =>
		dotNotation ? getKeys(item, fields[f][side], paths[f][side]) : item[fields[f][side]];
	if (input1.length === 0 || input2.length === 0) {
		if (input1.length === 0 && join === 'keepNonMatches' && from === 'input1') return [];
		if (input2.length === 0 && join === 'keepNonMatches' && from === 'input2') return [];
		if (join === 'keepMatches') return [];
		if (join === 'enrichInput1' && input1.length === 0) return [];
		if (join === 'enrichInput2' && input2.length === 0) return [];
		return input1.concat(input2);
	}
	const matched: Json[] = [];
	const unmatched1: Json[] = [];
	const used: boolean[] = input2.map(() => false);
	for (const entry of input1) {
		const lookup: Json[] = fields.map((pair, f) => read(entry, f, 0));
		if (lookup.some((v) => v === undefined)) {
			unmatched1.push(entry);
			continue;
		}
		const matches: Json[] = [];
		for (let k = 0; k < input2.length; k++) {
			const other = input2[k];
			let equal = true;
			for (let f = 0; f < fields.length; f++) {
				if (!sameJson(lookup[f], read(other, f, 1))) equal = false;
			}
			if (equal) {
				matches.push(other);
				used[k] = true;
				if (options.firstMatchOnly) break;
			}
		}
		if (matches.length === 0) {
			unmatched1.push(entry);
		} else if (from === 'both' || join === 'enrichInput1' || join === 'enrichInput2') {
			for (const m of matches) matched.push({ entry, matches: [m] });
		} else {
			matched.push({ entry, matches });
		}
	}
	const matched2 = input2.filter((_, k) => used[k]);
	const unmatched2 = input2.filter((_, k) => !used[k]);
	const combine = (list: Json[]) => (options.deep ? deepMerge(list) : shallowMerge(list));
	const mergeMatched = (): Json[] =>
		matched.map((m) => {
			const clash: string = options.resolveClash ?? (join === 'enrichInput2' ? 'preferInput1' : 'preferLast');
			if (clash === 'addSuffix') {
				return combine([withSuffix(m.entry, '1')].concat(m.matches.map((x: Json) => withSuffix(x, '2'))));
			}
			if (clash === 'preferInput1') {
				return combine(m.matches.concat([m.entry]));
			}
			return combine([m.entry].concat(m.matches));
		});
	const suffix = (list: Json[], s: string) =>
		options.resolveClash === 'addSuffix' ? list.map((x) => withSuffix(x, s)) : list;
	if (join === 'keepMatches' || join === 'keepEverything') {
		let output: Json[] = [];
		if (from === 'input1') output = matched.map((m) => m.entry);
		if (from === 'input2') output = matched2;
		if (from === 'both') output = mergeMatched();
		if (join === 'keepEverything') {
			output = output.concat(suffix(unmatched1, '1'), suffix(unmatched2, '2'));
		}
		return output;
	}
	if (join === 'keepNonMatches') {
		if (from === 'input1') return unmatched1;
		if (from === 'input2') return unmatched2;
		return unmatched1
			.map((x) => Object.assign({}, x, { _source: 'input1' }))
			.concat(unmatched2.map((x) => Object.assign({}, x, { _source: 'input2' })));
	}
	if (join === 'enrichInput1') return mergeMatched().concat(suffix(unmatched1, '1'));
	return mergeMatched().concat(suffix(unmatched2, '2'));
}`,
	},
	allCombinations: {
		uses: ['deepMerge', 'shallowMerge', 'withSuffix'],
		source: `/** The Merge node, mode "All possible combinations". */
function allCombinations(input1: Json[], input2: Json[], clash: string, deep: boolean): Json[] {
	const out: Json[] = [];
	for (const a of input1) {
		for (const b of input2) {
			let parts: Json[] = [a, b];
			if (clash === 'addSuffix') parts = [withSuffix(a, '1'), withSuffix(b, '2')];
			else if (clash === 'preferInput1') parts = [b, a];
			out.push(deep ? deepMerge(parts) : shallowMerge(parts));
		}
	}
	return out;
}`,
	},
	lessThan: {
		uses: [],
		source: `/** Orders two values as lodash \`lt\`. */
function lessThan(a: Json, b: Json): boolean {
	if (typeof a === 'string' && typeof b === 'string') return a < b;
	return Number(a) < Number(b);
}`,
	},
	sortItems: {
		uses: ['pathOf', 'getKeys', 'lessThan', 'sameJson'],
		source: `/** The Sort node, type "Simple": a stable sort; strings compare in lower case. */
function sortItems(items: Json[], fields: Json[][], dotNotation: boolean): Json[] {
	const paths: string[][] = fields.map((field) => (dotNotation ? pathOf(field[0]) : []));
	const read = (item: Json, k: number) => {
		const name: string = fields[k][0];
		const v = dotNotation ? getKeys(item, name, paths[k]) : item[name];
		return typeof v === 'string' ? v.toLowerCase() : v;
	};
	return items.slice().sort((a, b) => {
		for (let k = 0; k < fields.length; k++) {
			const field = fields[k];
			const x = read(a, k);
			const y = read(b, k);
			if (!sameJson(x, y)) return (lessThan(x, y) ? -1 : 1) * field[1];
		}
		return 0;
	});
}`,
	},
	removeDuplicates: {
		uses: ['pathOf', 'getKeys', 'pathsOf'],
		source: `/** The Remove Duplicates node, operation "Remove items repeated within current input". */
function removeDuplicates(items: Json[], compare: string, fields: string[], dotNotation: boolean): Json[] {
	if (items.length === 0) return [];
	let keys: string[] = fields;
	if (compare !== 'selectedFields') {
		keys = [];
		for (const item of items) {
			for (const key of dotNotation ? pathsOf(item, '') : Object.keys(item)) {
				if (!keys.includes(key)) keys.push(key);
			}
		}
		if (compare === 'allFieldsExcept') keys = keys.filter((key) => !fields.includes(key));
	}
	// v1 \`validateInputData\` (node version 2): a null value is accepted, a missing value
	// or a value of a different type stops the node.
	const paths: string[][] = keys.map((key) => (dotNotation ? pathOf(key) : []));
	for (let k = 0; k < keys.length; k++) {
		const key = keys[k];
		if (key === '') throw new Error('Name of field to compare is blank');
		let type = '';
		for (const item of items) {
			const value = dotNotation ? getKeys(item, key, paths[k]) : item[key];
			if (value === null) continue;
			if (value === undefined) throw new Error(\`'\${key}' field is missing from some input items\`);
			if (type !== '' && type !== typeof value) throw new Error(\`'\${key}' isn't always the same type\`);
			type = typeof value;
		}
	}
	const seen: Record<string, boolean> = {};
	const out: Json[] = [];
	for (const item of items) {
		const id = JSON.stringify(keys.map((key, k) => (dotNotation ? getKeys(item, key, paths[k]) : item[key])));
		if (seen[id]) continue;
		seen[id] = true;
		out.push(item);
	}
	return out;
}`,
	},
	dedupeText: {
		uses: [],
		source: `/** \`value.toString()\` of a parameter value, as JavaScript gives it for JSON data. */
function dedupeText(value: Json): string {
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		return value.map((v: Json) => (v === null || v === undefined ? '' : dedupeText(v))).join(',');
	}
	if (typeof value === 'object') {
		if (Object.keys(value).includes('toString')) {
			throw new Error('this.getNodeParameter(...)?.toString is not a function');
		}
		return '[object Object]';
	}
	return String(value);
}`,
	},
	customDataValues: {
		uses: ['dedupeText'],
		source: `/**
 * The Execution Data node: the object that v1 gives to \`customData.setAll\` for one item.
 * A key is the text of its value, as a JavaScript object key. From version 1.1 a value
 * that is null or missing is the empty text. JSON has no \`undefined\`, \`NaN\` or infinity:
 * a missing value goes as null, which n8n refuses as v1 refuses \`undefined\`, and a number
 * that is not finite goes as the text that v1 stores.
 */
function customDataValues(pairs: Json[][], emptyForNull: boolean): Json {
	const out: Json = {};
	for (const pair of pairs) {
		const name = pair[0];
		const key = typeof name === 'string' ? name : name === null ? 'null' : name === undefined ? 'undefined' : dedupeText(name);
		if (key === '__proto__') continue;
		let value = pair[1];
		if (value === null || value === undefined) value = emptyForNull ? '' : value === undefined ? null : value;
		if (typeof value === 'number' && (isNaN(value) || value - value !== 0)) value = String(value);
		out[key] = value;
	}
	return out;
}`,
	},
	dedupeGroups: {
		uses: ['dedupeText'],
		source: `/**
 * The Remove Duplicates node, "Remove items processed in previous executions": the item
 * indexes of each key (\`itemMapping\` of v1). \`keys\` has the order of \`Object.keys\` of the
 * v1 object: the keys that are array indexes in rising order, then the other keys in the
 * order of their first item. The record has a prefix on each key, so no key meets a
 * property that every object has.
 */
function dedupeGroups(values: Json[], numeric: boolean): { keys: string[]; items: Record<string, number[]> } {
	const inherited = ['constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__', '__proto__'];
	const items: Record<string, number[]> = {};
	const indexes: string[] = [];
	const others: string[] = [];
	for (let i = 0; i < values.length; i++) {
		const value = values[i];
		const text = value === null || value === undefined ? '' : dedupeText(value);
		let key = text;
		if (numeric) {
			if (text === '') throw new Error('The \`Value to Dedupe\` On is empty. Please provide a value.');
			const parsed = typeof value === 'number' ? value : typeof value === 'boolean' ? (value ? 1 : 0) : typeof value === 'object' && !Array.isArray(value) ? Number("x") : Number(text);
			if (isNaN(parsed)) throw new Error(\`The value '\${text}' is not a number. Please provide a number.\`);
			key = String(parsed);
		} else if (inherited.includes(key)) {
			throw new Error('itemMapping[checkValue].push is not a function');
		}
		const slot = \`k\${key}\`;
		const list = items[slot];
		if (list !== undefined) {
			list.push(i);
			continue;
		}
		items[slot] = [i];
		let index = key.length > 0 && key.length <= 10 && (key === '0' || key[0] !== '0');
		for (let k = 0; index && k < key.length; k++) index = key[k] >= '0' && key[k] <= '9';
		if (index && Number(key) <= 4294967294) indexes.push(key);
		else others.push(key);
	}
	indexes.sort((a: string, b: string) => Number(a) - Number(b));
	return { keys: indexes.concat(others), items };
}`,
	},
	dedupePick: {
		uses: [],
		source: `/** The items of the keys that the deduplication service gave, in the order of the keys. */
function dedupePick(input: Json[], items: Record<string, number[]>, keys: Json[]): Json[] {
	const out: Json[] = [];
	for (const key of keys) {
		const list = items[\`k\${String(key)}\`];
		if (list === undefined) throw new Error('The deduplication service gave a key that the node did not send.');
		for (const i of list) out.push(input[i]);
	}
	return out;
}`,
	},
	pathsOf: {
		uses: [],
		source: `/** The leaf paths of an object, as \`a.b\` keys. */
function pathsOf(value: Json, prefix: string): string[] {
	const out: string[] = [];
	for (const key of Object.keys(value)) {
		const v = value[key];
		const path = prefix === '' ? key : \`\${prefix}.\${key}\`;
		if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
			for (const p of pathsOf(v, path)) out.push(p);
		} else {
			out.push(path);
		}
	}
	return out;
}`,
	},
	splitOut: {
		uses: ['pathOf', 'getKeys', 'setKeys', 'unsetKeys', 'copyJson'],
		source: `/** The Split Out node. */
function splitOut(
	items: Json[],
	fields: string[],
	destinations: string[],
	include: string,
	includeFields: string[],
	dotNotation: boolean,
): Json[] {
	const out: Json[] = [];
	// One field without a destination: the fields of an object element are the row.
	const spread = include === 'noOtherFields' && fields.length === 1 && destinations[0] === undefined;
	const byPath = dotNotation && destinations.length > 0;
	// The keys of each path, split one time for all items.
	const fieldKeys: string[][] = [];
	const nameKeys: string[][] = [];
	const includeKeys: string[][] = [];
	if (dotNotation) {
		for (let f = 0; f < fields.length; f++) {
			fieldKeys.push(pathOf(fields[f]));
			if (destinations.length > 0) nameKeys.push(pathOf(destinations[f] || fields[f]));
		}
		if (include === 'selectedOtherFields') {
			for (const field of includeFields) includeKeys.push(pathOf(field));
		}
	}
	for (const item of items) {
		const rows: Json[] = [];
		fields.forEach((field, f) => {
			const name = destinations[f] || field;
			let list = dotNotation ? getKeys(item, field, fieldKeys[f]) : item[field];
			if (list === undefined) list = [];
			if (typeof list !== 'object' || list === null) list = [list];
			if (!Array.isArray(list)) list = Object.values(list);
			list.forEach((element: Json, k: number) => {
				if (rows[k] === undefined) rows[k] = {};
				if (spread && typeof element === 'object' && element !== null) {
					rows[k] = Object.assign({}, rows[k], element);
				} else if (byPath) {
					setKeys(rows[k], name, nameKeys[f], copyJson(element));
				} else {
					rows[k][name] = element;
				}
			});
		});
		for (const row of rows) {
			if (include === 'allOtherFields') {
				const rest = copyJson(item);
				// The JSON of an item of v1 has no binary data (the key \`$binary\`, spec 10).
				if (rest.$binary !== undefined) delete rest.$binary;
				for (let f = 0; f < fields.length; f++) {
					if (dotNotation) unsetKeys(rest, fieldKeys[f]);
					else delete rest[fields[f]];
				}
				out.push(Object.assign({}, rest, row));
			} else if (include === 'selectedOtherFields') {
				for (let f = 0; f < includeFields.length; f++) {
					const field = includeFields[f];
					row[field] = dotNotation ? getKeys(item, field, includeKeys[f]) : item[field];
				}
				out.push(row);
			} else {
				out.push(row);
			}
		}
	}
	return out;
}`,
	},
	splitOutFiles: {
		uses: ['pathOf', 'getKeys', 'setKeys', 'unsetKeys', 'copyJson'],
		source: `/**
 * The Split Out node with binary data (\`splitOut\` is the node without it). The field \`$binary\` splits the binary data of an item: each file is
 * the binary data of one row. \`binary\` is the option "Include Binary": a row without
 * binary data of its own gets the binary data of the item. Without it a row has no binary
 * data of the item (compiled code keeps it in the key \`$binary\` of the JSON, spec 10).
 */
function splitOutFiles(
	items: Json[],
	fields: string[],
	destinations: string[],
	include: string,
	includeFields: string[],
	dotNotation: boolean,
	binary: boolean,
): Json[] {
	const out: Json[] = [];
	// One field without a destination: the fields of an object element are the row.
	const spread = include === 'noOtherFields' && fields.length === 1 && destinations[0] === undefined;
	const byPath = dotNotation && destinations.length > 0;
	// The keys of each path, split one time for all items.
	const fieldKeys: string[][] = [];
	const nameKeys: string[][] = [];
	const includeKeys: string[][] = [];
	if (dotNotation) {
		for (let f = 0; f < fields.length; f++) {
			fieldKeys.push(pathOf(fields[f]));
			if (destinations.length > 0) nameKeys.push(pathOf(destinations[f] || fields[f]));
		}
		if (include === 'selectedOtherFields') {
			for (const field of includeFields) includeKeys.push(pathOf(field));
		}
	}
	const files = fields.includes('$binary');
	for (const item of items) {
		const rows: Json[] = [];
		fields.forEach((field, f) => {
			if (files && field === '$binary') {
				const map: Json = item.$binary ?? {};
				Object.keys(map).forEach((key: string, k: number) => {
					if (rows[k] === undefined) rows[k] = {};
					rows[k].$binary = Object.assign({}, rows[k].$binary, { [key]: map[key] });
				});
				return;
			}
			const name = destinations[f] || field;
			let list = dotNotation ? getKeys(item, field, fieldKeys[f]) : item[field];
			if (list === undefined) list = [];
			if (typeof list !== 'object' || list === null) list = [list];
			if (!Array.isArray(list)) list = Object.values(list);
			list.forEach((element: Json, k: number) => {
				if (rows[k] === undefined) rows[k] = {};
				if (spread && typeof element === 'object' && element !== null) {
					rows[k] = Object.assign({}, rows[k], element);
				} else if (byPath) {
					setKeys(rows[k], name, nameKeys[f], copyJson(element));
				} else {
					rows[k][name] = element;
				}
			});
		});
		for (const row of rows) {
			let result: Json = row;
			if (include === 'allOtherFields') {
				const rest = copyJson(item);
				if (rest.$binary !== undefined) delete rest.$binary;
				for (let f = 0; f < fields.length; f++) {
					if (files && fields[f] === '$binary') continue;
					if (dotNotation) unsetKeys(rest, fieldKeys[f]);
					else delete rest[fields[f]];
				}
				result = Object.assign({}, rest, row);
			} else if (include === 'selectedOtherFields') {
				for (let f = 0; f < includeFields.length; f++) {
					const field = includeFields[f];
					row[field] = dotNotation ? getKeys(item, field, includeKeys[f]) : item[field];
				}
			}
			if (binary && item.$binary !== undefined && result.$binary === undefined) {
				result.$binary = item.$binary;
			}
			out.push(result);
		}
	}
	return out;
}`,
	},
	aggregateFields: {
		uses: ['pathOf', 'getKeys', 'setPath'],
		source: `/** The Aggregate node, mode "Individual fields". Each spec is [field, output name]. */
function aggregateFields(
	items: Json[],
	specs: string[][],
	dotNotation: boolean,
	mergeLists: boolean,
	keepMissing: boolean,
): Json {
	const out: Json = {};
	for (const spec of specs) {
		const values: Json[] = [];
		const keys: string[] = dotNotation ? pathOf(spec[0]) : [];
		for (const item of items) {
			let value = dotNotation ? getKeys(item, spec[0], keys) : item[spec[0]];
			if (!keepMissing) {
				if (Array.isArray(value)) value = value.filter((v: Json) => v !== null);
				else if (value == null) continue;
			}
			if (Array.isArray(value) && mergeLists) {
				for (const v of value) values.push(v);
			} else {
				values.push(value);
			}
		}
		if (dotNotation) setPath(out, spec[1], values);
		else out[spec[1]] = values;
	}
	return out;
}`,
	},
	pickFields: {
		uses: [],
		source: `/** Keeps or drops top-level fields of each item; items left empty drop out. */
function pickFields(items: Json[], include: string[], exclude: string[]): Json[] {
	const out: Json[] = [];
	for (const item of items) {
		const picked: Json = {};
		for (const key of Object.keys(item)) {
			if (exclude.includes(key)) continue;
			if (include.length > 0 && !include.includes(key)) continue;
			picked[key] = item[key];
		}
		if (Object.keys(picked).length > 0) out.push(picked);
	}
	return out;
}`,
	},
	shuffle: {
		uses: [],
		source: `/** A random order of the items, from \`ctx.random()\` values. */
function shuffle(items: Json[], randoms: number[]): Json[] {
	const out = items.slice();
	for (let k = out.length - 1; k > 0; k--) {
		const j = Math.floor(randoms[k] * (k + 1));
		const t = out[k];
		out[k] = out[j];
		out[j] = t;
	}
	return out;
}`,
	},
	firstItems: {
		uses: [],
		source: `/** The first input list with items, as v1 picks the items of a node with several inputs. */
function firstItems(inputs: Json[][]): Json[] {
	for (const list of inputs) {
		if (list.length > 0) return list;
	}
	return inputs[0] ?? [];
}`,
	},
	pickInputs: {
		uses: [],
		source: `/** Keeps the fields that an Execute Workflow Trigger defines; a missing field is null. */
function pickInputs(items: Json[], fields: string[]): Json[] {
	return items.map((item: Json) => {
		const out: Json = {};
		for (const name of fields) out[name] = name in item ? item[name] : null;
		return out;
	});
}`,
	},
	omitKeys: {
		uses: [],
		source: `/** Drops top-level fields of each item. */
function omitKeys(items: Json[], keys: string[]): Json[] {
	return items.map((item: Json) => {
		const out: Json = {};
		for (const key of Object.keys(item)) {
			if (!keys.includes(key)) out[key] = item[key];
		}
		return out;
	});
}`,
	},
	splitInBatches: {
		uses: [],
		source: `/**
 * One run of Loop Over Items (Split in Batches), as the \`execute\` method of
 * versions 1, 2 and 3. \`state\` is the node context. Version 1 gives null
 * when no item is left.
 */
function splitInBatches(
	state: Json,
	input: Json[],
	batchSize: number,
	reset: boolean,
	version: number,
): Json[][] | null {
	let batch: Json[];
	if (state.items === undefined || reset) {
		state.currentRunIndex = 0;
		state.maxRunIndex = Math.ceil(input.length / batchSize);
		batch = input.slice(0, batchSize);
		state.items = input.slice(batchSize);
		if (version >= 2) state.processedItems = [];
	} else {
		state.currentRunIndex = state.currentRunIndex + 1;
		batch = state.items.slice(0, batchSize);
		state.items = state.items.slice(batchSize);
		if (version >= 2) state.processedItems = [...state.processedItems, ...input];
	}
	state.noItemsLeft = state.items.length === 0;
	if (version < 2) return batch.length === 0 ? null : [batch];
	state.done = batch.length === 0;
	if (version < 3) return state.done ? [[], state.processedItems] : [batch, []];
	return state.done ? [state.processedItems, []] : [[], batch];
}`,
	},
	v1Start: {
		uses: [],
		source: `/**
 * The v1 run stack of n8n (\`WorkflowExecute\`, execution order v1). \`graph\` has the
 * children of each node in the order that v1 adds them, the input count of
 * nodes with several inputs, their ancestors and their required inputs.
 */
function v1Start(graph: Json, trigger: string, items: Json[]): Json {
	return {
		graph,
		stack: [{ node: trigger, inputs: [items], source: null }],
		waiting: {},
		runs: {},
		lastNode: null,
		lastRuns: [],
	};
}`,
	},
	v1Next: {
		uses: ['v1Waiting'],
		source: `/** The next node run: the front of the stack, else a node that waits for an input. */
function v1Next(engine: Json): Json {
	if (engine.stack.length === 0) v1Waiting(engine);
	if (engine.stack.length === 0) return null;
	const job = engine.stack.shift();
	job.runIndex = engine.runs[job.node] ?? 0;
	return job;
}`,
	},
	v1Waiting: {
		uses: [],
		source: `/**
 * When the stack is empty, moves the first waiting node that may run with the
 * inputs it has to the stack (\`addWaitingNodeToEmptyStack\`).
 */
function v1Waiting(engine: Json): void {
	const graph = engine.graph;
	let names = Object.keys(engine.waiting);
	for (let k = 0; k < names.length; k++) {
		const name = names[k];
		const required = graph.required[name];
		if (required === 'all') continue;
		const ancestors: string[] = graph.ancestors[name] ?? [];
		if (ancestors.some((a: string) => names.includes(a))) continue;
		const byRun = engine.waiting[name];
		const first = Object.keys(byRun).sort()[0];
		const entry = byRun[first];
		let withData = 0;
		for (const list of entry.inputs) {
			if (list !== null) withData++;
		}
		if (typeof required === 'number' && withData < required) continue;
		const inputs = entry.inputs.map((list: Json) => (list === null ? [] : list));
		const hasItems = inputs.some((list: Json[]) => list.length > 0);
		if (hasItems) engine.stack.push({ node: name, inputs, source: entry.source });
		delete byRun[first];
		if (Object.keys(byRun).length === 0) delete engine.waiting[name];
		if (hasItems) return;
		names = Object.keys(engine.waiting);
		k = -1;
	}
}`,
	},
	v1Add: {
		uses: [],
		source: `/** Puts a child on the stack, or into the waiting list of a node with several inputs (\`addNodeToBeExecuted\`). */
function v1Add(engine: Json, node: string, input: number, items: Json[], source: Json): void {
	const count = engine.graph.inputs[node] ?? 1;
	if (count > 1) {
		if (engine.waiting[node] === undefined) engine.waiting[node] = {};
		const byRun = engine.waiting[node];
		let index = -1;
		for (const key of Object.keys(byRun)) {
			if (byRun[key].inputs[input] === null) {
				index = Number(key);
				break;
			}
		}
		if (index < 0) {
			index = Object.keys(byRun).length;
			const inputs: Json[] = [];
			const sources: Json[] = [];
			for (let k = 0; k < count; k++) {
				inputs.push(null);
				sources.push(null);
			}
			byRun[index] = { inputs, source: sources };
		}
		const entry = byRun[index];
		entry.inputs[input] = items;
		entry.source[input] = source;
		if (entry.inputs.includes(null)) return;
		engine.stack.unshift({ node, inputs: entry.inputs, source: entry.source });
		delete byRun[index];
		if (Object.keys(byRun).length === 0) delete engine.waiting[node];
		return;
	}
	const inputs: Json[] = [];
	for (let k = 0; k < input; k++) inputs.push(null);
	inputs.push(items);
	engine.stack.unshift({ node, inputs, source: [source] });
}`,
	},
	v1Done: {
		uses: ['v1Add'],
		source: `/**
 * Records a node run and adds its children. A null output ends the branch:
 * v1 does not record the run.
 */
function v1Done(engine: Json, job: Json, out: Json[][] | null): void {
	if (out === null) return;
	const name: string = job.node;
	const runs = engine.runs;
	const runIndex = runs[name] ?? 0;
	runs[name] = runIndex + 1;
	if (engine.lastNode === name) engine.lastRuns.push(out);
	else {
		engine.lastNode = name;
		engine.lastRuns = [out];
	}
	const children = engine.graph.children[name] ?? [];
	for (const [output, node, input] of children) {
		const items = out[output];
		if (items === undefined || items === null || items.length === 0) continue;
		v1Add(engine, node, input, items, {
			previousNode: name,
			previousNodeOutput: output,
			previousNodeRun: runIndex,
		});
	}
}`,
	},
	v1Result: {
		uses: [],
		source: `/** The outputs of the last node that ran: its last run, or all its runs joined by output. */
function v1Result(engine: Json, allRuns: boolean): Json[][] {
	const runs: Json[][][] = engine.lastRuns;
	if (runs.length === 0) return [[]];
	if (!allRuns) return runs[runs.length - 1];
	const out: Json[][] = [];
	for (const run of runs) {
		run.forEach((list: Json[], k: number) => {
			if (out[k] === undefined) out[k] = [];
			for (const item of list ?? []) out[k].push(item);
		});
	}
	return out;
}`,
	},
	resumeItem: {
		uses: [],
		source: `/**
 * The item that a Wait (webhook, form), Form or Chat node gives when n8n resumes it.
 * n8n sends the JSON body of the resume request. For a webhook wait v1 gives the
 * request \`{ headers, params, query, body }\`; a value that already has this shape stays.
 * For a form it gives the submitted fields. \`{ approved: false }\` alone means the time
 * limit ended the wait: the result is null. An \`{ approved, data }\` value gives \`data\`.
 */
function resumeItem(value: Json, mode: string): Json {
	let v = value;
	if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
		const keys = Object.keys(v);
		if (keys.length === 1 && v.approved === false) return null;
		if (v.data !== undefined && keys.every((k: string) => k === 'approved' || k === 'data')) v = v.data;
	}
	if (v === undefined) return null;
	if (mode !== 'webhook') return v;
	const request = v !== null && typeof v === 'object' && !Array.isArray(v) && 'body' in v && ('headers' in v || 'query' in v);
	if (request) return { headers: v.headers ?? {}, params: v.params ?? {}, query: v.query ?? {}, body: v.body };
	return { headers: {}, params: {}, query: {}, body: v };
}`,
	},
	scheduleItem: {
		uses: [],
		source: `/**
 * The item of the v1 Schedule Trigger: the scheduled time in the workflow time
 * zone, with the moment-timezone formats of the v1 node.
 */
function scheduleItem(at: number, zone: string): Json {
	const offset = Date.zoneOffset(zone, at);
	const d = new Date(at + offset * 60000);
	const pad = (n: number, width: number): string => String(n).padStart(width, '0');
	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const year = d.getUTCFullYear();
	const month = d.getUTCMonth();
	const day = d.getUTCDate();
	const hour = d.getUTCHours();
	const minute = d.getUTCMinutes();
	const second = d.getUTCSeconds();
	const abs = Math.abs(offset);
	const z = (offset < 0 ? '-' : '+') + pad(Math.floor(abs / 60), 2) + ':' + pad(abs % 60, 2);
	const tens = day % 100;
	const ordinal =
		tens >= 11 && tens <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
	const h12 = hour % 12 === 0 ? 12 : hour % 12;
	const time = String(h12) + ':' + pad(minute, 2) + ':' + pad(second, 2) + ' ' + (hour < 12 ? 'am' : 'pm');
	const yearText = year < 0 ? '-' + pad(-year, 4) : pad(year, 4);
	return {
		timestamp:
			yearText + '-' + pad(month + 1, 2) + '-' + pad(day, 2) + 'T' + pad(hour, 2) + ':' + pad(minute, 2) + ':' + pad(second, 2) + '.' + pad(d.getUTCMilliseconds(), 3) + z,
		'Readable date': months[month] + ' ' + String(day) + ordinal + ' ' + yearText + ', ' + time,
		'Readable time': time,
		'Day of week': days[d.getUTCDay()],
		Year: yearText,
		Month: months[month],
		'Day of month': pad(day, 2),
		Hour: pad(hour, 2),
		Minute: pad(minute, 2),
		Second: pad(second, 2),
		Timezone: zone + ' (UTC' + z + ')',
	};
}`,
	},
	nullToUndefined: {
		uses: [],
		source: `/** null as undefined, as n8n's resource mapper gives a null value of a typed field. */
function nullToUndefined(value: Json): Json {
	return value === null ? undefined : value;
}`,
	},
	moveErrorItems: {
		uses: [],
		source: `/**
 * Moves the error items of an output to the error output, as v1's handleNodeErrorOutput:
 * items whose keys are only error, message and details, with a truthy error. The item
 * merges into its input item (the only one, or the one at its position).
 */
function moveErrorItems(out: Json[], errors: Json[], input: Json[]): void {
	let kept = 0;
	const total = out.length;
	for (let i = 0; i < total; i++) {
		const item = out[i];
		const keys = Object.keys(item);
		let only = keys.length > 0;
		for (const key of keys) {
			if (key !== 'error' && key !== 'message' && key !== 'details') only = false;
		}
		if (only && item.error) {
			const source = input.length === 1 ? input[0] : input[i];
			errors.push(source !== undefined ? { ...source, ...item } : item);
		} else {
			out[kept] = item;
			kept++;
		}
	}
	while (out.length > kept) out.pop();
}`,
	},
	isErrorItem: {
		uses: [],
		source: `/**
 * True for an error item, as v1's handleNodeErrorOutput finds it: the keys are only error,
 * message and details, and error is truthy.
 */
function isErrorItem(item: Json): boolean {
	if (item === null || item === undefined || typeof item !== 'object' || !item.error) return false;
	for (const key of Object.keys(item)) {
		if (key !== 'error' && key !== 'message' && key !== 'details') return false;
	}
	return true;
}`,
	},
	mergedErrorItem: {
		uses: [],
		source: `/** An error item in the json of its input item. The files of the input item do not go with it. */
function mergedErrorItem(item: Json, input: Json): Json {
	const merged: Json = {};
	for (const key of Object.keys(input)) {
		if (key !== '$binary') merged[key] = input[key];
	}
	for (const key of Object.keys(item)) merged[key] = item[key];
	return merged;
}`,
	},
	splitErrorItems: {
		uses: ['isErrorItem', 'mergedErrorItem'],
		source: `/**
 * Moves the error items of a node run to the error output, as v1's handleNodeErrorOutput for
 * a node that pairs its error items with their input items: \`sources[k]\` is the input item
 * of \`result[k]\`. An item without json makes v1 fail there, as a node that throws.
 */
function splitErrorItems(result: Json[], sources: Json[], out: Json[], errors: Json[]): void {
	for (let k = 0; k < result.length; k++) {
		const item = result[k];
		if (item === null || item === undefined) throw new Error('An item of the node has no json.');
		if (isErrorItem(item)) errors.push(mergedErrorItem(item, sources[k]));
		else out.push(item);
	}
}`,
	},
	splitErrorItemsByPosition: {
		uses: ['isErrorItem', 'mergedErrorItem'],
		source: `/**
 * Moves the error items of a node run to the error output, for a node that does not pair its
 * error items. v1 (assignPairedItems) then pairs an error item by position: with the only
 * input item, with the input item at its position when the counts are equal, or with the
 * first input item when the node gives one item. In all other cases the item does not merge.
 */
function splitErrorItemsByPosition(result: Json[], input: Json[], out: Json[], errors: Json[]): void {
	for (let k = 0; k < result.length; k++) {
		const item = result[k];
		if (item === null || item === undefined) throw new Error('An item of the node has no json.');
		if (!isErrorItem(item)) {
			out.push(item);
			continue;
		}
		let source: Json = undefined;
		if (input.length === 1 || result.length === 1) source = input[0];
		else if (result.length === input.length) source = input[k];
		errors.push(source === undefined ? item : mergedErrorItem(item, source));
	}
}`,
	},
	pairedInputIndex: {
		uses: [],
		source: `/**
 * The index of the input item that v1 pairs with output item \`k\` of a node run: the paired
 * item that the node gave (\`pair\`), or v1's own pairing by position when the node gave none
 * (assignPairedItems). -1 when v1 finds no input item. A compiled node gives a number for the
 * paired item \`{ item: number }\`, and a list with the number for a paired item that is a number.
 */
function pairedInputIndex(pair: Json, k: number, inputCount: number, outputCount: number): number {
	if (typeof pair === 'number') return pair >= 0 && pair < inputCount && Math.floor(pair) === pair ? pair : -1;
	let found: Json = pair;
	if (found === null || found === undefined) {
		if (inputCount === 1 || outputCount === 1) return 0;
		return outputCount === inputCount ? k : -1;
	}
	if (Array.isArray(found)) found = found[0];
	if (found === null || found === undefined || typeof found !== 'object') return -1;
	if (found.input) throw new Error('The paired item of an error item is on an input that is not there.');
	const index: Json = found.item;
	return typeof index === 'number' && index >= 0 && index < inputCount && Math.floor(index) === index ? index : -1;
}`,
	},
	pairedSourceIndexes: {
		uses: [],
		source: `/**
 * The indexes of the input items that v1 pairs with output item \`k\` of a node run, as the
 * run data of v1 has them: the paired items that the node gave (\`pair\`), or v1's own pairing
 * by position when the node gave none (assignPairedItems).
 */
function pairedSourceIndexes(pair: Json, k: number, inputCount: number, outputCount: number): Json[] {
	if (pair === null || pair === undefined) {
		if (inputCount === 1 || outputCount === 1) return [0];
		return outputCount === inputCount ? [k] : [];
	}
	const list: Json[] = Array.isArray(pair) ? pair : [pair];
	const out: Json[] = [];
	for (const one of list) {
		if (typeof one === 'number') out.push(one);
		else if (one === null || one === undefined || typeof one !== 'object' || one.input || one.sourceOverwrite) throw new Error('A paired item of this form has no compiled form.');
		else out.push(one.item);
	}
	return out;
}`,
	},
	pairedSourceIndex: {
		uses: ['pairedSourceIndexes'],
		source: `/**
 * The index of the input item of output item \`k\` of a compiled node, for \`$('Node').item\`
 * in a later node. \`run\` is what the node gave: the items and the paired item of each item.
 * v1 fails when the item has no paired item, and when its paired items lead to different
 * items of the earlier node. \`direct\` is true when the input items of this node are the
 * items of that earlier node. If not, different paired items can lead to one item in v1, and
 * that case has no compiled form.
 */
function pairedSourceIndex(run: Json, k: number, inputCount: number, node: string, direct: boolean): number {
	let index = -1;
	for (const found of pairedSourceIndexes(run.paired[k], k, inputCount, run.items.length)) {
		if (index >= 0 && found !== index) throw new Error(direct ? 'Multiple matches found' : 'Several paired items of one item have no compiled form.');
		index = found;
	}
	if (typeof index !== 'number' || index < 0 || index >= inputCount || Math.floor(index) !== index) {
		throw new Error("Paired item data for item from node '" + node + "' is unavailable. Ensure '" + node + "' is providing the required output.");
	}
	return index;
}`,
	},
	splitPairedErrorItems: {
		uses: ['isErrorItem', 'mergedErrorItem', 'pairedInputIndex'],
		source: `/**
 * Moves the error items of one node run to the error output, as v1's handleNodeErrorOutput.
 * \`result\` is what a compiled node gives for all input items: the items, the paired item
 * of each item as the node gave it, and the positions of the items with an \`error\` property.
 * An error item merges into its input item when v1 finds that item. An item with an \`error\`
 * property has only the message of that error (normalizeNodeErrors), so it does not merge.
 */
function splitPairedErrorItems(result: Json, input: Json[], out: Json[], errors: Json[]): void {
	const items: Json[] = result.items;
	const failed: Json[] = result.failed;
	const anyFailed = failed.length > 0;
	for (let k = 0; k < items.length; k++) {
		const item = items[k];
		if (item === null || item === undefined) throw new Error('An item of the node has no json.');
		if (anyFailed && failed.includes(k)) {
			errors.push(item);
			continue;
		}
		if (typeof item !== 'object' || !item.error || !isErrorItem(item)) {
			out.push(item);
			continue;
		}
		const index = pairedInputIndex(result.paired[k], k, input.length, items.length);
		errors.push(index < 0 ? item : mergedErrorItem(item, input[index]));
	}
}`,
	},
	fileLimitInHost: {
		uses: [],
		source: `/**
 * True for the error of a compiled node that reached the largest size of a stored file of
 * the runtime, after it sent only GET requests. v1 has no such limit: the fallback host
 * runs the node.
 */
function fileLimitInHost(error: Json): boolean {
	return error != null && typeof error.message === 'string' && error.message.includes(${JSON.stringify(RUNS_IN_HOST)});
}`,
	},
	retryError: {
		uses: [],
		source: `/** True when an output item has an error, as v1's "retry on fail" checks \`json.error\`. */
function retryError(item: Json): boolean {
	const error = item == null ? undefined : item.error;
	return error !== undefined && error !== null && error !== false;
}`,
	},
	parameterOrError: {
		uses: [],
		source: `/**
 * The value of a parameter for one item, or the error of its expression. v1 evaluates the
 * expression when the node reads the parameter, so the compiled node throws the error at
 * that read, and not before the node runs.
 */
function parameterOrError(value: () => Json): Json {
	try {
		return { value: value() };
	} catch (error) {
		return { error: { message: error.message, description: error.description } };
	}
}`,
	},
	undefinedToNull: {
		uses: [],
		source: `/** undefined as null, so a parameter key that n8n gives as undefined reaches the host. */
function undefinedToNull(value: Json): Json {
	return value === undefined ? null : value;
}`,
	},
	filterDate: {
		uses: ['luxFromISO'],
		source: `/**
 * The time value of a date in a dateTime filter condition, as tryToParseDateTime
 * of n8n-workflow reads it: a Luxon DateTime as it is; text as ISO, then as SQL,
 * in the time zone of the workflow (Luxon's default zone in v1), then with
 * Date.parse (HTTP and RFC 2822 dates). Null or undefined gives null. Other
 * values fail the condition with the error of v1.
 */
function filterDate(value: Json, zone: string, strict: boolean, condition: number): Json {
	if (value === null || value === undefined) return null;
	if (typeof value === 'object' && value.$lux === true) {
		if (value.invalid === null) return value.ts;
	}
	const text = String(value).trim();
	const iso = luxFromISO(text, { setZone: true }, 0, zone);
	if (iso.invalid === null) return iso.ts;
	if (text.length > 10 && text.charAt(10) === ' ') {
		const sql = luxFromISO(text.slice(0, 10) + 'T' + text.slice(11), { setZone: true }, 0, zone);
		if (sql.invalid === null) return sql.ts;
	}
	const parsed = Date.parse(text);
	if (!isNaN(parsed)) return parsed;
	const kind = typeof value === 'object' ? (Array.isArray(value) ? 'an array' : 'an object') : 'a ' + typeof value;
	throw new Error(
		strict
			? "Wrong type: '" + String(value) + "' is " + kind + ' but was expecting a dateTime [condition ' + String(condition) + ', item 0]'
			: 'Conversion error: the ' + kind.slice(kind.indexOf(' ') + 1) + " '" + String(value) + "' can't be converted to a dateTime [condition " + String(condition) + ', item 0]',
	);
}`,
	},
	tableDate: {
		uses: ['luxFromISO'],
		source: `/**
 * The value of a mapped dateTime field of a Data Table node, as n8n's resource mapper reads
 * it (tryToParseDateTime of n8n-workflow, see \`filterDate\`): the ISO text of the instant,
 * which is the date that v1 gives the data-table service. Null and undefined stay. A value
 * that is not a date is \`{ $invalidDate: true }\`: the node fails with the error of v1.
 */
function tableDate(value: Json, zone: string): Json {
	if (value === null || value === undefined) return value;
	const text = String(value).trim();
	const iso = luxFromISO(text, { setZone: true }, 0, zone);
	if (iso.invalid === null) return new Date(iso.ts).toISOString();
	if (text.length > 10 && text.charAt(10) === ' ') {
		const sql = luxFromISO(text.slice(0, 10) + 'T' + text.slice(11), { setZone: true }, 0, zone);
		if (sql.invalid === null) return new Date(sql.ts).toISOString();
	}
	const parsed = Date.parse(text);
	if (!isNaN(parsed)) return new Date(parsed).toISOString();
	return { $invalidDate: true };
}`,
	},
	filterDateCompare: {
		uses: [],
		source: `/** A dateTime filter comparison of v1: false when a side has no date. */
function filterDateCompare(op: string, a: Json, b: Json): boolean {
	if (a === null || b === null) return false;
	if (op === 'equals') return a === b;
	if (op === 'notEquals') return a !== b;
	if (op === 'after') return a > b;
	if (op === 'before') return a < b;
	if (op === 'afterOrEquals') return a >= b;
	return a <= b;
}`,
	},
	keyValuePairs: {
		uses: ['setPath', 'toText'],
		source: `/**
 * The object of the key-value parameters of the HTTP Request node: mode
 * assign sets each key (the last wins), mode append collects repeated keys in
 * an array (version 4.3 and later), mode set sets a path (a JSON body from
 * version 4).
 */
function keyValuePairs(pairs: Json[], mode: string): Json {
	const out: Json = {};
	for (const pair of pairs) {
		const name = toText(pair[0]);
		const value = pair[1];
		if (mode === 'set') {
			setPath(out, name, value);
		} else if (mode === 'append' && out[name] !== undefined) {
			if (Array.isArray(out[name])) out[name].push(value);
			else out[name] = [out[name], value];
		} else {
			out[name] = value;
		}
	}
	return out;
}`,
	},
	fromAi: {
		uses: [],
		source: `/**
 * The argument \`key\` of a tool call (\`$fromAI\` of v1): an own key of the \`query\` member of
 * the arguments, or else an own key of the arguments, or else the default. v1 reads no
 * inherited member.
 */
function fromAi(args: Json, key: string, fallback?: Json): Json {
	const own = (source: Json, name: string): Json => {
		if (source === null || source === undefined || typeof source !== 'object') return undefined;
		if (Array.isArray(source) && name === 'length') return source.length;
		return Object.keys(source).includes(name) ? source[name] : undefined;
	};
	return own(own(args, 'query'), key) ?? own(args, key) ?? fallback;
}`,
	},
	orUndefined: {
		uses: [],
		source: `/** The value of an expression, or undefined when it throws a TypeError (pagination values of n8n-core). */
function orUndefined(value: () => Json): Json {
	try {
		return value();
	} catch (error) {
		if (error !== null && typeof error === 'object' && error.name === 'TypeError') return undefined;
		throw error;
	}
}`,
	},
	orUndefinedAll: {
		uses: [],
		source: `/**
 * The value of an expression in its native form, or undefined when it throws (\`orNullAll\`
 * for a place where v1 gives undefined: a part of a text, a pagination value).
 */
function orUndefinedAll(value: () => Json): Json {
	try {
		return value();
	} catch (error) {
		if (error !== null && typeof error === 'object' && error.name === 'ExpressionExtensionError') throw error;
		return undefined;
	}
}`,
	},
	paginationRepeat: {
		uses: [],
		source: `/**
 * The check of n8n-core's paginated request: when the same response (same
 * length, and same etag or body) comes again and again, the requests stop.
 * The guard holds { length, hash, count } across the pages.
 */
function paginationRepeat(guard: Json, response: Json): void {
	const headers = response.headers ?? {};
	const length = parseInt(String(headers['content-length'] ?? ''), 10) || 0;
	if (guard.length === length) {
		const etag = headers.etag;
		const body = response.body;
		const hash =
			etag !== undefined && etag !== null && etag !== ''
				? 'e:' + String(etag)
				: 'b:' + (typeof body === 'string' ? body : JSON.stringify(body));
		if (guard.hash === hash) {
			guard.count = guard.count + 1;
			if (guard.count > 2) {
				throw new Error('The returned response was identical 5x, so requests got stopped');
			}
		} else {
			guard.count = 0;
		}
		guard.hash = hash;
	} else {
		guard.count = 0;
	}
	guard.length = length;
}`,
	},
	orNull: {
		uses: [],
		source: `/**
 * The value of an expression, or null when it throws a TypeError or a SyntaxError
 * (\`JSON.parse\` of text that is not JSON), as n8n's expression engine gives.
 */
function orNull(value: () => Json): Json {
	try {
		return value();
	} catch (error) {
		const name = error !== null && typeof error === 'object' ? error.name : undefined;
		if (name === 'TypeError' || name === 'SyntaxError') return null;
		throw error;
	}
}`,
	},
	jsonOf: {
		uses: [],
		source: `/**
 * The JSON of an item as v1 has it: compiled code keeps the binary data of an item in the
 * key \`$binary\` of its JSON (spec 10), and v1 keeps it beside the JSON.
 */
function jsonOf(item: Json): Json {
	if (item === null || typeof item !== 'object' || item.$binary === undefined) return item;
	const json: Json = {};
	for (const k of Object.keys(item)) if (k !== '$binary') json[k] = item[k];
	return json;
}`,
	},
	formText: {
		uses: [],
		source: `/** A key or a value of a form as the qs library writes it (RFC 3986: only \`-._~\` stay). */
function formText(value: string): string {
	const hex = '0123456789ABCDEF';
	let out = '';
	for (let k = 0; k < value.length; k++) {
		let c = value.charCodeAt(k);
		if (
			c === 0x2d ||
			c === 0x2e ||
			c === 0x5f ||
			c === 0x7e ||
			(c >= 0x30 && c <= 0x39) ||
			(c >= 0x41 && c <= 0x5a) ||
			(c >= 0x61 && c <= 0x7a)
		) {
			out += value.charAt(k);
			continue;
		}
		const bytes: number[] = [];
		if (c < 0x80) {
			bytes.push(c);
		} else if (c < 0x800) {
			bytes.push(0xc0 + Math.floor(c / 64), 0x80 + (c % 64));
		} else if (c < 0xd800 || c >= 0xe000) {
			bytes.push(0xe0 + Math.floor(c / 4096), 0x80 + (Math.floor(c / 64) % 64), 0x80 + (c % 64));
		} else {
			// A surrogate pair is one character of four bytes.
			k++;
			const low = k < value.length ? value.charCodeAt(k) : 0;
			c = 0x10000 + (c % 1024) * 1024 + (low % 1024);
			bytes.push(
				0xf0 + Math.floor(c / 262144),
				0x80 + (Math.floor(c / 4096) % 64),
				0x80 + (Math.floor(c / 64) % 64),
				0x80 + (c % 64),
			);
		}
		for (const b of bytes) out += '%' + hex.charAt(Math.floor(b / 16)) + hex.charAt(b % 16);
	}
	return out;
}`,
	},
	formBody: {
		uses: ['formText'],
		source: `/**
 * The body of a form request (\`application/x-www-form-urlencoded\`) as n8n's request helper
 * writes it (\`qs.stringify\` without options): a list is \`key[0]=…\`, an object is
 * \`key[name]=…\`, null is an empty value, and undefined is left out.
 */
function formBody(body: Json): string {
	const parts: string[] = [];
	const add = (key: string, value: Json): void => {
		if (value === undefined) return;
		if (value === null) {
			parts.push(formText(key) + '=');
		} else if (Array.isArray(value)) {
			for (let k = 0; k < value.length; k++) add(key + '[' + String(k) + ']', value[k]);
		} else if (typeof value === 'object') {
			for (const name of Object.keys(value)) add(key + '[' + name + ']', value[name]);
		} else {
			parts.push(formText(key) + '=' + formText(String(value)));
		}
	};
	if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
		for (const key of Object.keys(body)) add(key, body[key]);
	}
	return parts.join('&');
}`,
	},
	withContentType: {
		uses: [],
		source: `/** The headers of a request with the content type that the node sets for its body. */
function withContentType(headers: Json, name: string, value: Json): Json {
	const out: Json = {};
	if (headers !== null && typeof headers === 'object') {
		for (const key of Object.keys(headers)) {
			if (key.toLowerCase() !== 'content-type') out[key] = headers[key];
		}
	}
	out[name] = value;
	return out;
}`,
	},
	withBearer: {
		uses: [],
		source: `/** The headers of a request with the token of the credential, as its \`authenticate\` adds it. */
function withBearer(headers: Json, token: string): Json {
	const out: Json = {};
	if (headers !== null && typeof headers === 'object') {
		for (const key of Object.keys(headers)) out[key] = headers[key];
	}
	out.Authorization = token;
	return out;
}`,
	},
	itemAt: {
		uses: [],
		source: `/** \`$item(k).$node[name].json\`: the JSON of item k of the node, with the errors of v1. */
function itemAt(list: Json[], k: Json, name: string): Json {
	if (list.length === 0) throw new Error("Node '" + name + "' hasn't been executed");
	if (list.length <= k) {
		throw new Error('"' + name + '" node has ' + String(list.length) + " item(s) but you're trying to access item " + String(k));
	}
	return list[k];
}`,
	},
	orNullAll: {
		uses: [],
		source: `/**
 * The value of an expression in its native form, or null when it throws: n8n's expression
 * engine gives null for every error of the JavaScript of an expression.
 */
function orNullAll(value: () => Json): Json {
	try {
		return value();
	} catch (error) {
		// The error of an expression extension stops the node in v1.
		if (error !== null && typeof error === 'object' && error.name === 'ExpressionExtensionError') throw error;
		return null;
	}
}`,
	},
	isEmptyValue: {
		uses: [],
		source: `/** The "is empty" rule of the If node version 1. */
function isEmptyValue(value: Json): boolean {
	return value === undefined || value === null || value === '';
}`,
	},
};

/** The helpers that `names` need, in a stable order. */
export function helperSources(names: Iterable<string>): string[] {
	const all = new Set<string>();
	const add = (n: string) => {
		if (all.has(n)) return;
		const h = HELPERS[n];
		if (!h) throw new Error(`unknown helper ${n}`);
		all.add(n);
		for (const u of h.uses) add(u);
	};
	for (const n of names) add(n);
	return Object.keys(HELPERS)
		.filter((n) => all.has(n))
		.map((n) => HELPERS[n].source);
}

/** Every function name that a helper declares, so node lists do not take them. */
export const HELPER_NAMES: string[] = [...Object.keys(HELPERS), 'mergeInto'];

/** The keys of a lodash-style path: what the helper `pathOf` gives for the same text. */
export function pathKeys(path: string): string[] {
	const keys: string[] = [];
	let current = '';
	for (let k = 0; k < path.length; k++) {
		const c = path.charAt(k);
		const quote = c === '[' ? path.charAt(k + 1) : '';
		if (quote === '"' || quote === "'") {
			let text = '';
			let end = -1;
			for (let j = k + 2; j < path.length; j++) {
				const d = path.charAt(j);
				if (d === '\\' && j + 1 < path.length) {
					text += path.charAt(j + 1);
					j++;
				} else if (d === quote && path.charAt(j + 1) === ']') {
					end = j + 1;
					break;
				} else {
					text += d;
				}
			}
			if (end !== -1) {
				if (current !== '') keys.push(current);
				current = '';
				keys.push(text);
				k = end;
				continue;
			}
		}
		if (c === '.' || c === '[' || c === ']') {
			if (current !== '') keys.push(current);
			current = '';
		} else {
			current += c;
		}
	}
	if (current !== '') keys.push(current);
	return keys;
}

const keyList = (keys: string[]) => `[${keys.map((k) => str(k)).join(', ')}]`;

/**
 * Code that reads a constant path of `target`, as the helper `getPath` reads it. The
 * converter splits the path, so the run does not. `helper` records the helper that the
 * code calls.
 */
export function readPathCode(target: string, path: string, helper: (name: string) => void): string {
	const keys = pathKeys(path);
	// A key that is an array index stays in the helper, which reads it as an element.
	if (keys.length === 1 && keys[0] === path && String(Number(path)) !== path) {
		return `${target}?.[${str(path)}]`;
	}
	helper('getKeys');
	return `getKeys(${target}, ${str(path)}, ${keyList(keys)})`;
}

/** A statement that writes a constant path of `target`, as the helper `setPath` writes it. */
export function writePathCode(
	target: string,
	path: string,
	value: string,
	helper: (name: string) => void,
): string {
	const keys = pathKeys(path);
	if (keys.length === 1 && keys[0] === path) return `${target}[${str(path)}] = ${value};`;
	helper('setKeys');
	return `setKeys(${target}, ${str(path)}, ${keyList(keys)}, ${value});`;
}

/** A statement that deletes a constant path of `target`, as the helper `unsetPath` deletes it. */
export function deletePathCode(
	target: string,
	path: string,
	helper: (name: string) => void,
): string {
	const keys = pathKeys(path);
	if (keys.length === 1) return `delete ${target}[${str(keys[0])}];`;
	helper('unsetKeys');
	return `unsetKeys(${target}, ${keyList(keys)});`;
}
