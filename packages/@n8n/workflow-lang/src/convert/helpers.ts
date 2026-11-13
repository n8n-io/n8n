/**
 * Helper functions that generated workflows can use. Each helper is subset
 * source. The converter appends the helpers that a workflow uses, and the
 * helpers they call, at the end of the generated file.
 *
 * The helpers copy the behaviour of the v1 node code that they replace
 * (lodash `get`, `set`, `merge` and the field rules of the Set node) for
 * plain JSON values.
 */

import { CODE_HELPERS } from './code-native/helpers.ts';

interface HelperSource {
	uses: string[];
	source: string;
}

const HELPERS: Record<string, HelperSource> = {
	// Helpers of native Code node steps (`code-native/`).
	...CODE_HELPERS,
	pathOf: {
		uses: [],
		source: `/** Splits a lodash-style path such as \`a.b[0].c\` into keys. */
function pathOf(path: string): string[] {
	const keys: string[] = [];
	let current = '';
	for (let k = 0; k < path.length; k++) {
		const c = path.charAt(k);
		const quote = c === '[' ? path.charAt(k + 1) : '';
		if (quote === '"' || quote === "'") {
			// A quoted key, as lodash reads it: \`['a.b [c]']\` is the key \`a.b [c]\`.
			let text = '';
			let end = -1;
			for (let j = k + 2; j < path.length; j++) {
				const d = path.charAt(j);
				if (d === '\\\\' && j + 1 < path.length) {
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
	asNumber: {
		uses: [],
		source: `/** The number rule of the Set node. A value that is not a number is an error. */
function asNumber(value: Json): Json {
	if (value == null) return null;
	const n = Number(value);
	// An empty string is 0, as n8n's Set node 3.4 gives it (\`Number('')\`).
	if (typeof value === 'boolean' || isNaN(n)) {
		throw new Error(\`'\${String(value)}' is not a number\`);
	}
	return n;
}`,
	},
	asBoolean: {
		uses: [],
		source: `/** The boolean rule of the Set node and of loose filter conditions. */
function asBoolean(value: Json): Json {
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
	throw new Error(\`'\${String(value)}' is not a boolean\`);
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
			return asBoolean(value);
		} catch (error) {
			return Boolean(value);
		}
	}
	return Boolean(value);
}`,
	},
	asJson: {
		uses: ['parseJsLiteral'],
		source: `/**
 * The array and object rule of the Set node (\`validateFieldType\`). A text is parsed as JSON.
 * An object also reads a JavaScript object literal (\`jsonParse\` with \`acceptJSObject\`), and an
 * array also reads JSON with single quotes.
 */
function asJson(value: Json, kind: string, name: string): Json {
	if (value == null) return null;
	const fail = (): Json => {
		const got = typeof value === 'object' ? (Array.isArray(value) ? 'array' : 'object') : "'" + String(value) + "'";
		throw new Error("'" + name + "' expects a " + kind + ' but we got ' + got);
	};
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
		uses: ['getPath', 'deepMerge', 'shallowMerge', 'withSuffix', 'sameJson'],
		source: `/** The Merge node, mode "Combine by matching fields". */
function mergeByFields(
	input1: Json[],
	input2: Json[],
	fields: string[][],
	options: Json,
): Json[] {
	const join: string = options.joinMode;
	const from: string = options.outputDataFrom;
	const read = (item: Json, field: string) => (options.dotNotation ? getPath(item, field) : item[field]);
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
		const lookup: Json[] = fields.map((pair) => read(entry, pair[0]));
		if (lookup.some((v) => v === undefined)) {
			unmatched1.push(entry);
			continue;
		}
		const matches: Json[] = [];
		for (let k = 0; k < input2.length; k++) {
			const other = input2[k];
			let equal = true;
			for (let f = 0; f < fields.length; f++) {
				if (!sameJson(lookup[f], read(other, fields[f][1]))) equal = false;
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
		uses: ['getPath', 'lessThan', 'sameJson'],
		source: `/** The Sort node, type "Simple": a stable sort; strings compare in lower case. */
function sortItems(items: Json[], fields: Json[][], dotNotation: boolean): Json[] {
	const read = (item: Json, name: string) => {
		const v = dotNotation ? getPath(item, name) : item[name];
		return typeof v === 'string' ? v.toLowerCase() : v;
	};
	return items.slice().sort((a, b) => {
		for (const field of fields) {
			const x = read(a, field[0]);
			const y = read(b, field[0]);
			if (!sameJson(x, y)) return (lessThan(x, y) ? -1 : 1) * field[1];
		}
		return 0;
	});
}`,
	},
	removeDuplicates: {
		uses: ['getPath', 'pathsOf'],
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
	for (const key of keys) {
		if (key === '') throw new Error('Name of field to compare is blank');
		let type = '';
		for (const item of items) {
			const value = dotNotation ? getPath(item, key) : item[key];
			if (value === null) continue;
			if (value === undefined) throw new Error(\`'\${key}' field is missing from some input items\`);
			if (type !== '' && type !== typeof value) throw new Error(\`'\${key}' isn't always the same type\`);
			type = typeof value;
		}
	}
	const seen: Record<string, boolean> = {};
	const out: Json[] = [];
	for (const item of items) {
		const id = JSON.stringify(keys.map((key) => (dotNotation ? getPath(item, key) : item[key])));
		if (seen[id]) continue;
		seen[id] = true;
		out.push(item);
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
		uses: ['getPath', 'setPath', 'unsetPath', 'copyJson'],
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
	for (const item of items) {
		const rows: Json[] = [];
		fields.forEach((field, f) => {
			const name = destinations[f] || field;
			let list = dotNotation ? getPath(item, field) : item[field];
			if (list === undefined) list = [];
			if (typeof list !== 'object' || list === null) list = [list];
			if (!Array.isArray(list)) list = Object.values(list);
			list.forEach((element: Json, k: number) => {
				if (rows[k] === undefined) rows[k] = {};
				if (typeof element === 'object' && element !== null && include === 'noOtherFields' && destinations[f] === undefined && fields.length === 1) {
					rows[k] = Object.assign({}, rows[k], element);
				} else if (dotNotation && destinations.length > 0) {
					setPath(rows[k], name, copyJson(element));
				} else {
					rows[k][name] = element;
				}
			});
		});
		for (const row of rows) {
			if (include === 'allOtherFields') {
				const rest = copyJson(item);
				for (const field of fields) {
					if (dotNotation) unsetPath(rest, field);
					else delete rest[field];
				}
				out.push(Object.assign({}, rest, row));
			} else if (include === 'selectedOtherFields') {
				for (const field of includeFields) row[field] = dotNotation ? getPath(item, field) : item[field];
				out.push(row);
			} else {
				out.push(row);
			}
		}
	}
	return out;
}`,
	},
	aggregateFields: {
		uses: ['getPath', 'setPath'],
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
		for (const item of items) {
			let value = dotNotation ? getPath(item, spec[0]) : item[spec[0]];
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
	const runIndex = engine.runs[job.node] ?? 0;
	engine.runs[job.node] = runIndex + 1;
	if (engine.lastNode === job.node) engine.lastRuns.push(out);
	else {
		engine.lastNode = job.node;
		engine.lastRuns = [out];
	}
	const children = engine.graph.children[job.node] ?? [];
	for (const [output, node, input] of children) {
		const items = out[output];
		if (items === undefined || items === null || items.length === 0) continue;
		v1Add(engine, node, input, items, {
			previousNode: job.node,
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
	retryError: {
		uses: [],
		source: `/** True when an output item has an error, as v1's "retry on fail" checks \`json.error\`. */
function retryError(item: Json): boolean {
	const error = item == null ? undefined : item.error;
	return error !== undefined && error !== null && error !== false;
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
