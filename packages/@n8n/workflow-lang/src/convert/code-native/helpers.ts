/**
 * Helper functions of native Code node steps, as subset source. The
 * converter appends the ones that a workflow uses (`../helpers.ts`).
 *
 * `codeWrap` and `codeItems` copy the item handling of the fallback host
 * (`code-node.ts` prologue and `items.ts` of the host), so a native step gives
 * the same items as a host step.
 */

import { BUFFER_HELPERS } from './buffer-helpers.ts';

/** `RUNS_IN_HOST` of the converter (`../helpers.ts`, which imports this file). */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';
import { LOCALE_HELPERS } from './locale-helpers.ts';
import { LUXON_HELPERS } from './luxon-helpers.ts';
import { TYPED_ARRAY_HELPERS } from './typed-array-helpers.ts';

export interface CodeHelperSource {
	uses: string[];
	source: string;
}

export const CODE_HELPERS: Record<string, CodeHelperSource> = {
	// Locale formatting (\`locale-helpers.ts\`) and the Luxon subset (\`luxon-helpers.ts\`).
	...LOCALE_HELPERS,
	...LUXON_HELPERS,
	// Buffer values (\`buffer-helpers.ts\`).
	...BUFFER_HELPERS,
	...TYPED_ARRAY_HELPERS,
	codeClone: {
		uses: [],
		source: `/** A JSON copy of an item list, as the fallback host gets it. */
function codeClone(list: Json[]): Json[] {
	return JSON.parse(JSON.stringify(list));
}`,
	},
	codeWrap: {
		uses: [],
		source: `/** An input item as the Code node gets it: \`{ json, pairedItem }\`, with \`binary\` from \`$binary\`. */
function codeWrap(j: Json, index: number): Json {
	const pairedItem: Json = { item: index };
	if (j !== null && typeof j === 'object' && j.$binary) {
		const json: Json = {};
		for (const k of Object.keys(j)) if (k !== '$binary') json[k] = j[k];
		return { json, binary: j.$binary, pairedItem };
	}
	return { json: j, pairedItem };
}`,
	},
	codeItem: {
		uses: [],
		source: `/**
 * One v1 item as compiled code holds it: its \`json\`, with its binary data in \`$binary\`.
 * The checks are the ones of v1's \`validateItem\`. v1's Code node checks the result after
 * the code ran, so the error setting of the node does not turn such an error into an item:
 * \`$invalid\` marks it.
 */
function codeItem(e: Json, index: number): Json {
	const json = e.json;
	if (json === null || typeof json !== 'object' || Array.isArray(json)) {
		throw { name: 'Error', message: "A 'json' property isn't an object [item " + index + ']', $invalid: true };
	}
	const binary = e.binary;
	if (binary === undefined) return json;
	if (binary === null || typeof binary !== 'object' || Array.isArray(binary)) {
		throw { name: 'Error', message: "A 'binary' property isn't an object [item " + index + ']', $invalid: true };
	}
	return Object.keys(binary).length > 0 ? { ...json, $binary: binary } : json;
}`,
	},
	codeReservedKey: {
		uses: [],
		source: `/** The top-level keys of an n8n item (\`REQUIRED_N8N_ITEM_KEYS\` of the Code node). */
function codeReservedKey(key: string): boolean {
	return key === 'json' || key === 'binary' || key === 'pairedItem' || key === 'error' || key === 'index';
}`,
	},
	codeTopLevelKeys: {
		uses: ['codeReservedKey'],
		source: `/**
 * v1's \`validateTopLevelKeys\` (\`result-validation.ts\` of the Code node): when an item
 * has a reserved key, it must not have other top-level keys.
 */
function codeTopLevelKeys(list: Json[]): void {
	let mustCheck = false;
	for (let k = 0; k < list.length && !mustCheck; k++) {
		for (const key of Object.keys(list[k])) {
			if (codeReservedKey(key)) mustCheck = true;
		}
	}
	if (!mustCheck) return;
	for (let k = 0; k < list.length; k++) {
		let found = '';
		const unknown: string[] = [];
		for (const key of Object.keys(list[k])) {
			if (codeReservedKey(key)) {
				if (found === '') found = key;
			} else {
				unknown.push(key);
			}
		}
		if (unknown.length === 0) continue;
		if (found !== '') throw { name: 'Error', message: 'Invalid output format [item ' + k + ']', $invalid: true };
		throw { name: 'Error', message: 'Unknown top-level item key: ' + unknown[0] + ' [item ' + k + ']', $invalid: true };
	}
}`,
	},
	codeNormalize: {
		uses: ['codeTopLevelKeys'],
		source: `/**
 * v1's \`validateRunCodeAllItems\` and \`normalizeItems\` (\`normalize-items.ts\` of n8n-core):
 * one object becomes a list; items with \`json\` stay as they are; items with \`binary\` and
 * no \`json\` get their other keys under \`json\`; a mix of the two forms is an error.
 */
function codeNormalize(value: Json): Json[] {
	if (!Array.isArray(value)) {
		if (typeof value !== 'object') throw { name: 'Error', message: "Code doesn't return items properly", $invalid: true };
		// A number that JSON cannot hold is null on the wire of v1's task runner.
		if (value === null) throw { name: 'Error', message: "Cannot read properties of null (reading 'json')", $invalid: true };
		// As v1: an object with a truthy \`json\` is one item, else the object goes under \`json\`.
		return value.json ? [value] : [{ json: value }];
	}
	let withJson = 0;
	let withBinary = 0;
	for (let k = 0; k < value.length; k++) {
		const e: Json = value[k];
		if (e === null || typeof e !== 'object' || Array.isArray(e)) {
			throw { name: 'Error', message: "Code doesn't return items properly", $invalid: true };
		}
		if ('json' in e) withJson++;
		if ('binary' in e) withBinary++;
	}
	codeTopLevelKeys(value);
	if (withJson === value.length) return value;
	if (withJson > 0) throw { name: 'Error', message: 'Inconsistent item format', $invalid: true };
	if (withBinary > 0 && withBinary < value.length) throw { name: 'Error', message: 'Inconsistent item format', $invalid: true };
	const out: Json[] = [];
	for (let k = 0; k < value.length; k++) {
		const e: Json = value[k];
		if (withBinary === value.length) {
			const json: Json = {};
			for (const key of Object.keys(e)) {
				if (key !== 'binary') json[key] = e[key];
			}
			out.push({ json, binary: e.binary });
		} else {
			out.push({ json: e });
		}
	}
	return out;
}`,
	},
	codeItems: {
		uses: ['codeNormalize', 'codeItem'],
		source: `/**
 * The result list of a Code node in "all items" mode. As v1: null gives no items; the
 * result crosses the wire of the task runner as JSON; then the Code node checks it.
 */
function codeItems(value: Json): Json[] {
	// JSON has no text for undefined and for a function.
	const text: Json = JSON.stringify(value);
	if (text === undefined) throw { name: 'Error', message: "Code doesn't return items properly", $invalid: true };
	if (value === null) return [];
	const list = codeNormalize(JSON.parse(text));
	const out: Json[] = [];
	for (let k = 0; k < list.length; k++) out.push(codeItem(list[k], k));
	return out;
}`,
	},
	codeEachItems: {
		uses: [],
		source: `/**
 * The result list of a Code node in "each item" mode: \`results[k]\` is the result for input
 * item k. As v1's task runner (\`runForEachItem\`): a result that is false gives no item;
 * the item has the \`json\` of the result (\`extractJsonData\`) and its \`binary\`; the items
 * cross the wire as JSON; then the Code node checks each one (\`validateRunCodeEachItem\`).
 * A result whose \`json\` is undefined has no \`json\` on the wire, so v1 takes the item
 * itself, which holds only its paired item.
 */
function codeEachItems(results: Json[]): Json[] {
	const list: Json[] = JSON.parse(JSON.stringify(results));
	const out: Json[] = [];
	for (let k = 0; k < list.length; k++) {
		const e: Json = list[k];
		// A result that is false gives no item; JSON keeps such a value, or gives null for it.
		if (!e) continue;
		let json: Json = e;
		let binary: Json = undefined;
		if (typeof e === 'object' && !Array.isArray(e)) {
			if ('json' in e) json = e.json;
			else if ('json' in results[k]) json = { pairedItem: { item: k } };
			else if ('binary' in e) json = {};
			if (e.binary) binary = e.binary;
		}
		if (json === null || typeof json !== 'object' || Array.isArray(json)) {
			throw { name: 'Error', message: "A 'json' property isn't an object [item " + out.length + ']', $invalid: true };
		}
		if (binary === undefined) {
			out.push(json);
			continue;
		}
		if (typeof binary !== 'object' || Array.isArray(binary)) {
			throw { name: 'Error', message: "A 'binary' property isn't an object [item " + out.length + ']', $invalid: true };
		}
		out.push(Object.keys(binary).length > 0 ? { ...json, $binary: binary } : json);
	}
	return out;
}`,
	},
	codeNotDefined: {
		uses: [],
		source: `/**
 * The read of a name that the sandbox of v1's task runner does not have (\`SANDBOX_MISSING\`):
 * V8's ReferenceError. The subset has no ReferenceError class.
 */
function codeNotDefined(name: string): Json {
	throw { name: 'ReferenceError', message: name + ' is not defined' };
}`,
	},
	codeAt: {
		uses: [],
		source: `/**
 * Gives an error the line where it came from, when it has none yet. Only an Error has a
 * stack in v1: a thrown text or plain object, and the error of a request, get no line.
 */
function codeAt(e: Json, line: number): Json {
	if (
		e !== null &&
		typeof e === 'object' &&
		typeof e.message === 'string' &&
		typeof e.name === 'string' &&
		e.$line === undefined &&
		e.$request !== true &&
		e.$invalid !== true
	) {
		e.$line = line;
	}
	return e;
}`,
	},
	codeFail: {
		uses: [],
		source: `/**
 * The error that the node gives when its code fails: \`traced\` is the error of the traced
 * form of the code, which has the line; without it, the error of the code itself.
 */
function codeFail(traced: Json, error: Json): Json {
	const e: Json = traced === undefined ? error : traced;
	if (e !== null && typeof e === 'object' && e.$invalid === true) return e;
	return { name: 'Error', message: codeErrorMessage(e) };
}

/**
 * The message that v1 gives for a value that the code throws (\`toExecutionErrorIfNeeded\`
 * and \`ExecutionError\` of n8n's task runner):
 * - a value without a text \`message\` gives its JSON text;
 * - an Error gives the text after the first ": " of the first line of its stack that has
 *   one (the line with its name and message), without spaces around it, else its message,
 *   else "Unknown error"; then " [line N]" for the line of the error.
 */
function codeErrorMessage(e: Json): string {
	if (e === null || typeof e !== 'object' || typeof e.message !== 'string') {
		const text: Json = JSON.stringify(e);
		return text === undefined ? 'Unknown error' : String(text).trim();
	}
	const message: string = e.message;
	let details = '';
	if (typeof e.name === 'string') {
		const head = e.name === '' ? message : message === '' ? e.name : e.name + ': ' + message;
		const rows = head.split('\\n');
		let first = 0;
		let last = rows.length;
		for (let k = 0; k < rows.length; k++) {
			let row = rows[k];
			if (row.endsWith('\\r')) row = row.slice(0, row.length - 1);
			rows[k] = row;
			const text = row.trim();
			// A row of a stack frame ends the head of the stack.
			if (row !== '' && row.charAt(0).trim() === '' && text.startsWith('at') && text.length > 2 && text.charAt(2).trim() === '') {
				last = k;
				break;
			}
			// A row of carets ends an excerpt of the source.
			let carets = text !== '';
			for (let c = 0; c < text.length && carets; c++) carets = text.charAt(c) === '^';
			if (carets) first = k + 1;
		}
		for (let k = first; k < last && details === ''; k++) {
			const row = rows[k];
			if (row === '' || row.charAt(0).trim() === '') continue;
			const at = row.indexOf(': ', 1);
			if (at >= 1 && row.length > at + 2) details = row.slice(at + 2).trim();
		}
	}
	const text = details !== '' ? details : message !== '' ? message : 'Unknown error';
	return (text + ' ' + (typeof e.$line === 'number' ? '[line ' + e.$line + ']' : '')).trim();
}`,
	},
	iterOf: {
		uses: [],
		source: `/** The values that \`for...of\` and spread visit: an array, or the code points of a string. */
function iterOf(v: Json, text: string): Json[] {
	if (Array.isArray(v)) return v;
	// A Set gives its values, a Map its [key, value] entries (\`collNew\`).
	if (v !== null && typeof v === 'object' && v.$coll !== undefined) {
		if (v.$coll === 'Set') return v.keys.slice();
		const pairs: Json[] = [];
		for (let k = 0; k < v.keys.length; k++) pairs.push([v.keys[k], v.vals[k]]);
		return pairs;
	}
	if (typeof v === 'string') {
		const out: Json[] = [];
		for (let k = 0; k < v.length; k++) {
			const c = v.charCodeAt(k);
			if (c >= 0xd800 && c <= 0xdbff && k + 1 < v.length) {
				const d = v.charCodeAt(k + 1);
				if (d >= 0xdc00 && d <= 0xdfff) {
					out.push(v.slice(k, k + 2));
					k++;
					continue;
				}
			}
			out.push(v.charAt(k));
		}
		return out;
	}
	throw new TypeError(text + ' is not iterable');
}`,
	},
	toIntegerOrInfinity: {
		uses: [],
		source: `/** ToIntegerOrInfinity of ECMAScript. */
function toIntegerOrInfinity(v: Json): number {
	const n = Number(v);
	if (isNaN(n)) return 0;
	return Math.trunc(n);
}`,
	},
	isFiniteValue: {
		uses: [],
		source: `/** The global \`isFinite(v)\`. */
function isFiniteValue(v: Json): boolean {
	return Number.isFinite(Number(v));
}`,
	},
	numberIsNaN: {
		uses: [],
		source: `/** \`Number.isNaN(v)\`. */
function numberIsNaN(v: Json): boolean {
	return typeof v === 'number' && isNaN(v);
}`,
	},
	numberIsSafeInteger: {
		uses: [],
		source: `/** \`Number.isSafeInteger(v)\`. */
function numberIsSafeInteger(v: Json): boolean {
	return Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER;
}`,
	},
	mathMaxOf: {
		uses: [],
		source: `/** \`Math.max(...values)\`. */
function mathMaxOf(values: Json[]): number {
	let m = -Infinity;
	for (const v of values) m = Math.max(m, Number(v));
	return m;
}`,
	},
	mathMinOf: {
		uses: [],
		source: `/** \`Math.min(...values)\`. */
function mathMinOf(values: Json[]): number {
	let m = Infinity;
	for (const v of values) m = Math.min(m, Number(v));
	return m;
}`,
	},
	assignInto: {
		uses: [],
		source: `/** \`Object.assign(target, ...sources)\` for plain objects. */
function assignInto(args: Json[]): Json {
	const target = args[0];
	if (target === undefined || target === null) {
		throw new TypeError('Cannot convert undefined or null to object');
	}
	for (let k = 1; k < args.length; k++) {
		const source = args[k];
		if (source === undefined || source === null) continue;
		for (const key of Object.keys(source)) target[key] = source[key];
	}
	return target;
}`,
	},
	fromEntries: {
		uses: ['iterOf'],
		source: `/** \`Object.fromEntries(entries)\`. */
function fromEntries(entries: Json): Json {
	const out: Json = {};
	for (const e of iterOf(entries, 'entries')) {
		if (e === null || typeof e !== 'object') {
			throw new TypeError('Iterator value ' + e + ' is not an entry object');
		}
		out[e[0]] = e[1];
	}
	return out;
}`,
	},
	dateMemberCheck: {
		uses: [],
		source: `/** The object of a member write, delete or test: a Date value has no members. */
function dateMemberCheck(v: Json): Json {
	if (Date.is(v)) {
		throw new Error('The code writes, deletes or tests a member of a Date value ${RUNS_IN_HOST}');
	}
	return v;
}`,
	},
	arrayFrom: {
		uses: ['iterOf', 'toIntegerOrInfinity'],
		source: `/** \`Array.from(value, mapper?)\`. */
function arrayFrom(value: Json, mapper?: Json): Json[] {
	let list: Json[] = [];
	if (Array.isArray(value)) list = value.slice();
	else if (typeof value === 'string' || (value !== null && typeof value === 'object' && value.$coll !== undefined)) {
		list = iterOf(value, '');
	}
	else if (value === undefined || value === null) {
		throw new TypeError(value + ' is not iterable (cannot read property Symbol(Symbol.iterator))');
	} else if (typeof value === 'object') {
		const n = Math.max(0, toIntegerOrInfinity(value.length));
		for (let k = 0; k < n; k++) list.push(value[k]);
	}
	if (mapper === undefined) return list;
	const out: Json[] = [];
	for (let k = 0; k < list.length; k++) out.push(mapper(list[k], k));
	return out;
}`,
	},
	fromCharCodes: {
		uses: [],
		source: `/** \`String.fromCharCode(...codes)\`: a JSON string of \\\\u escapes gives the code units. */
function fromCharCodes(codes: Json[]): string {
	let text = '"';
	for (const c of codes) {
		const n = Math.trunc(Number(c));
		const unit = isNaN(n) || !Number.isFinite(n) ? 0 : ((n % 65536) + 65536) % 65536;
		text += '\\\\u' + unit.toString(16).padStart(4, '0');
	}
	return JSON.parse(text + '"');
}`,
	},
	lastIndexOfOf: {
		uses: ['toIntegerOrInfinity'],
		source: `/** \`value.lastIndexOf(search, from?)\` of a string or an array. */
function lastIndexOfOf(value: Json, search: Json, from?: Json): number {
	if (typeof value === 'string') {
		const s = String(search);
		const n = from === undefined ? Infinity : Number(from);
		let k = Math.min(isNaN(n) ? Infinity : Math.max(toIntegerOrInfinity(n), 0), value.length - s.length);
		for (; k >= 0; k--) if (value.slice(k, k + s.length) === s) return k;
		return -1;
	}
	if (!Array.isArray(value)) {
		throw new TypeError(
			value === undefined || value === null
				? 'Cannot read properties of ' + value + " (reading 'lastIndexOf')"
				: 'lastIndexOf is not a function',
		);
	}
	let k = value.length - 1;
	if (from !== undefined) {
		const n = toIntegerOrInfinity(from);
		k = n >= 0 ? Math.min(n, value.length - 1) : value.length + n;
	}
	for (; k >= 0; k--) if (value[k] === search) return k;
	return -1;
}`,
	},
	substrOf: {
		uses: ['toIntegerOrInfinity'],
		source: `/** \`value.substr(start, length?)\`. */
function substrOf(value: Json, start?: Json, length?: Json): string {
	if (typeof value !== 'string') {
		throw new TypeError(
			value === undefined || value === null
				? 'Cannot read properties of ' + value + " (reading 'substr')"
				: 'substr is not a function',
		);
	}
	const size = value.length;
	let s = toIntegerOrInfinity(start);
	if (s < 0) s = Math.max(size + s, 0);
	s = Math.min(s, size);
	const n = length === undefined ? size - s : Math.min(Math.max(toIntegerOrInfinity(length), 0), size - s);
	return n <= 0 ? '' : value.slice(s, s + n);
}`,
	},
	spliceOf: {
		uses: ['toIntegerOrInfinity'],
		source: `/** \`arr.splice(start, count, ...items)\`: \`args\` is \`[start, count]\` as written. */
function spliceOf(arr: Json, args: Json[], items: Json[]): Json[] {
	if (!Array.isArray(arr)) {
		throw new TypeError(
			arr === undefined || arr === null
				? 'Cannot read properties of ' + arr + " (reading 'splice')"
				: 'splice is not a function',
		);
	}
	const size = arr.length;
	let start = 0;
	let count = 0;
	if (args.length > 0) {
		const r = toIntegerOrInfinity(args[0]);
		start = r < 0 ? Math.max(size + r, 0) : Math.min(r, size);
		count = size - start;
	}
	if (args.length > 1) count = Math.min(Math.max(toIntegerOrInfinity(args[1]), 0), size - start);
	const removed = arr.slice(start, start + count);
	const tail = arr.slice(start + count);
	while (arr.length > start) arr.pop();
	for (const x of items) arr.push(x);
	for (const x of tail) arr.push(x);
	return removed;
}`,
	},
	uriError: {
		uses: [],
		source: `/** The URIError of JavaScript. The subset has no URIError class. */
function uriError(): Json {
	return { name: 'URIError', message: 'URI malformed' };
}`,
	},
	uriEncode: {
		uses: ['uriError'],
		source: `/** The Encode operation of ECMAScript: UTF-8 percent escapes for each character not in \`keep\`. */
function uriEncode(value: Json, keep: string): string {
	const s = String(value);
	let out = '';
	for (let k = 0; k < s.length; k++) {
		const ch = s.charAt(k);
		if (keep.includes(ch)) {
			out += ch;
			continue;
		}
		let cp = s.charCodeAt(k);
		if (cp >= 0xdc00 && cp <= 0xdfff) throw uriError();
		if (cp >= 0xd800 && cp <= 0xdbff) {
			const next = k + 1 < s.length ? s.charCodeAt(k + 1) : 0;
			if (next < 0xdc00 || next > 0xdfff) throw uriError();
			cp = (cp - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
			k++;
		}
		const bytes: number[] =
			cp < 0x80
				? [cp]
				: cp < 0x800
					? [0xc0 | (cp >> 6), 0x80 | (cp & 63)]
					: cp < 0x10000
						? [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)]
						: [0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
		for (const b of bytes) out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
	}
	return out;
}`,
	},
	encodeUriComponent: {
		uses: ['uriEncode'],
		source: `/** \`encodeURIComponent(value)\`. */
function encodeUriComponent(value: Json): string {
	return uriEncode(value, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()");
}`,
	},
	encodeUri: {
		uses: ['uriEncode'],
		source: `/** \`encodeURI(value)\`. */
function encodeUri(value: Json): string {
	return uriEncode(value, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'();/?:@&=+$,#");
}`,
	},
	uriDecode: {
		uses: ['uriError'],
		source: `/** The Decode operation of ECMAScript: escapes of characters in \`reserved\` stay. */
function uriDecode(value: Json, reserved: string): string {
	const s = String(value);
	const hex = '0123456789abcdef';
	const byteAt = (k: number): number => {
		if (k + 2 >= s.length) throw uriError();
		const h = hex.indexOf(s.charAt(k + 1).toLowerCase());
		const l = hex.indexOf(s.charAt(k + 2).toLowerCase());
		if (s.charAt(k) !== '%' || h < 0 || l < 0) throw uriError();
		return h * 16 + l;
	};
	let out = '';
	for (let k = 0; k < s.length; k++) {
		const ch = s.charAt(k);
		if (ch !== '%') {
			out += ch;
			continue;
		}
		const start = k;
		const b = byteAt(k);
		k += 2;
		if (b < 0x80) {
			const c = JSON.parse('"\\\\u' + b.toString(16).padStart(4, '0') + '"');
			out += reserved.includes(c) ? s.slice(start, k + 1) : c;
			continue;
		}
		const n = b >= 0xf0 && b < 0xf8 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 && b < 0xe0 ? 2 : 0;
		if (n === 0) throw uriError();
		let cp = b & (n === 2 ? 0x1f : n === 3 ? 0x0f : 0x07);
		for (let j = 1; j < n; j++) {
			k++;
			if (k >= s.length) throw uriError();
			const c = byteAt(k);
			if ((c & 0xc0) !== 0x80) throw uriError();
			cp = cp * 64 + (c & 63);
			k += 2;
		}
		const min = n === 2 ? 0x80 : n === 3 ? 0x800 : 0x10000;
		if (cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) throw uriError();
		if (cp >= 0x10000) {
			const v = cp - 0x10000;
			const hi = 0xd800 + Math.floor(v / 0x400);
			const lo = 0xdc00 + (v % 0x400);
			out += JSON.parse('"\\\\u' + hi.toString(16) + '\\\\u' + lo.toString(16) + '"');
		} else {
			out += JSON.parse('"\\\\u' + cp.toString(16).padStart(4, '0') + '"');
		}
	}
	return out;
}`,
	},
	decodeUriComponent: {
		uses: ['uriDecode'],
		source: `/** \`decodeURIComponent(value)\`. */
function decodeUriComponent(value: Json): string {
	return uriDecode(value, '');
}`,
	},
	decodeUri: {
		uses: ['uriDecode'],
		source: `/** \`decodeURI(value)\`. */
function decodeUri(value: Json): string {
	return uriDecode(value, ';/?:@&=+$,#');
}`,
	},
	regexOf: {
		uses: [],
		source: `/** A regular expression as a plain object (spec section 4.6). \`names\` names the groups. */
function regexOf(source: string, flags: string, names: Json[]): Json {
	return {
		$regexp: true,
		source,
		flags,
		global: flags.includes('g'),
		ignoreCase: flags.includes('i'),
		multiline: flags.includes('m'),
		dotAll: flags.includes('s'),
		unicode: flags.includes('u'),
		sticky: flags.includes('y'),
		lastIndex: 0,
		$names: names,
	};
}`,
	},
	isRegex: {
		uses: [],
		source: `/** True for a value of \`regexOf\`. */
function isRegex(v: Json): boolean {
	return v !== null && typeof v === 'object' && v.$regexp === true;
}`,
	},
	regexCaps: {
		uses: ['isRegex'],
		source: `/** The positions of the next match, with the \`lastIndex\` rules of RegExp.prototype.exec. */
function regexCaps(re: Json, s: string, method: string): Json {
	if (!isRegex(re)) {
		throw new TypeError(
			re === undefined || re === null
				? 'Cannot read properties of ' + re + " (reading '" + method + "')"
				: 'value.' + method + ' is not a function',
		);
	}
	const moves = re.global || re.sticky;
	let last = 0;
	if (moves) {
		const n = Math.trunc(Number(re.lastIndex));
		last = isNaN(n) || n < 0 ? 0 : n;
	}
	if (last > s.length) {
		if (moves) re.lastIndex = 0;
		return null;
	}
	const caps = RegExp.exec(re.source, re.flags, s, last);
	if (caps === null) {
		if (moves) re.lastIndex = 0;
		return null;
	}
	if (moves) re.lastIndex = caps[1];
	return caps;
}`,
	},
	matchOf: {
		uses: [],
		source: `/** The match array of positions \`caps\`: the text, then each group or undefined. */
function matchOf(s: string, caps: Json[]): Json[] {
	const out: Json[] = [];
	for (let k = 0; k < caps.length; k += 2) {
		out.push(caps[k] < 0 ? undefined : s.slice(caps[k], caps[k + 1]));
	}
	return out;
}`,
	},
	regexExecOf: {
		uses: ['regexCaps', 'matchOf', 'matchNote'],
		source: `/** \`re.exec(s)\`. \`reg\` keeps the index, input and groups of matches (\`matchProp\`). */
function regexExecOf(re: Json, value: Json, reg?: Json): Json {
	const s = String(value);
	const caps = regexCaps(re, s, 'exec');
	if (caps === null) return null;
	const m = matchOf(s, caps);
	if (reg !== undefined) matchNote(reg, m, caps, s, re);
	return m;
}`,
	},
	matchNote: {
		uses: ['namedGroups'],
		source: `/** Records the index, input and groups of a match array. */
function matchNote(reg: Json[], m: Json[], caps: Json[], s: string, re: Json): void {
	reg.push({ m, index: caps[0], input: s, groups: namedGroups(re.$names, m.slice(1)) });
}`,
	},
	matchProp: {
		uses: [],
		source: `/** \`x.index\`, \`x.input\` or \`x.groups\`: of a match from the registry, else the property. */
function matchProp(x: Json, name: string, reg: Json[]): Json {
	if (Array.isArray(x)) {
		for (const e of reg) if (e.m === x) return e[name];
		return undefined;
	}
	return x[name];
}`,
	},
	regexNames: {
		uses: [],
		source: `/** The name of each capture group of a pattern (null when it has none), as \`regex-syntax.ts\` finds them. */
function regexNames(source: string): Json[] {
	const out: Json[] = [];
	let inClass = false;
	for (let k = 0; k < source.length; k++) {
		const c = source.charAt(k);
		if (c === '\\\\') {
			k++;
			continue;
		}
		if (inClass) {
			if (c === ']') inClass = false;
			continue;
		}
		if (c === '[') inClass = true;
		else if (c === '(') {
			if (source.charAt(k + 1) !== '?') out.push(null);
			else if (source.charAt(k + 2) === '<' && source.charAt(k + 3) !== '=' && source.charAt(k + 3) !== '!') {
				const end = source.indexOf('>', k + 3);
				out.push(source.slice(k + 3, end < 0 ? source.length : end));
			}
		}
	}
	return out;
}`,
	},
	regexNew: {
		uses: ['regexOf', 'regexNames', 'isRegex'],
		source: `/** \`new RegExp(pattern, flags)\` with a computed pattern: the engine checks it here. */
function regexNew(pattern: Json, flags: Json): Json {
	const source = isRegex(pattern) ? pattern.source : pattern === undefined ? '(?:)' : String(pattern);
	const f = flags === undefined ? (isRegex(pattern) ? pattern.flags : '') : String(flags);
	RegExp.exec(source, f, '', 0);
	return regexOf(source, f, regexNames(source));
}`,
	},
	regexNewHost: {
		uses: ['regexNew'],
		source: `/**
 * \`new RegExp(pattern, flags)\` with a computed pattern, in code that can hand the node over
 * to the fallback host (\`Translation.handsOver\`). The engine of the runtime has a subset of
 * the patterns of JavaScript, and it does not tell a pattern outside the subset from text
 * that is not a pattern. For both, the fallback host runs the node: JavaScript runs the
 * pattern there, or gives its own error for the text.
 */
function regexNewHost(pattern: Json, flags: Json): Json {
	try {
		return regexNew(pattern, flags);
	} catch (error) {
		throw new Error('The code makes a regular expression that the engine does not have ${RUNS_IN_HOST}');
	}
}`,
	},
	regexFromHost: {
		uses: ['regexNewHost', 'isRegex'],
		source: `/** \`regexFrom\` in code that can hand the node over to the fallback host (\`regexNewHost\`). */
function regexFromHost(pattern: Json, flags: Json): Json {
	return isRegex(pattern) ? pattern : regexNewHost(pattern, flags);
}`,
	},
	regexFrom: {
		uses: ['regexNew', 'isRegex'],
		source: `/** The pattern of \`match\`, \`matchAll\` and \`search\`: a regular expression, or a new one of the value. */
function regexFrom(pattern: Json, flags: Json): Json {
	return isRegex(pattern) ? pattern : regexNew(pattern, flags);
}`,
	},
	regexTestOf: {
		uses: ['regexCaps'],
		source: `/** \`re.test(s)\`. */
function regexTestOf(re: Json, value: Json): boolean {
	return regexCaps(re, String(value), 'test') !== null;
}`,
	},
	stringOf: {
		uses: [],
		source: `/** The receiver of a String method: a string, else the TypeError of JavaScript. */
function stringOf(v: Json, method: string): string {
	if (typeof v === 'string') return v;
	throw new TypeError(
		v === undefined || v === null
			? 'Cannot read properties of ' + v + " (reading '" + method + "')"
			: 'value.' + method + ' is not a function',
	);
}`,
	},
	advanceIndex: {
		uses: [],
		source: `/** AdvanceStringIndex of ECMAScript. */
function advanceIndex(s: string, k: number, unicode: boolean): number {
	if (!unicode || k + 1 >= s.length) return k + 1;
	const c = s.charCodeAt(k);
	const d = s.charCodeAt(k + 1);
	return c >= 0xd800 && c <= 0xdbff && d >= 0xdc00 && d <= 0xdfff ? k + 2 : k + 1;
}`,
	},
	strMatch: {
		uses: ['stringOf', 'regexExecOf', 'regexCaps', 'advanceIndex', 'isRegex'],
		source: `/** \`s.match(re)\` with a regular expression. */
function strMatch(value: Json, re: Json, reg?: Json): Json {
	const s = stringOf(value, 'match');
	if (!isRegex(re)) throw new TypeError('match needs a regular expression');
	if (!re.global) return regexExecOf(re, s, reg);
	re.lastIndex = 0;
	const out: Json[] = [];
	for (;;) {
		const caps = regexCaps(re, s, 'match');
		if (caps === null) break;
		out.push(s.slice(caps[0], caps[1]));
		if (caps[0] === caps[1]) re.lastIndex = advanceIndex(s, caps[1], re.unicode);
	}
	return out.length === 0 ? null : out;
}`,
	},
	strMatchAll: {
		uses: ['stringOf', 'regexOf', 'regexCaps', 'matchOf', 'advanceIndex', 'isRegex', 'matchNote'],
		source: `/** \`[...s.matchAll(re)]\`: the matches as an array. */
function strMatchAll(value: Json, re: Json, reg?: Json): Json[] {
	const s = stringOf(value, 'matchAll');
	if (!isRegex(re)) throw new TypeError('matchAll needs a regular expression');
	if (!re.global) {
		throw new TypeError('String.prototype.matchAll called with a non-global RegExp argument');
	}
	const copy = regexOf(re.source, re.flags, re.$names);
	copy.lastIndex = re.lastIndex;
	const out: Json[] = [];
	for (;;) {
		const caps = regexCaps(copy, s, 'matchAll');
		if (caps === null) break;
		const m = matchOf(s, caps);
		if (reg !== undefined) matchNote(reg, m, caps, s, copy);
		out.push(m);
		if (caps[0] === caps[1]) copy.lastIndex = advanceIndex(s, caps[1], copy.unicode);
	}
	return out;
}`,
	},
	strSearch: {
		uses: ['stringOf', 'isRegex'],
		source: `/** \`s.search(re)\`. */
function strSearch(value: Json, re: Json): number {
	const s = stringOf(value, 'search');
	if (!isRegex(re)) throw new TypeError('search needs a regular expression');
	const flags = re.flags.split('g').join('');
	const caps = RegExp.exec(re.source, flags, s, 0);
	return caps === null ? -1 : caps[0];
}`,
	},
	substitution: {
		uses: [],
		source: `/** GetSubstitution of ECMAScript: \`$$ $& $\\\` $' $n $nn $<name>\` in a replacement string. */
function substitution(
	matched: string,
	s: string,
	position: number,
	groups: Json[],
	named: Json,
	replacement: string,
): string {
	let out = '';
	const m = groups.length;
	const tail = position + matched.length;
	for (let k = 0; k < replacement.length; k++) {
		const c = replacement.charAt(k);
		if (c !== '$' || k + 1 >= replacement.length) {
			out += c;
			continue;
		}
		const d = replacement.charAt(k + 1);
		if (d === '$') {
			out += '$';
			k++;
		} else if (d === '&') {
			out += matched;
			k++;
		} else if (d === '\`') {
			out += s.slice(0, position);
			k++;
		} else if (d === "'") {
			if (tail < s.length) out += s.slice(tail);
			k++;
		} else if (d >= '0' && d <= '9') {
			const e = replacement.charAt(k + 2);
			const two = e >= '0' && e <= '9' ? Number(d + e) : -1;
			const one = Number(d);
			if (two >= 1 && two <= m) {
				const g = groups[two - 1];
				if (g !== undefined) out += g;
				k += 2;
			} else if (one >= 1 && one <= m) {
				const g = groups[one - 1];
				if (g !== undefined) out += g;
				k++;
			} else {
				out += '$';
			}
		} else if (d === '<') {
			const close = replacement.indexOf('>', k + 2);
			if (named === undefined || close < 0) {
				out += '$';
			} else {
				const g = named[replacement.slice(k + 2, close)];
				if (g !== undefined) out += String(g);
				k = close;
			}
		} else {
			out += '$';
		}
	}
	return out;
}`,
	},
	callReplacer: {
		uses: [],
		source: `/** Calls a replace callback with the match, the groups, the position, the string and the named groups. */
function callReplacer(fn: Json, matched: string, groups: Json[], position: number, s: string, named: Json): string {
	const g = groups;
	const n = groups.length;
	const tail: Json[] = named === undefined ? [position, s] : [position, s, named];
	const a: Json[] = [matched];
	for (let k = 0; k < n; k++) a.push(g[k]);
	for (const x of tail) a.push(x);
	switch (a.length) {
		case 3:
			return String(fn(a[0], a[1], a[2]));
		case 4:
			return String(fn(a[0], a[1], a[2], a[3]));
		case 5:
			return String(fn(a[0], a[1], a[2], a[3], a[4]));
		case 6:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5]));
		case 7:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6]));
		case 8:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]));
		case 9:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]));
		case 10:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]));
		case 11:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10]));
		case 12:
			return String(fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11]));
		case 13:
			return String(
				fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12]),
			);
		default:
			throw new Error('A replace callback with more than 10 groups has no native form');
	}
}`,
	},
	namedGroups: {
		uses: [],
		source: `/** The \`groups\` object of a match, or undefined when the pattern has no named group. */
function namedGroups(names: Json[], groups: Json[]): Json {
	let out: Json = undefined;
	for (let k = 0; k < names.length; k++) {
		if (names[k] === null) continue;
		if (out === undefined) out = {};
		out[names[k]] = groups[k];
	}
	return out;
}`,
	},
	strReplace: {
		uses: [
			'stringOf',
			'isRegex',
			'regexCaps',
			'matchOf',
			'advanceIndex',
			'substitution',
			'callReplacer',
			'namedGroups',
		],
		source: `/** \`s.replace(pattern, replacement)\` and \`s.replaceAll(...)\` for a regular expression, or a callback. */
function strReplace(value: Json, pattern: Json, replacement: Json, all: boolean): string {
	const s = stringOf(value, all ? 'replaceAll' : 'replace');
	const fn = typeof replacement === 'function';
	const text = fn ? '' : String(replacement);
	if (!isRegex(pattern)) {
		const p = String(pattern);
		if (!fn) return all ? s.replaceAll(p, text) : s.replace(p, text);
		// The positions first, as JavaScript finds them in the original string.
		const positions: number[] = [];
		let k = s.indexOf(p);
		while (k >= 0) {
			positions.push(k);
			if (!all || k + Math.max(p.length, 1) > s.length) break;
			k = s.indexOf(p, k + Math.max(p.length, 1));
		}
		let out = '';
		let at = 0;
		for (const position of positions) {
			out += s.slice(at, position) + callReplacer(replacement, p, [], position, s, undefined);
			at = position + p.length;
		}
		return out + s.slice(at);
	}
	if (all && !pattern.global) throw new TypeError('replaceAll must be called with a global RegExp');
	const matches: Json[] = [];
	if (pattern.global) {
		pattern.lastIndex = 0;
		for (;;) {
			const caps = regexCaps(pattern, s, 'replace');
			if (caps === null) break;
			matches.push(caps);
			if (caps[0] === caps[1]) pattern.lastIndex = advanceIndex(s, caps[1], pattern.unicode);
		}
	} else {
		const caps = regexCaps(pattern, s, 'replace');
		if (caps !== null) matches.push(caps);
	}
	let out = '';
	let next = 0;
	for (const caps of matches) {
		const list = matchOf(s, caps);
		const matched = list[0];
		const groups = list.slice(1);
		const position = caps[0];
		const named = namedGroups(pattern.$names, groups);
		const piece = fn
			? callReplacer(replacement, matched, groups, position, s, named)
			: substitution(matched, s, position, groups, named, text);
		if (position >= next) {
			out += s.slice(next, position) + piece;
			next = position + matched.length;
		}
	}
	return next >= s.length ? out : out + s.slice(next);
}`,
	},
	strSplit: {
		uses: ['stringOf', 'isRegex', 'advanceIndex'],
		source: `/** \`s.split(separator, limit)\`, also for a regular expression. */
function strSplit(value: Json, separator: Json, limit: Json): Json[] {
	const s = stringOf(value, 'split');
	if (!isRegex(separator)) return limit === undefined ? s.split(separator) : s.split(separator, limit);
	const lim = limit === undefined ? 4294967295 : Number(limit) >>> 0;
	const out: Json[] = [];
	if (lim === 0) return out;
	const flags = (separator.flags.includes('y') ? separator.flags : separator.flags + 'y').split('g').join('');
	if (s.length === 0) {
		if (RegExp.exec(separator.source, flags, s, 0) === null) out.push(s);
		return out;
	}
	let p = 0;
	let q = 0;
	while (q < s.length) {
		const caps = RegExp.exec(separator.source, flags, s, q);
		if (caps === null) {
			q = advanceIndex(s, q, separator.unicode);
			continue;
		}
		const e = Math.min(caps[1], s.length);
		if (e === p) {
			q = advanceIndex(s, q, separator.unicode);
			continue;
		}
		out.push(s.slice(p, q));
		if (out.length === lim) return out;
		p = e;
		for (let k = 2; k < caps.length; k += 2) {
			out.push(caps[k] < 0 ? undefined : s.slice(caps[k], caps[k + 1]));
			if (out.length === lim) return out;
		}
		q = p;
	}
	out.push(s.slice(p));
	return out;
}`,
	},
	collNew: {
		uses: ['iterOf', 'collPut'],
		source: `/**
 * \`new Set(values)\` and \`new Map(entries)\` as a plain object: keys and values
 * in insertion order, and an index of the primitive keys (SameValueZero).
 */
function collNew(kind: string, init: Json): Json {
	const c: Json = { $coll: kind, keys: [], vals: [], index: {}, size: 0 };
	if (init === undefined || init === null) return c;
	for (const e of iterOf(init, 'object')) {
		if (kind === 'Set') collPut(c, e, e);
		else {
			if (e === null || typeof e !== 'object') {
				throw new TypeError('Iterator value ' + e + ' is not an entry object');
			}
			collPut(c, e[0], e[1]);
		}
	}
	return c;
}`,
	},
	collKey: {
		uses: [],
		source: `/** The index key of a primitive key, or undefined for an object (found by identity). */
function collKey(k: Json): Json {
	if (k === null) return 'null:';
	const t = typeof k;
	if (t === 'object' || t === 'function') return undefined;
	return t + ':' + String(k);
}`,
	},
	collFind: {
		uses: ['collKey'],
		source: `/** The position of key \`k\`, or -1. */
function collFind(c: Json, k: Json): number {
	const key = collKey(k);
	if (key !== undefined) {
		const at = c.index[key];
		return at === undefined ? -1 : at;
	}
	for (let i = 0; i < c.keys.length; i++) if (c.keys[i] === k) return i;
	return -1;
}`,
	},
	collPut: {
		uses: ['collKey', 'collFind'],
		source: `/** Adds or updates key \`k\`. */
function collPut(c: Json, k: Json, v: Json): void {
	const at = collFind(c, k);
	if (at >= 0) {
		c.vals[at] = v;
		return;
	}
	// -0 is stored as +0, as in JavaScript.
	const key = k === 0 ? 0 : k;
	const index = collKey(key);
	if (index !== undefined) c.index[index] = c.keys.length;
	c.keys.push(key);
	c.vals.push(v);
	c.size = c.keys.length;
}`,
	},
	isColl: {
		uses: [],
		source: `/** True for a Set or a Map of \`collNew\`. */
function isColl(v: Json, kind: string): boolean {
	return v !== null && typeof v === 'object' && v.$coll === kind;
}`,
	},
	collMethod: {
		uses: [],
		source: `/** A method of another value: a function property, else the TypeError of JavaScript. */
function collMethod(v: Json, name: string): Json {
	if (v === undefined || v === null) {
		throw new TypeError('Cannot read properties of ' + v + " (reading '" + name + "')");
	}
	const f = typeof v === 'object' ? v[name] : undefined;
	if (typeof f !== 'function') throw new TypeError('value.' + name + ' is not a function');
	return f;
}`,
	},
	collAdd: {
		uses: ['isColl', 'collPut', 'collMethod'],
		source: `/** \`x.add(v)\`. */
function collAdd(x: Json, v: Json): Json {
	if (!isColl(x, 'Set')) return collMethod(x, 'add')(v);
	collPut(x, v, v);
	return x;
}`,
	},
	collSet: {
		uses: ['isColl', 'collPut', 'collMethod'],
		source: `/** \`x.set(k, v)\`. */
function collSet(x: Json, k: Json, v: Json): Json {
	if (!isColl(x, 'Map')) return collMethod(x, 'set')(k, v);
	collPut(x, k, v);
	return x;
}`,
	},
	collGet: {
		uses: ['isColl', 'collFind', 'collMethod'],
		source: `/** \`x.get(k)\`. */
function collGet(x: Json, k: Json): Json {
	if (!isColl(x, 'Map')) return collMethod(x, 'get')(k);
	const at = collFind(x, k);
	return at < 0 ? undefined : x.vals[at];
}`,
	},
	collHas: {
		uses: ['collFind', 'collMethod'],
		source: `/** \`x.has(k)\`. */
function collHas(x: Json, k: Json): boolean {
	if (x === null || typeof x !== 'object' || x.$coll === undefined) return collMethod(x, 'has')(k);
	return collFind(x, k) >= 0;
}`,
	},
	collDelete: {
		uses: ['collFind', 'collKey', 'collMethod'],
		source: `/** \`x.delete(k)\`: removes the entry and moves the later positions down. */
function collDelete(x: Json, k: Json): boolean {
	if (x === null || typeof x !== 'object' || x.$coll === undefined) return collMethod(x, 'delete')(k);
	const at = collFind(x, k);
	if (at < 0) return false;
	const keys: Json[] = [];
	const vals: Json[] = [];
	x.index = {};
	for (let i = 0; i < x.keys.length; i++) {
		if (i === at) continue;
		const key = collKey(x.keys[i]);
		if (key !== undefined) x.index[key] = keys.length;
		keys.push(x.keys[i]);
		vals.push(x.vals[i]);
	}
	x.keys = keys;
	x.vals = vals;
	x.size = keys.length;
	return true;
}`,
	},
	collClear: {
		uses: ['collMethod'],
		source: `/** \`x.clear()\`. */
function collClear(x: Json): Json {
	if (x === null || typeof x !== 'object' || x.$coll === undefined) return collMethod(x, 'clear')();
	x.keys = [];
	x.vals = [];
	x.index = {};
	x.size = 0;
	return undefined;
}`,
	},
	collList: {
		uses: ['collMethod'],
		source: `/** \`x.keys()\`, \`x.values()\` and \`x.entries()\` of a Set, a Map or an array, as an array. */
function collList(x: Json, which: string): Json[] {
	const coll = x !== null && typeof x === 'object' && x.$coll !== undefined;
	if (!coll && !Array.isArray(x)) return collMethod(x, which)();
	const keys: Json[] = coll ? x.keys : [];
	const vals: Json[] = coll ? x.vals : x;
	if (!coll) for (let i = 0; i < x.length; i++) keys.push(i);
	const set = coll && x.$coll === 'Set';
	const out: Json[] = [];
	for (let i = 0; i < keys.length; i++) {
		if (which === 'keys') out.push(keys[i]);
		else if (which === 'values') out.push(set ? keys[i] : vals[i]);
		else out.push(set ? [keys[i], keys[i]] : [keys[i], vals[i]]);
	}
	return out;
}`,
	},
	collForEach: {
		uses: ['collMethod'],
		source: `/** \`x.forEach(f)\` of a Set, a Map or an array. */
function collForEach(x: Json, f: Json): Json {
	if (Array.isArray(x)) {
		x.forEach(f);
		return undefined;
	}
	if (x === null || typeof x !== 'object' || x.$coll === undefined) return collMethod(x, 'forEach')(f);
	// Entries added during the walk are visited too, as in JavaScript.
	for (let i = 0; i < x.keys.length; i++) {
		f(x.$coll === 'Set' ? x.keys[i] : x.vals[i], x.keys[i], x);
	}
	return undefined;
}`,
	},
	collPlainIso: {
		uses: ['luxISO'],
		source: `/** The ISO text of a DateTime, for \\\`collPlain\\\`. */
function collPlainIso(v: Json): Json {
	return luxISO(v, 'all');
}`,
	},
	collPlain: {
		uses: ['collPlainIso'],
		source: `/** A copy where each Set and Map is \`{}\`, as JSON.stringify writes them. */
function collPlain(v: Json): Json {
	if (v === null || typeof v !== 'object') return v;
	if (v.$coll !== undefined) return {};
	// A Date value writes its ISO text, or null when it is invalid.
	if (Date.is(v)) return v;
	// A Luxon DateTime writes its ISO text (toJSON), or null when it is invalid.
	if (v.$lux === true) return v.invalid === null ? collPlainIso(v) : null;
	if (Array.isArray(v)) return v.map((x: Json): Json => collPlain(x));
	const out: Json = {};
	for (const k of Object.keys(v)) out[k] = collPlain(v[k]);
	return out;
}`,
	},
	collJson: {
		uses: ['collPlain'],
		source: `/** \`JSON.stringify(value, replacer, indent)\` when the code has Sets or Maps. */
function collJson(value: Json, replacer?: Json, indent?: Json): Json {
	return indent === undefined ? JSON.stringify(collPlain(value)) : JSON.stringify(collPlain(value), null, indent);
}`,
	},
	collKeysOf: {
		uses: [],
		source: `/** \`Object.keys\`, \`values\` or \`entries\` when the code has Sets or Maps: a Set or a Map has none. */
function collKeysOf(v: Json, which: string): Json[] {
	if (v !== null && typeof v === 'object' && v.$coll !== undefined) return [];
	if (which === 'keys') return Object.keys(v);
	if (which === 'values') return Object.values(v);
	return Object.entries(v);
}`,
	},
	hasOwnOf: {
		uses: [],
		source: `/** \`x.hasOwnProperty(k)\` and \`Object.hasOwn(x, k)\` for JSON values. */
function hasOwnOf(x: Json, k: Json): boolean {
	if (x === undefined || x === null) {
		throw new TypeError('Cannot convert undefined or null to object');
	}
	const key = String(k);
	if (Array.isArray(x) || typeof x === 'string') {
		if (key === 'length') return true;
		const i = Number(key);
		return String(i) === key && Number.isInteger(i) && i >= 0 && i < x.length;
	}
	// A Date value has no key of its own.
	if (typeof x !== 'object' || Date.is(x) || !(key in x)) return false;
	// \`in\` is also true for the names of \`Object.prototype\`, which are own keys only when the object has them.
	return key.length < 7 || Object.keys(x).includes(key);
}`,
	},
	hasOwnNamedOf: {
		uses: [],
		source: `/** \`hasOwnOf\` for a key that is text and not a name of \`Object.prototype\`. */
function hasOwnNamedOf(x: Json, key: string): boolean {
	if (x === undefined || x === null) {
		throw new TypeError('Cannot convert undefined or null to object');
	}
	if (Array.isArray(x) || typeof x === 'string') {
		if (key === 'length') return true;
		const i = Number(key);
		return String(i) === key && Number.isInteger(i) && i >= 0 && i < x.length;
	}
	// A Date value has no key of its own.
	return typeof x === 'object' && !Date.is(x) && key in x;
}`,
	},
	objectPrototypeName: {
		uses: [],
		source: `/** True for the name of a property of \`Object.prototype\`. */
function objectPrototypeName(key: string): boolean {
	return (
		key === 'toString' ||
		key === 'constructor' ||
		key === 'valueOf' ||
		key === 'hasOwnProperty' ||
		key === '__proto__' ||
		key === 'toLocaleString' ||
		key === 'isPrototypeOf' ||
		key === 'propertyIsEnumerable' ||
		key === '__defineGetter__' ||
		key === '__defineSetter__' ||
		key === '__lookupGetter__' ||
		key === '__lookupSetter__'
	);
}`,
	},
	arrayOfLength: {
		uses: [],
		source: `/** \`Array(n)\`: a list of n empty places, or the list of the value when it is not a number. */
function arrayOfLength(n: Json): Json[] {
	if (typeof n !== 'number') return [n];
	if (!(n >= 0) || n > 4294967295 || Math.floor(n) !== n) {
		throw new RangeError('Invalid array length');
	}
	const out: Json[] = [];
	for (let k = 0; k < n; k++) out.push(undefined);
	return out;
}`,
	},
	arrayFill: {
		uses: [],
		source: `/** \`list.fill(v)\` for a new list. */
function arrayFill(list: Json[], v: Json): Json[] {
	for (let k = 0; k < list.length; k++) list[k] = v;
	return list;
}`,
	},
	localeCaseOf: {
		uses: [],
		source: `/** \`value.toLocaleLowerCase()\` and \`value.toLocaleUpperCase()\` without a locale. */
function localeCaseOf(value: Json, upper: boolean): string {
	if (typeof value !== 'string') {
		const name = upper ? 'toLocaleUpperCase' : 'toLocaleLowerCase';
		throw new TypeError(
			value === undefined || value === null
				? 'Cannot read properties of ' + value + " (reading '" + name + "')"
				: name + ' is not a function',
		);
	}
	return upper ? value.toUpperCase() : value.toLowerCase();
}`,
	},
	pushAll: {
		uses: [],
		source: `/** \`arr.push(...values)\`. */
function pushAll(arr: Json, values: Json[]): number {
	if (!Array.isArray(arr)) {
		throw new TypeError(
			arr === undefined || arr === null
				? 'Cannot read properties of ' + arr + " (reading 'push')"
				: 'value.push is not a function',
		);
	}
	for (const v of values) arr.push(v);
	return arr.length;
}`,
	},
	utf8Bytes: {
		uses: [],
		source: `/** The UTF-8 bytes of a string; a lone surrogate becomes U+FFFD, as in Node.js. */
function utf8Bytes(s: string): number[] {
	const out: number[] = [];
	for (let k = 0; k < s.length; k++) {
		let cp = s.charCodeAt(k);
		if (cp >= 0xd800 && cp <= 0xdbff && k + 1 < s.length) {
			const d = s.charCodeAt(k + 1);
			if (d >= 0xdc00 && d <= 0xdfff) {
				cp = (cp - 0xd800) * 0x400 + (d - 0xdc00) + 0x10000;
				k++;
			} else cp = 0xfffd;
		} else if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
		if (cp < 0x80) out.push(cp);
		else if (cp < 0x800) {
			out.push(0xc0 | (cp >> 6));
			out.push(0x80 | (cp & 63));
		} else if (cp < 0x10000) {
			out.push(0xe0 | (cp >> 12));
			out.push(0x80 | ((cp >> 6) & 63));
			out.push(0x80 | (cp & 63));
		} else {
			out.push(0xf0 | (cp >> 18));
			out.push(0x80 | ((cp >> 12) & 63));
			out.push(0x80 | ((cp >> 6) & 63));
			out.push(0x80 | (cp & 63));
		}
	}
	return out;
}`,
	},
	utf8Text: {
		uses: ['fromCharCodes'],
		source: `/** UTF-8 bytes as text; each maximal invalid subpart becomes U+FFFD (WHATWG). */
function utf8Text(b: number[]): string {
	const units: number[] = [];
	let k = 0;
	while (k < b.length) {
		const c = b[k];
		let need = 0;
		let cp = 0;
		let lo = 0x80;
		let hi = 0xbf;
		if (c < 0x80) {
			units.push(c);
			k++;
			continue;
		} else if (c >= 0xc2 && c <= 0xdf) {
			need = 1;
			cp = c & 0x1f;
		} else if (c >= 0xe0 && c <= 0xef) {
			need = 2;
			cp = c & 0x0f;
			if (c === 0xe0) lo = 0xa0;
			if (c === 0xed) hi = 0x9f;
		} else if (c >= 0xf0 && c <= 0xf4) {
			need = 3;
			cp = c & 0x07;
			if (c === 0xf0) lo = 0x90;
			if (c === 0xf4) hi = 0x8f;
		} else {
			units.push(0xfffd);
			k++;
			continue;
		}
		let j = 1;
		for (; j <= need; j++) {
			const d = k + j < b.length ? b[k + j] : -1;
			if (d < lo || d > hi) break;
			lo = 0x80;
			hi = 0xbf;
			cp = cp * 64 + (d & 63);
		}
		if (j <= need) {
			units.push(0xfffd);
			k += j;
			continue;
		}
		if (cp >= 0x10000) {
			units.push(0xd800 + Math.floor((cp - 0x10000) / 0x400));
			units.push(0xdc00 + ((cp - 0x10000) % 0x400));
		} else units.push(cp);
		k += need + 1;
	}
	// In parts, so one JSON text stays small.
	let out = '';
	for (let s = 0; s < units.length; s += 1024) out += fromCharCodes(units.slice(s, s + 1024));
	return out;
}`,
	},
	codePointText: {
		uses: ['fromCharCodes'],
		source: `/** \`String.fromCodePoint(...points)\`, with the RangeError of V8. */
function codePointText(points: Json[]): string {
	let out = '';
	for (const p of points) {
		const n = Number(p);
		if (!(n >= 0 && n <= 0x10ffff && Math.floor(n) === n)) throw new RangeError('Invalid code point ' + String(n));
		if (n < 0x10000) out += fromCharCodes([n]);
		else out += fromCharCodes([0xd800 + Math.floor((n - 0x10000) / 0x400), 0xdc00 + ((n - 0x10000) % 0x400)]);
	}
	return out;
}`,
	},
	applyList: {
		uses: [],
		source: `/** The arguments of \`f.apply(thisArg, list)\`: a list, nothing, or the members of an object with a length. */
function applyList(list: Json): Json[] {
	if (list === undefined || list === null) return [];
	if (Array.isArray(list)) return list;
	if (typeof list !== 'object') throw new TypeError('CreateListFromArrayLike called on non-object');
	const out: Json[] = [];
	const length = Math.min(Math.max(Math.trunc(Number(list.length)) || 0, 0), 4294967295);
	for (let k = 0; k < length; k++) out.push(list[String(k)]);
	return out;
}`,
	},
	promiseAll: {
		uses: [],
		source: `/** \`await Promise.all(list)\` of values that are no promises: a copy of the list, or the TypeError of V8. */
function promiseAll(list: Json): Json[] {
	if (Array.isArray(list)) return list.slice();
	if (typeof list === 'string') {
		// The code points of the text.
		const out: Json[] = [];
		for (let k = 0; k < list.length; k++) {
			const c = list.charCodeAt(k);
			const pair = c >= 0xd800 && c <= 0xdbff && k + 1 < list.length && list.charCodeAt(k + 1) >= 0xdc00 && list.charCodeAt(k + 1) <= 0xdfff;
			out.push(pair ? list.slice(k, k + 2) : list.charAt(k));
			if (pair) k++;
		}
		return out;
	}
	const what =
		list === undefined
			? 'undefined'
			: list === null
				? 'object null'
				: typeof list === 'object'
					? 'object'
					: typeof list + ' ' + String(list);
	throw new TypeError(what + ' is not iterable (cannot read property Symbol(Symbol.iterator))');
}`,
	},
	hashWords: {
		uses: [],
		source: `/** The padded message of MD5, SHA-1 and SHA-256 as 32-bit words (\`little\`: the byte order of MD5). */
function hashWords(b: number[], little: boolean): number[] {
	const bits = b.length * 8;
	const bytes = b.slice();
	bytes.push(0x80);
	while (bytes.length % 64 !== 56) bytes.push(0);
	const high = Math.floor(bits / 4294967296);
	const low = bits % 4294967296;
	const size = [(high >>> 24) & 255, (high >>> 16) & 255, (high >>> 8) & 255, high & 255, (low >>> 24) & 255, (low >>> 16) & 255, (low >>> 8) & 255, low & 255];
	for (let k = 0; k < 8; k++) bytes.push(little ? size[7 - k] : size[k]);
	const words: number[] = [];
	for (let k = 0; k < bytes.length; k += 4) {
		words.push(
			little
				? (bytes[k] | (bytes[k + 1] << 8) | (bytes[k + 2] << 16) | (bytes[k + 3] << 24)) >>> 0
				: ((bytes[k] << 24) | (bytes[k + 1] << 16) | (bytes[k + 2] << 8) | bytes[k + 3]) >>> 0,
		);
	}
	return words;
}`,
	},
	hashBytes512: {
		uses: [],
		source: `/** The digest of bytes with SHA-512 or SHA-384, as bytes. Each 64-bit word is two 32-bit words: high, low. */
function hashBytes512(alg: string, b: number[]): number[] {
	const kk = [0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0xfc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x6ca6351, 0xe003826f, 0x14292967, 0xa0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x654be30, 0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178, 0x6f067aa, 0x72176fba, 0xa637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b, 0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817];
	let h = alg === 'sha384'
		? [0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939, 0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4]
		: [0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1, 0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179];
	const bytes = b.slice();
	bytes.push(0x80);
	while (bytes.length % 128 !== 112) bytes.push(0);
	for (let k = 0; k < 8; k++) bytes.push(0);
	const bits = b.length * 8;
	const high = Math.floor(bits / 4294967296);
	const low = bits % 4294967296;
	const size = [(high >>> 24) & 255, (high >>> 16) & 255, (high >>> 8) & 255, high & 255, (low >>> 24) & 255, (low >>> 16) & 255, (low >>> 8) & 255, low & 255];
	for (const s of size) bytes.push(s);
	for (let o = 0; o < bytes.length; o += 128) {
		const x: number[] = [];
		for (let k = 0; k < 32; k++) {
			const p = o + k * 4;
			x.push(((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0);
		}
		for (let k = 16; k < 80; k++) {
			const ah = x[2 * (k - 15)];
			const al = x[2 * (k - 15) + 1];
			const s0h = (((ah >>> 1) | (al << 31)) ^ ((ah >>> 8) | (al << 24)) ^ (ah >>> 7)) >>> 0;
			const s0l = (((al >>> 1) | (ah << 31)) ^ ((al >>> 8) | (ah << 24)) ^ ((al >>> 7) | (ah << 25))) >>> 0;
			const bh = x[2 * (k - 2)];
			const bl = x[2 * (k - 2) + 1];
			const s1h = (((bh >>> 19) | (bl << 13)) ^ ((bl >>> 29) | (bh << 3)) ^ (bh >>> 6)) >>> 0;
			const s1l = (((bl >>> 19) | (bh << 13)) ^ ((bh >>> 29) | (bl << 3)) ^ ((bl >>> 6) | (bh << 26))) >>> 0;
			const lo = x[2 * (k - 16) + 1] + s0l + x[2 * (k - 7) + 1] + s1l;
			x.push((x[2 * (k - 16)] + s0h + x[2 * (k - 7)] + s1h + Math.floor(lo / 4294967296)) % 4294967296);
			x.push(lo % 4294967296);
		}
		const v = h.slice();
		for (let k = 0; k < 80; k++) {
			const eh = v[8];
			const el = v[9];
			const s1h = (((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23))) >>> 0;
			const s1l = (((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23))) >>> 0;
			const chh = ((eh & v[10]) ^ (~eh & v[12])) >>> 0;
			const chl = ((el & v[11]) ^ (~el & v[13])) >>> 0;
			const t1s = v[15] + s1l + chl + kk[2 * k + 1] + x[2 * k + 1];
			const t1h = (v[14] + s1h + chh + kk[2 * k] + x[2 * k] + Math.floor(t1s / 4294967296)) % 4294967296;
			const t1l = t1s % 4294967296;
			const ah = v[0];
			const al = v[1];
			const s0h = (((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25))) >>> 0;
			const s0l = (((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25))) >>> 0;
			const mjh = ((ah & v[2]) ^ (ah & v[4]) ^ (v[2] & v[4])) >>> 0;
			const mjl = ((al & v[3]) ^ (al & v[5]) ^ (v[3] & v[5])) >>> 0;
			const t2s = s0l + mjl;
			const t2h = (s0h + mjh + Math.floor(t2s / 4294967296)) % 4294967296;
			const ds = v[7] + t1l;
			const dh = (v[6] + t1h + Math.floor(ds / 4294967296)) % 4294967296;
			const ns = t1l + (t2s % 4294967296);
			const nh = (t1h + t2h + Math.floor(ns / 4294967296)) % 4294967296;
			for (let j = 15; j > 1; j--) v[j] = v[j - 2];
			v[8] = dh;
			v[9] = ds % 4294967296;
			v[0] = nh;
			v[1] = ns % 4294967296;
		}
		const next: number[] = [];
		for (let j = 0; j < 16; j += 2) {
			const lo = h[j + 1] + v[j + 1];
			next.push((h[j] + v[j] + Math.floor(lo / 4294967296)) % 4294967296);
			next.push(lo % 4294967296);
		}
		h = next;
	}
	const out: number[] = [];
	const words = alg === 'sha384' ? 12 : 16;
	for (let j = 0; j < words; j++) {
		const four = [(h[j] >>> 24) & 255, (h[j] >>> 16) & 255, (h[j] >>> 8) & 255, h[j] & 255];
		for (const f of four) out.push(f);
	}
	return out;
}`,
	},
	hashBytes: {
		uses: ['hashWords', 'hashBytes512'],
		source: `/** The digest of bytes with \`md5\`, \`sha1\`, \`sha256\`, \`sha384\` or \`sha512\`, as bytes. */
function hashBytes(alg: string, b: number[]): number[] {
	if (alg === 'sha512' || alg === 'sha384') return hashBytes512(alg, b);
	const little = alg === 'md5';
	const w = hashWords(b, little);
	let h: number[];
	if (alg === 'md5') {
		h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
		const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
		const t = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x2441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x4881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
		for (let o = 0; o < w.length; o += 16) {
			let a = h[0];
			let bb = h[1];
			let c = h[2];
			let d = h[3];
			for (let k = 0; k < 64; k++) {
				let f = 0;
				let g = 0;
				if (k < 16) {
					f = (bb & c) | (~bb & d);
					g = k;
				} else if (k < 32) {
					f = (d & bb) | (~d & c);
					g = (5 * k + 1) % 16;
				} else if (k < 48) {
					f = bb ^ c ^ d;
					g = (3 * k + 5) % 16;
				} else {
					f = c ^ (bb | ~d);
					g = (7 * k) % 16;
				}
				const x = ((f >>> 0) + a + t[k] + w[o + g]) % 4294967296;
				const r = shifts[Math.floor(k / 16) * 4 + (k % 4)];
				a = d;
				d = c;
				c = bb;
				bb = (bb + (((x << r) | (x >>> (32 - r))) >>> 0)) % 4294967296;
			}
			h = [(h[0] + a) % 4294967296, (h[1] + bb) % 4294967296, (h[2] + c) % 4294967296, (h[3] + d) % 4294967296];
		}
	} else if (alg === 'sha1') {
		h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
		for (let o = 0; o < w.length; o += 16) {
			const x: number[] = w.slice(o, o + 16);
			for (let k = 16; k < 80; k++) {
				const v = x[k - 3] ^ x[k - 8] ^ x[k - 14] ^ x[k - 16];
				x.push(((v << 1) | (v >>> 31)) >>> 0);
			}
			let a = h[0];
			let bb = h[1];
			let c = h[2];
			let d = h[3];
			let e = h[4];
			for (let k = 0; k < 80; k++) {
				let f = 0;
				let kk = 0;
				if (k < 20) {
					f = (bb & c) | (~bb & d);
					kk = 0x5a827999;
				} else if (k < 40) {
					f = bb ^ c ^ d;
					kk = 0x6ed9eba1;
				} else if (k < 60) {
					f = (bb & c) | (bb & d) | (c & d);
					kk = 0x8f1bbcdc;
				} else {
					f = bb ^ c ^ d;
					kk = 0xca62c1d6;
				}
				const next = ((((a << 5) | (a >>> 27)) >>> 0) + (f >>> 0) + e + kk + x[k]) % 4294967296;
				e = d;
				d = c;
				c = ((bb << 30) | (bb >>> 2)) >>> 0;
				bb = a;
				a = next;
			}
			h = [(h[0] + a) % 4294967296, (h[1] + bb) % 4294967296, (h[2] + c) % 4294967296, (h[3] + d) % 4294967296, (h[4] + e) % 4294967296];
		}
	} else {
		h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
		const kk = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0xfc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x6ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
		const rot = (v: number, n: number): number => (v >>> n) | (v << (32 - n));
		for (let o = 0; o < w.length; o += 16) {
			const x: number[] = w.slice(o, o + 16);
			for (let k = 16; k < 64; k++) {
				const s0 = rot(x[k - 15], 7) ^ rot(x[k - 15], 18) ^ (x[k - 15] >>> 3);
				const s1 = rot(x[k - 2], 17) ^ rot(x[k - 2], 19) ^ (x[k - 2] >>> 10);
				x.push((x[k - 16] + (s0 >>> 0) + x[k - 7] + (s1 >>> 0)) % 4294967296);
			}
			let a = h[0];
			let bb = h[1];
			let c = h[2];
			let d = h[3];
			let e = h[4];
			let f = h[5];
			let g = h[6];
			let hh = h[7];
			for (let k = 0; k < 64; k++) {
				const s1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25);
				const ch = (e & f) ^ (~e & g);
				const t1 = (hh + (s1 >>> 0) + (ch >>> 0) + kk[k] + x[k]) % 4294967296;
				const s0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22);
				const maj = (a & bb) ^ (a & c) ^ (bb & c);
				const t2 = ((s0 >>> 0) + (maj >>> 0)) % 4294967296;
				hh = g;
				g = f;
				f = e;
				e = (d + t1) % 4294967296;
				d = c;
				c = bb;
				bb = a;
				a = (t1 + t2) % 4294967296;
			}
			h = [(h[0] + a) % 4294967296, (h[1] + bb) % 4294967296, (h[2] + c) % 4294967296, (h[3] + d) % 4294967296, (h[4] + e) % 4294967296, (h[5] + f) % 4294967296, (h[6] + g) % 4294967296, (h[7] + hh) % 4294967296];
		}
	}
	const out: number[] = [];
	for (const v of h) {
		const four = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
		for (let k = 0; k < 4; k++) out.push(little ? four[3 - k] : four[k]);
	}
	return out;
}`,
	},
	hashArgument: {
		uses: [],
		source: `/** The text of an argument of a hash, or the TypeError of Node.js for a value that is no string. */
function hashArgument(v: Json, name: string, kinds: string): string {
	if (typeof v === 'string') return v;
	const got =
		v === undefined || v === null
			? String(v)
			: typeof v === 'number' || typeof v === 'boolean'
				? 'type ' + typeof v + ' (' + String(v) + ')'
				: 'an instance of ' + (Array.isArray(v) ? 'Array' : 'Object');
	throw new TypeError('The "' + name + '" argument must be of type string or an instance of ' + kinds + '. Received ' + got);
}`,
	},
	hashNew: {
		uses: [],
		source: `/** \`crypto.createHash(alg)\`: the algorithm is one that \`hashBytes\` has. */
function hashNew(alg: string): Json {
	return { $hash: alg, key: null, data: [], done: false };
}`,
	},
	hmacNew: {
		uses: ['hashArgument', 'hmacNewBytes', 'utf8Bytes'],
		source: `/** \`crypto.createHmac(alg, key)\` with a key that is text. */
function hmacNew(alg: string, key: Json): Json {
	return hmacNewBytes(alg, utf8Bytes(hashArgument(key, 'key', 'ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey')));
}`,
	},
	hmacNewBytes: {
		uses: ['hashBytes'],
		source: `/** \`crypto.createHmac(alg, key)\` with a key that is a Buffer. The block of SHA-384 and SHA-512 has 128 bytes. */
function hmacNewBytes(alg: string, key: number[]): Json {
	const size = alg === 'sha512' || alg === 'sha384' ? 128 : 64;
	let k = key.slice();
	if (k.length > size) k = hashBytes(alg, k);
	while (k.length < size) k.push(0);
	return { $hash: alg, key: k, data: [], done: false };
}`,
	},
	hashUpdateBytes: {
		uses: [],
		source: `/** \`hash.update(buffer)\`: gives the hash, as Node.js does. */
function hashUpdateBytes(hash: Json, data: number[]): Json {
	if (hash === undefined || hash === null) throw new TypeError('Cannot read properties of ' + hash + " (reading 'update')");
	if (typeof hash !== 'object' || typeof hash.$hash !== 'string') throw new TypeError('value.update is not a function');
	if (hash.done) throw new Error('Digest already called');
	for (const b of data) hash.data.push(b);
	return hash;
}`,
	},
	hashDigestBytes: {
		uses: ['hashBytes'],
		source: `/** \`hash.digest()\`: the digest as a Buffer. */
function hashDigestBytes(hash: Json): number[] {
	if (hash === undefined || hash === null) throw new TypeError('Cannot read properties of ' + hash + " (reading 'digest')");
	if (typeof hash !== 'object' || typeof hash.$hash !== 'string') throw new TypeError('value.digest is not a function');
	if (hash.done) throw new Error('Digest already called');
	hash.done = true;
	if (hash.key === null) return hashBytes(hash.$hash, hash.data);
	const inner: number[] = [];
	const outer: number[] = [];
	for (const b of hash.key) {
		inner.push(b ^ 0x36);
		outer.push(b ^ 0x5c);
	}
	for (const b of hash.data) inner.push(b);
	for (const b of hashBytes(hash.$hash, inner)) outer.push(b);
	return hashBytes(hash.$hash, outer);
}`,
	},
	hashUpdate: {
		uses: ['hashArgument', 'utf8Bytes'],
		source: `/** \`hash.update(text)\`: gives the hash, as Node.js does. */
function hashUpdate(hash: Json, data: Json): Json {
	if (hash === undefined || hash === null) throw new TypeError('Cannot read properties of ' + hash + " (reading 'update')");
	if (typeof hash !== 'object' || typeof hash.$hash !== 'string') throw new TypeError('value.update is not a function');
	if (hash.done) throw new Error('Digest already called');
	const text = hashArgument(data, 'data', 'Buffer, TypedArray, or DataView');
	for (const b of utf8Bytes(text)) hash.data.push(b);
	return hash;
}`,
	},
	hashDigest: {
		uses: ['hashDigestBytes', 'base64Of'],
		source: `/** \`hash.digest(encoding)\` for the encodings hex, base64 and base64url. */
function hashDigest(hash: Json, encoding: string): string {
	const out = hashDigestBytes(hash);
	if (encoding !== 'hex') return base64Of(out, encoding === 'base64url');
	let hex = '';
	for (const b of out) hex += '0123456789abcdef'.charAt(b >>> 4) + '0123456789abcdef'.charAt(b & 15);
	return hex;
}`,
	},
	base64Of: {
		uses: [],
		source: `/** Base64 (or base64url, without padding) of bytes. */
function base64Of(b: number[], url: boolean): string {
	const abc = url
		? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
		: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	let out = '';
	for (let k = 0; k < b.length; k += 3) {
		const n = b[k] * 65536 + (k + 1 < b.length ? b[k + 1] * 256 : 0) + (k + 2 < b.length ? b[k + 2] : 0);
		out += abc.charAt(Math.floor(n / 262144) % 64) + abc.charAt(Math.floor(n / 4096) % 64);
		out += k + 1 < b.length ? abc.charAt(Math.floor(n / 64) % 64) : url ? '' : '=';
		out += k + 2 < b.length ? abc.charAt(n % 64) : url ? '' : '=';
	}
	return out;
}`,
	},
	base64Bytes: {
		uses: [],
		source: `/** Bytes of base64 or base64url text, as Node.js decodes it: other characters are skipped, \`=\` ends it. */
function base64Bytes(s: string): number[] {
	const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	const out: number[] = [];
	let acc = 0;
	let bits = 0;
	for (let k = 0; k < s.length; k++) {
		const c = s.charAt(k);
		if (c === '=') break;
		let v = abc.indexOf(c);
		if (c === '-') v = 62;
		if (c === '_') v = 63;
		if (v < 0) continue;
		acc = (acc * 64 + v) % 16777216;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out.push(Math.floor(acc / 2 ** bits) % 256);
		}
	}
	return out;
}`,
	},
	bufferConvert: {
		uses: ['bufFrom', 'bufText'],
		source: `/** \`Buffer.from(value, from).toString(to)\`. */
function bufferConvert(value: Json, from: Json, to: Json): string {
	return bufText(bufFrom(value, from), to);
}`,
	},
	mathImul: {
		uses: [],
		source: `/** Math.imul: the low 32 bits of the product of two 32-bit integers, signed. */
function mathImul(a: Json, b: Json): number {
	const x = Number(a) | 0;
	const y = Number(b) | 0;
	const xl = x & 0xffff;
	const yl = y & 0xffff;
	const mid = ((((x >>> 16) & 0xffff) * yl + xl * ((y >>> 16) & 0xffff)) << 16) >>> 0;
	return (xl * yl + mid) | 0;
}`,
	},
	nodeNotRun: {
		uses: [],
		source: `/** The error of v1 for a read of the items of a node that has no run. It has no line. */
function nodeNotRun(name: string): Json {
	throw { name: 'ExpressionError', message: "Node '" + name + "' hasn't been executed", $line: null };
}`,
	},
	pairedAt: {
		uses: [],
		source: `/**
 * \\\`$(name).itemMatching(k)\\\` of a node whose items pair with the input items by position:
 * item k, with v1's errors. v1 reads input item k with \\\`k\\\` as a key, so the text of an
 * index counts too. The errors of v1 here have no line.
 */
function pairedAt(list: Json[], k: Json): Json {
	if (k === undefined) throw { name: 'ExpressionError', message: 'Missing item index for .itemMatching()', $line: null };
	const index: number = typeof k === 'number' ? k : typeof k === 'string' && String(Number(k)) === k ? Number(k) : -1;
	if (!(index >= 0 && index < list.length && Math.floor(index) === index)) {
		throw { name: 'ExpressionError', message: 'Can’t get data', $line: null };
	}
	return list[index];
}`,
	},
	pairedMatch: {
		uses: [],
		source: `/**
 * \\\`$(name).itemMatching(k)\\\` of a node whose paired items the nodes on the way keep:
 * item \\\`index(k)\\\` of the node, with v1's errors. v1 reads input item k with \\\`k\\\` as a key,
 * so the text of an index counts too. The errors of v1 here have no line.
 */
function pairedMatch(list: Json[], inputCount: number, k: Json, index: (k: number) => number): Json {
	if (k === undefined) throw { name: 'ExpressionError', message: 'Missing item index for .itemMatching()', $line: null };
	const at: number = typeof k === 'number' ? k : typeof k === 'string' && String(Number(k)) === k ? Number(k) : -1;
	if (!(at >= 0 && at < inputCount && Math.floor(at) === at)) {
		throw { name: 'ExpressionError', message: 'Can’t get data', $line: null };
	}
	return list[index(at)];
}`,
	},
	nodeJsonAt: {
		uses: [],
		source: `/**
 * \\\`$node[name].json\\\` in "each item" mode of v1: the item of the node at the index of the
 * current item, with the errors of v1 past the last item.
 */
function nodeJsonAt(list: Json[], k: number, name: string): Json {
	if (list.length === 0) throw { name: 'ExpressionError', message: "Node '" + name + "' hasn't been executed", $line: null };
	if (list.length <= k) {
		throw { name: 'ExpressionError', message: '"' + name + '" node has ' + list.length + " item(s) but you're trying to access item " + k, $line: null };
	}
	return list[k].json;
}`,
	},
	itemOfNode: {
		uses: [],
		source: `/** \\\`$item(k).$node[name].json\\\`: the JSON of item k of the node, with v1's errors. */
function itemOfNode(list: Json[], k: Json, name: string): Json {
	if (list.length === 0) throw new Error("Node '" + name + "' hasn't been executed");
	if (list.length <= k) {
		throw new Error('"' + name + '" node has ' + list.length + " item(s) but you're trying to access item " + k);
	}
	return list[k].json;
}`,
	},
	errText: {
		uses: [],
		source: `/** \`String(e)\` of a caught value, as V8's Error.prototype.toString gives it for errors. */
function errText(e: Json): string {
	if (e !== null && typeof e === 'object' && typeof e.message === 'string' && typeof e.name === 'string') {
		if (e.name === '') return e.message;
		if (e.message === '') return e.name;
		return e.name + ': ' + e.message;
	}
	return String(e);
}`,
	},
	errTextOf: {
		uses: ['errText'],
		source: `/** \`String(e)\` of a caught value in code that makes requests: the error of a request is a plain object in v1. */
function errTextOf(e: Json): string {
	if (e !== null && typeof e === 'object' && e.$request === true) return '[object Object]';
	return errText(e);
}`,
	},
	codeHttpHeaderKey: {
		uses: [],
		source: `/** The key of the header \`name\` (lower case) in \`headers\`, or undefined: n8n's \`searchForHeader\`. */
function codeHttpHeaderKey(headers: Json, name: string): Json {
	for (const key of Object.keys(headers)) {
		if (key.toLowerCase() === name) return key;
	}
	return undefined;
}`,
	},
	codeHttpFormText: {
		uses: [],
		source: `/** A name or a value of a form body as axios encodes it (\`AxiosURLSearchParams\`). */
function codeHttpFormText(value: Json): string {
	const text = encodeURIComponent(String(value));
	let out = '';
	for (let k = 0; k < text.length; k++) {
		const c = text.charAt(k);
		if (c === '!') out += '%21';
		else if (c === "'") out += '%27';
		else if (c === '(') out += '%28';
		else if (c === ')') out += '%29';
		else if (c === '~') out += '%7E';
		else if (c === '%' && text.slice(k + 1, k + 3) === '20') {
			out += '+';
			k += 2;
		} else if (c === '%' && text.slice(k + 1, k + 3) === '00') {
			out += '\\u0000';
			k += 2;
		} else out += c;
	}
	return out;
}`,
	},
	codeHttpFormPairs: {
		uses: ['codeHttpFormText'],
		source: `/**
 * The pairs of a form body, as axios makes them from an object (\`toFormData\` with its default
 * visitor): a list of plain values at the top is \`name[]\`, a nested value is \`a[b]\`, a name
 * that ends with \`{}\` holds JSON text, and null and undefined give no pair.
 */
function codeHttpFormPairs(value: Json, path: Json, pairs: string[]): void {
	const isList = Array.isArray(value);
	const keys: Json[] = isList ? value.map((x: Json, k: number): Json => k) : Object.keys(value);
	for (const rawKey of keys) {
		let el: Json = value[rawKey];
		if (el === undefined || el === null) continue;
		let key: Json = typeof rawKey === 'string' ? rawKey.trim() : rawKey;
		const visitable = typeof el === 'object';
		if (visitable && path === null) {
			const name = String(key);
			if (name.endsWith('{}')) {
				el = JSON.stringify(el);
			} else if (Array.isArray(el) && !el.some((x: Json): boolean => x !== null && typeof x === 'object')) {
				const base = name.endsWith('[]') ? name.slice(0, name.length - 2) : name;
				for (const item of el) {
					if (item === undefined || item === null) continue;
					pairs.push(codeHttpFormText(base + '[]') + '=' + codeHttpFormText(item));
				}
				continue;
			}
		}
		if (el !== null && typeof el === 'object') {
			codeHttpFormPairs(el, path === null ? [key] : path.concat([key]), pairs);
			continue;
		}
		let name = String(key);
		if (path !== null) {
			name = '';
			const tokens: Json[] = path.concat([key]);
			for (let k = 0; k < tokens.length; k++) {
				let token = String(tokens[k]);
				if (token.endsWith('[]')) token = token.slice(0, token.length - 2);
				name += k === 0 ? token : '[' + token + ']';
			}
		}
		pairs.push(codeHttpFormText(name) + '=' + codeHttpFormText(el));
	}
}`,
	},
	codeHttpArgs: {
		uses: ['codeHttpHeaderKey', 'codeHttpFormPairs'],
		source: `/**
 * The \`http\` request of \`this.helpers.httpRequest(options)\`, as n8n and axios send it
 * (\`convertN8nRequestToAxios\` of n8n, \`transformRequest\` of axios):
 * - the default method is GET; a request whose method is GET has no body;
 * - a header with the value null, undefined or false is not sent; other values are text;
 * - without an \`accept\` header, \`json\` asks for JSON, else axios asks for its default;
 * - an empty body (no text, no members) is not sent; an object goes as JSON text, or as a
 *   form when the content type is \`application/x-www-form-urlencoded\`; a text with a JSON
 *   content type goes trimmed when it is JSON, else as a JSON string;
 * - a text body of POST, PUT and PATCH gets the form content type when the code sets none.
 * The body is always text, so the bytes are those of \`JSON.stringify\`.
 */
function codeHttpArgs(o: Json): Json {
	const given: Json = o.headers !== null && typeof o.headers === 'object' ? o.headers : {};
	const method: string = o.method === undefined || o.method === null ? 'GET' : String(o.method).toUpperCase();
	const headers: Json = {};
	for (const key of Object.keys(given)) {
		const v: Json = given[key];
		if (v === undefined || v === null || v === false) continue;
		headers[key] = Array.isArray(v) ? v.map((x: Json): string => String(x)).join(', ') : String(v);
	}
	if (codeHttpHeaderKey(given, 'accept') === undefined) {
		headers.accept = o.json ? 'application/json' : 'application/json, text/plain, */*';
	}
	if (codeHttpHeaderKey(given, 'user-agent') === undefined) headers['user-agent'] = 'n8n';
	const b: Json = o.body;
	let data: Json = undefined;
	if (b && !(o.method !== undefined && o.method !== null && method === 'GET')) {
		if (typeof b === 'string') data = b;
		else if (typeof b === 'object' && (Array.isArray(b) ? b.length > 0 : Object.keys(b).length > 0)) data = b;
	}
	const typeKey: Json = codeHttpHeaderKey(headers, 'content-type');
	const type: string = typeKey === undefined ? '' : headers[typeKey];
	let body: Json = undefined;
	if (typeof data === 'string') {
		body = data;
		if (typeKey === undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
			headers['content-type'] = 'application/x-www-form-urlencoded';
		}
		if (type.indexOf('application/json') > -1) {
			try {
				JSON.parse(data);
				body = data.trim();
			} catch (e) {
				body = JSON.stringify(data);
			}
		}
	} else if (data !== undefined) {
		if (type.indexOf('application/x-www-form-urlencoded') > -1) {
			const pairs: string[] = [];
			codeHttpFormPairs(data, null, pairs);
			body = pairs.join('&');
		} else {
			body = JSON.stringify(data);
			if (typeKey === undefined) headers['content-type'] = 'application/json';
		}
	}
	const qs: Json = o.qs !== null && typeof o.qs === 'object' && Object.keys(o.qs).length > 0 ? o.qs : undefined;
	const timeoutMs: Json = typeof o.timeout === 'number' && o.timeout > 0 ? o.timeout : undefined;
	return { method, url: o.url, headers, qs, body, timeoutMs };
}`,
	},
	codeHttpResult: {
		uses: ['codeHttpHeaderKey'],
		source: `/**
 * The result of \`this.helpers.httpRequest(options)\` for the response of the \`http\` effect.
 * As axios: a body that is text is parsed as JSON when it parses (the runtime did this
 * already for a response with a JSON content type). A status outside 200-299 throws the error
 * as v1's Code node gets it (\`AxiosError.toJSON\` through the task runner): a plain object with
 * \`message\`, \`name\`, \`code\` and \`status\`. \`$request\` marks it for \`errTextOf\`.
 */
function codeHttpResult(o: Json, r: Json): Json {
	let body: Json = r.body === undefined ? '' : r.body;
	if (typeof body === 'string' && body !== '') {
		const typeKey: Json = codeHttpHeaderKey(r.headers, 'content-type');
		const json = typeKey !== undefined && String(r.headers[typeKey]).toLowerCase().indexOf('json') > -1;
		if (!json) {
			try {
				body = JSON.parse(body.charAt(0) === '\\uFEFF' ? body.slice(1) : body);
			} catch (e) {
				body = r.body;
			}
		}
	}
	const status: number = r.status;
	if (!o.ignoreHttpStatusErrors && (status < 200 || status >= 300)) {
		const error: Json = { message: 'Request failed with status code ' + status, name: 'AxiosError', status, $request: true };
		error.code = status >= 400 && status < 500 ? 'ERR_BAD_REQUEST' : 'ERR_BAD_RESPONSE';
		throw error;
	}
	// The full response: the code reads only these members of it (\`fullResponseFits\`).
	return o.returnFullResponse ? { body, statusCode: status } : body;
}`,
	},
	mcheck: {
		uses: ['isRegex', 'isColl'],
		source: `/**
 * The receiver of a method call in a try block whose catch reads the error: it throws
 * V8's "<callee> is not a function" when the value has no such method, as V8 does.
 */
function mcheck(v: Json, name: string, text: string): Json {
	if (v === undefined || v === null) return v;
	const obj = ['hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf'];
	let methods: string[] = obj;
	const t = typeof v;
	if (t === 'string') {
		methods = ['anchor', 'at', 'big', 'blink', 'bold', 'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith', 'fixed', 'fontcolor', 'fontsize', 'includes', 'indexOf', 'isWellFormed', 'italics', 'lastIndexOf', 'link', 'localeCompare', 'match', 'matchAll', 'normalize', 'padEnd', 'padStart', 'repeat', 'replace', 'replaceAll', 'search', 'slice', 'small', 'split', 'startsWith', 'strike', 'sub', 'substr', 'substring', 'sup', 'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toString', 'toUpperCase', 'toWellFormed', 'trim', 'trimEnd', 'trimLeft', 'trimRight', 'trimStart', 'valueOf'];
	} else if (t === 'number') {
		methods = ['toExponential', 'toFixed', 'toLocaleString', 'toPrecision', 'toString', 'valueOf'];
	} else if (t === 'boolean') {
		methods = ['toString', 'valueOf'];
	} else if (t === 'function') {
		methods = ['apply', 'bind', 'call', 'toString'];
	} else if (Array.isArray(v)) {
		methods = ['at', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'findLast', 'findLastIndex', 'flat', 'flatMap', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'toLocaleString', 'toReversed', 'toSorted', 'toSpliced', 'toString', 'unshift', 'values', 'with'];
	} else if (isRegex(v)) {
		methods = ['compile', 'exec', 'test', 'toString'];
	} else if (isColl(v, 'Set')) {
		methods = ['add', 'clear', 'delete', 'entries', 'forEach', 'has', 'keys', 'values'];
	} else if (isColl(v, 'Map')) {
		methods = ['clear', 'delete', 'entries', 'forEach', 'get', 'has', 'keys', 'set', 'values'];
	} else if (Date.is(v)) {
		methods = ['getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getTime', 'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear', 'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth', 'getUTCSeconds', 'getYear', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds', 'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds', 'setYear', 'toDateString', 'toGMTString', 'toISOString', 'toJSON', 'toLocaleDateString', 'toLocaleString', 'toLocaleTimeString', 'toString', 'toTimeString', 'toUTCString', 'valueOf'];
	} else if (v.$lux === true || v.$dur === true) {
		return v;
	} else if (typeof v.$hash === 'string' && (name === 'update' || name === 'digest')) {
		return v;
	} else if (typeof v[name] === 'function') {
		return v;
	} else if (Object.keys(v).includes(name)) {
		methods = [];
	}
	if (!methods.includes(name)) throw new TypeError(text + ' is not a function');
	return v;
}`,
	},
	optCall: {
		uses: [],
		source: `/** \`x?.m(...)\`: undefined for a nullish receiver, else the call. */
function optCall(v: Json, f: Json): Json {
	return v === undefined || v === null ? undefined : f(v);
}`,
	},
	nodeByName: {
		uses: ['codeClone', 'codeWrap'],
		source: `/**
 * \\\`$(name).all()\\\` and its forms for a computed name, as the fallback host gives them:
 * a node that did not run before has no items.
 */
function nodeByName(nodes: Json, name: Json, which: string): Json {
	const key = String(name);
	const raw: Json[] = Object.keys(nodes).includes(key) ? nodes[key] : [];
	if (nodes.$cache === undefined) nodes.$cache = {};
	if (!Object.keys(nodes.$cache).includes(key)) nodes.$cache[key] = codeClone(raw).map(codeWrap);
	const list: Json[] = nodes.$cache[key];
	if (which === 'all') return list;
	if (which === 'first' || which === 'item') return list[0];
	if (which === 'last') return list[list.length - 1];
	return list.length > 0;
}`,
	},
	looseEq: {
		uses: [],
		source: `/** \`a == b\` (IsLooselyEqual of ECMAScript) for JSON values. */
function looseEq(a: Json, b: Json): boolean {
	if (a === undefined || a === null) return b === undefined || b === null;
	if (b === undefined || b === null) return false;
	const ta = typeof a;
	const tb = typeof b;
	if (ta === tb) return a === b;
	if (ta === 'boolean') return looseEq(Number(a), b);
	if (tb === 'boolean') return looseEq(a, Number(b));
	if (ta === 'number' && tb === 'string') return a === Number(b);
	if (ta === 'string' && tb === 'number') return Number(a) === b;
	if (ta === 'object' && tb !== 'function') return looseEq(String(a), b);
	if (tb === 'object' && ta !== 'function') return looseEq(a, String(b));
	return false;
}`,
	},
	dateSetter: {
		uses: [],
		source: `/**
 * A setter of a Date value: \`v.setHours(...a)\`. The Date value takes the new time, so each
 * reference to it reads the change. The result is the new time value. A value that is no Date
 * gives the TypeError of JavaScript for the call \`text()\`, after the arguments ran.
 */
function dateSetter(name: string, text: string, v: Json, a: Json[]): number {
	let d = new Date(Date.of(v, name, text));
	const n = a.length;
	if (name === 'setTime') d.setTime(a[0]);
	else if (name === 'setMilliseconds') d.setMilliseconds(a[0]);
	else if (name === 'setUTCMilliseconds') d.setUTCMilliseconds(a[0]);
	else if (name === 'setDate') d.setDate(a[0]);
	else if (name === 'setUTCDate') d.setUTCDate(a[0]);
	else if (name === 'setSeconds') {
		if (n > 1) d.setSeconds(a[0], a[1]);
		else d.setSeconds(a[0]);
	} else if (name === 'setUTCSeconds') {
		if (n > 1) d.setUTCSeconds(a[0], a[1]);
		else d.setUTCSeconds(a[0]);
	} else if (name === 'setMonth') {
		if (n > 1) d.setMonth(a[0], a[1]);
		else d.setMonth(a[0]);
	} else if (name === 'setUTCMonth') {
		if (n > 1) d.setUTCMonth(a[0], a[1]);
		else d.setUTCMonth(a[0]);
	} else if (name === 'setMinutes') {
		if (n > 2) d.setMinutes(a[0], a[1], a[2]);
		else if (n > 1) d.setMinutes(a[0], a[1]);
		else d.setMinutes(a[0]);
	} else if (name === 'setUTCMinutes') {
		if (n > 2) d.setUTCMinutes(a[0], a[1], a[2]);
		else if (n > 1) d.setUTCMinutes(a[0], a[1]);
		else d.setUTCMinutes(a[0]);
	} else if (name === 'setFullYear') {
		if (n > 2) d.setFullYear(a[0], a[1], a[2]);
		else if (n > 1) d.setFullYear(a[0], a[1]);
		else d.setFullYear(a[0]);
	} else if (name === 'setUTCFullYear') {
		if (n > 2) d.setUTCFullYear(a[0], a[1], a[2]);
		else if (n > 1) d.setUTCFullYear(a[0], a[1]);
		else d.setUTCFullYear(a[0]);
	} else if (name === 'setHours') {
		if (n > 3) d.setHours(a[0], a[1], a[2], a[3]);
		else if (n > 2) d.setHours(a[0], a[1], a[2]);
		else if (n > 1) d.setHours(a[0], a[1]);
		else d.setHours(a[0]);
	} else {
		if (n > 3) d.setUTCHours(a[0], a[1], a[2], a[3]);
		else if (n > 2) d.setUTCHours(a[0], a[1], a[2]);
		else if (n > 1) d.setUTCHours(a[0], a[1]);
		else d.setUTCHours(a[0]);
	}
	return Date.set(v, d.getTime());
}`,
	},
	valueOfOf: {
		uses: [],
		source: `/** \`v.valueOf()\`: the time value of a Date value, the result of a function of the value, else the value. */
function valueOfOf(v: Json, text: string): Json {
	if (Date.is(v)) return Date.of(v, 'valueOf', text).getTime();
	if (v === undefined || v === null) {
		throw new TypeError('Cannot read properties of ' + v + " (reading 'valueOf')");
	}
	const f: Json = typeof v === 'object' ? v.valueOf : undefined;
	return typeof f === 'function' ? f() : v;
}`,
	},
	toJsonOf: {
		uses: [],
		source: `/** \`v.toJSON()\`: the ISO text of a Date value (null for an invalid Date), or the result of a function of the value. */
function toJsonOf(v: Json, text: string): Json {
	if (Date.is(v)) return Date.of(v, 'toJSON', text).toJSON();
	if (v === undefined || v === null) {
		throw new TypeError('Cannot read properties of ' + v + " (reading 'toJSON')");
	}
	const f: Json = typeof v === 'object' ? v.toJSON : undefined;
	if (typeof f !== 'function') throw new TypeError(text + ' is not a function');
	return f();
}`,
	},
	toStringOf: {
		uses: [],
		source: `/** \`v.toString()\`. */
function toStringOf(v: Json): string {
	if (v === undefined || v === null) {
		throw new TypeError('Cannot read properties of ' + v + " (reading 'toString')");
	}
	return String(v);
}`,
	},
	toStringRadix: {
		uses: ['toStringOf'],
		source: `/** \`v.toString(radix)\`: only numbers read the radix. */
function toStringRadix(v: Json, radix: Json): string {
	if (typeof v === 'number') {
		const n: number = v;
		return n.toString(radix);
	}
	return toStringOf(v);
}`,
	},
};

/** The names of the helpers that \`names\` need, with the ones that they use. */
export function codeHelperNames(names: Iterable<string>): Set<string> {
	const all = new Set<string>();
	const add = (n: string) => {
		const h = Object.hasOwn(CODE_HELPERS, n) ? CODE_HELPERS[n] : undefined;
		if (h === undefined || all.has(n)) return;
		all.add(n);
		for (const u of h.uses) add(u);
	};
	for (const n of names) add(n);
	return all;
}

/** The sources of the helpers \`names\`, in the order of the table. */
export function codeHelperSources(names: Set<string>): string[] {
	return Object.keys(CODE_HELPERS)
		.filter((n) => names.has(n))
		.map((n) => CODE_HELPERS[n].source);
}
