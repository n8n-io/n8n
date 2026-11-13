/**
 * Helper functions of native Code node steps, as subset source. The
 * converter appends the ones that a workflow uses (`../helpers.ts`).
 *
 * `codeWrap` and `codeItems` copy the item handling of the fallback host
 * (`code-node.ts` prologue and `items.ts` of the host), so a native step gives
 * the same items as a host step.
 */

import { LOCALE_HELPERS } from './locale-helpers.ts';
import { LUXON_HELPERS } from './luxon-helpers.ts';

export interface CodeHelperSource {
	uses: string[];
	source: string;
}

export const CODE_HELPERS: Record<string, CodeHelperSource> = {
	// Locale formatting (\`locale-helpers.ts\`) and the Luxon subset (\`luxon-helpers.ts\`).
	...LOCALE_HELPERS,
	...LUXON_HELPERS,
	codeClone: {
		uses: [],
		source: `/** A JSON copy of an item list, as the fallback host gets it. */
function codeClone(list: Json[]): Json[] {
	return JSON.parse(JSON.stringify(list));
}`,
	},
	codeWrap: {
		uses: [],
		source: `/** An input item as the Code node gets it: \`{ json }\`, with \`binary\` from \`$binary\`. */
function codeWrap(j: Json): Json {
	if (j !== null && typeof j === 'object' && j.$binary) {
		const json: Json = {};
		for (const k of Object.keys(j)) if (k !== '$binary') json[k] = j[k];
		return { json, binary: j.$binary };
	}
	return { json: j };
}`,
	},
	codeWrapJson: {
		uses: [],
		source: `/** An item of another node as the Code node gets it from \`$('Node')\`. */
function codeWrapJson(j: Json): Json {
	return { json: j };
}`,
	},
	codeItem: {
		uses: [],
		source: `/** One result entry: an n8n item gives its \`json\` (and \`$binary\`), other objects stay. */
function codeItem(e: Json): Json {
	const json = e.json;
	if (json === null || typeof json !== 'object' || Array.isArray(json)) return e;
	for (const key of Object.keys(e)) {
		if (
			key !== 'json' &&
			key !== 'binary' &&
			key !== 'pairedItem' &&
			key !== 'error' &&
			key !== 'index'
		) {
			return e;
		}
	}
	const binary = e.binary;
	if (
		binary !== null &&
		typeof binary === 'object' &&
		!Array.isArray(binary) &&
		Object.keys(binary).length > 0
	) {
		return { ...json, $binary: binary };
	}
	return json;
}`,
	},
	codeItems: {
		uses: ['codeItem'],
		source: `/** The result list of a Code node: a JSON copy, one object becomes a list of one. */
function codeItems(value: Json): Json[] {
	const text: Json = JSON.stringify(value === undefined ? null : value);
	if (text === undefined) throw new Error('Code returned a value that is not JSON');
	const parsed: Json = JSON.parse(text);
	if (parsed === null) return [];
	const list: Json[] = Array.isArray(parsed) ? parsed : [parsed];
	const out: Json[] = [];
	for (let k = 0; k < list.length; k++) {
		const e = list[k];
		if (e === null || typeof e !== 'object' || Array.isArray(e)) {
			throw new Error(
				'Code must return an object or an array of objects. Result item ' + k + ' is not an object',
			);
		}
		out.push(codeItem(e));
	}
	return out;
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
	if (typeof x !== 'object') return false;
	return key in x;
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
		uses: ['utf8Bytes', 'utf8Text', 'base64Of', 'base64Bytes'],
		source: `/** \`Buffer.from(value, from).toString(to)\` for the encodings utf8, base64, base64url, hex and latin1. */
function bufferConvert(value: Json, from: Json, to: Json): string {
	const fe = from === undefined ? 'utf8' : String(from).toLowerCase();
	const te = to === undefined ? 'utf8' : String(to).toLowerCase();
	let b: number[] = [];
	if (Array.isArray(value)) {
		for (const x of value) b.push(((Math.trunc(Number(x)) % 256) + 256) % 256 || 0);
	} else if (typeof value !== 'string') {
		throw new TypeError('The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object.');
	} else if (fe === 'utf8' || fe === 'utf-8') b = utf8Bytes(value);
	else if (fe === 'base64' || fe === 'base64url') b = base64Bytes(value);
	else if (fe === 'hex') {
		for (let k = 0; k + 1 < value.length; k += 2) {
			const h = '0123456789abcdef'.indexOf(value.charAt(k).toLowerCase());
			const l = '0123456789abcdef'.indexOf(value.charAt(k + 1).toLowerCase());
			if (h < 0 || l < 0) break;
			b.push(h * 16 + l);
		}
	} else if (fe === 'latin1' || fe === 'binary') {
		for (let k = 0; k < value.length; k++) b.push(value.charCodeAt(k) % 256);
	} else throw new TypeError('Unknown encoding: ' + fe);
	if (te === 'utf8' || te === 'utf-8') return utf8Text(b);
	if (te === 'base64') return base64Of(b, false);
	if (te === 'base64url') return base64Of(b, true);
	if (te === 'hex') {
		let out = '';
		for (const x of b) out += x.toString(16).padStart(2, '0');
		return out;
	}
	throw new TypeError('Unknown encoding: ' + te);
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
	} else if (v.$lux === true || v.$dur === true) {
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
		uses: ['codeClone', 'codeWrapJson'],
		source: `/**
 * \\\`$(name).all()\\\` and its forms for a computed name, as the fallback host gives them:
 * a node that did not run before has no items.
 */
function nodeByName(nodes: Json, name: Json, which: string): Json {
	const key = String(name);
	const raw: Json[] = Object.keys(nodes).includes(key) ? nodes[key] : [];
	if (nodes.$cache === undefined) nodes.$cache = {};
	if (!Object.keys(nodes.$cache).includes(key)) nodes.$cache[key] = codeClone(raw).map(codeWrapJson);
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
