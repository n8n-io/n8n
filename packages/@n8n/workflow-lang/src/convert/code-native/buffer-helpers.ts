/**
 * Helpers for `Buffer` values of Code nodes, as subset source (`helpers.ts` holds the table).
 *
 * A Buffer of the code is a list of its bytes (`number[]`). The translation lets such a
 * value go only to the places that these helpers serve (`translate.ts`, "Buffer values"), so
 * the code cannot see that the value is a list. Each helper copies the rules of Node.js
 * 22 (`lib/buffer.js`): the encodings, the values that `Buffer.from` takes, and the errors.
 */
import type { CodeHelperSource } from './helpers.ts';

export const BUFFER_HELPERS: Record<string, CodeHelperSource> = {
	bufGot: {
		uses: [],
		source: `/** The "Received ..." part of an ERR_INVALID_ARG_TYPE message of Node.js, for a value that is no text. */
function bufGot(v: Json): string {
	if (v === undefined || v === null) return String(v);
	if (typeof v === 'number') return 'type number (' + (v === 0 && 1 / v < 0 ? '-0' : String(v)) + ')';
	if (typeof v === 'boolean') return 'type boolean (' + String(v) + ')';
	return 'an instance of ' + (Array.isArray(v) ? 'Array' : 'Object');
}`,
	},
	bufEncoding: {
		uses: [],
		source: `/** The encoding that a name means (the names of Node.js, in any case), or the error of Node.js. */
function bufEncoding(name: string): string {
	const e = name.toLowerCase();
	if (e === 'utf8' || e === 'utf-8') return 'utf8';
	if (e === 'ucs2' || e === 'ucs-2' || e === 'utf16le' || e === 'utf-16le') return 'utf16le';
	if (e === 'latin1' || e === 'binary') return 'latin1';
	if (e === 'base64' || e === 'base64url' || e === 'ascii' || e === 'hex') return e;
	throw new TypeError('Unknown encoding: ' + name);
}`,
	},
	bufByte: {
		uses: [],
		source: `/** A value as one byte, as a typed array of bytes takes it. */
function bufByte(x: Json): number {
	const n = Math.trunc(Number(x));
	return isNaN(n) || !Number.isFinite(n) ? 0 : ((n % 256) + 256) % 256;
}`,
	},
	bufFrom: {
		uses: ['bufGot', 'bufEncoding', 'bufByte', 'utf8Bytes', 'base64Bytes'],
		source: `/** Buffer.from(value, encoding) for text, a list, a Buffer, an array-like object and the JSON form of a Buffer. */
function bufFrom(value: Json, encoding: Json): number[] {
	const out: number[] = [];
	if (typeof value === 'string') {
		const e = typeof encoding === 'string' && encoding.length > 0 ? bufEncoding(encoding) : 'utf8';
		if (e === 'utf8') return utf8Bytes(value);
		if (e === 'base64' || e === 'base64url') return base64Bytes(value);
		if (e === 'hex') {
			for (let k = 0; k + 1 < value.length; k += 2) {
				const h = '0123456789abcdef'.indexOf(value.charAt(k).toLowerCase());
				const l = '0123456789abcdef'.indexOf(value.charAt(k + 1).toLowerCase());
				if (h < 0 || l < 0) break;
				out.push(h * 16 + l);
			}
			return out;
		}
		for (let k = 0; k < value.length; k++) {
			const c = value.charCodeAt(k);
			out.push(c % 256);
			if (e === 'utf16le') out.push(Math.floor(c / 256));
		}
		return out;
	}
	if (value !== null && typeof value === 'object') {
		if (Array.isArray(value)) {
			for (const x of value) out.push(bufByte(x));
			return out;
		}
		if (value.length !== undefined) {
			if (typeof value.length !== 'number') return out;
			for (let k = 0; k < value.length; k++) out.push(bufByte(value[String(k)]));
			return out;
		}
		if (value.type === 'Buffer' && Array.isArray(value.data)) {
			for (const x of value.data) out.push(bufByte(x));
			return out;
		}
	}
	throw new TypeError('The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received ' + bufGot(value));
}`,
	},
	bufText: {
		uses: ['bufEncoding', 'utf8Text', 'base64Of', 'fromCharCodes'],
		source: `/** buffer.toString(encoding). An empty Buffer gives an empty text before Node.js reads the encoding. */
function bufText(b: number[], encoding: Json): string {
	if (b.length === 0) return '';
	const e = encoding === undefined ? 'utf8' : bufEncoding(String(encoding));
	if (e === 'utf8') return utf8Text(b);
	if (e === 'base64') return base64Of(b, false);
	if (e === 'base64url') return base64Of(b, true);
	if (e === 'hex') {
		let out = '';
		for (const x of b) out += '0123456789abcdef'.charAt(x >>> 4) + '0123456789abcdef'.charAt(x & 15);
		return out;
	}
	const units: number[] = [];
	if (e === 'utf16le') {
		for (let k = 0; k + 1 < b.length; k += 2) units.push(b[k] + b[k + 1] * 256);
	} else {
		for (const x of b) units.push(e === 'ascii' ? x & 127 : x);
	}
	return fromCharCodes(units);
}`,
	},
	bufConcat: {
		uses: [],
		source: `/** Buffer.concat(list) of Buffers. */
function bufConcat(list: number[][]): number[] {
	const out: number[] = [];
	for (const b of list) {
		for (const x of b) out.push(x);
	}
	return out;
}`,
	},
	bufSlice: {
		uses: [],
		source: `/** buffer.slice(start, end) and buffer.subarray(start, end), with the offsets as Node.js adjusts them. */
function bufSlice(b: number[], start: Json, end: Json): number[] {
	const adjust = (v: Json): number => {
		let n = Math.trunc(Number(v));
		if (n === 0 || isNaN(n)) return 0;
		if (n < 0) {
			n += b.length;
			return n > 0 ? n : 0;
		}
		return n < b.length ? n : b.length;
	};
	const from = adjust(start);
	const to = end === undefined ? b.length : adjust(end);
	const out: number[] = [];
	for (let k = from; k < to; k++) out.push(b[k]);
	return out;
}`,
	},
	bufEquals: {
		uses: [],
		source: `/** a.equals(b) of two Buffers. */
function bufEquals(a: number[], b: number[]): boolean {
	if (a.length !== b.length) return false;
	for (let k = 0; k < a.length; k++) {
		if (a[k] !== b[k]) return false;
	}
	return true;
}`,
	},
	bufTimingEqual: {
		uses: ['bufEquals'],
		source: `/** crypto.timingSafeEqual(a, b) of two Buffers. */
function bufTimingEqual(a: number[], b: number[]): boolean {
	if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
	return bufEquals(a, b);
}`,
	},
	bufJson: {
		uses: [],
		source: `/** buffer.toJSON(): the form that JSON.stringify gives a Buffer. */
function bufJson(b: number[]): Json {
	return { type: 'Buffer', data: b.slice() };
}`,
	},
	bufByteLength: {
		uses: ['bufGot', 'utf8Bytes'],
		source: `/** Buffer.byteLength(text, encoding). Node.js counts from the length of the text, and an unknown encoding is UTF-8. */
function bufByteLength(text: Json, encoding: Json): number {
	if (typeof text !== 'string') {
		throw new TypeError('The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received ' + bufGot(text));
	}
	let len = text.length;
	if (len === 0) return 0;
	const e = encoding ? String(encoding).toLowerCase() : 'utf8';
	if (e === 'ucs2' || e === 'ucs-2' || e === 'utf16le' || e === 'utf-16le') return len * 2;
	if (e === 'hex') return Math.floor(len / 2);
	if (e === 'base64' || e === 'base64url') {
		if (text.charCodeAt(len - 1) === 61) len--;
		if (len > 1 && text.charCodeAt(len - 1) === 61) len--;
		return Math.floor((len * 3) / 4);
	}
	if (e === 'latin1' || e === 'binary' || e === 'ascii') return len;
	return utf8Bytes(text).length;
}`,
	},
	codeBinaryBytes: {
		uses: ['base64Bytes'],
		source: `/**
 * this.helpers.getBinaryDataBuffer(index, name) for binary data that an item holds as base64
 * text: the bytes of the entry of the input item. v1 reads the input of the node, not the
 * items that the code changed.
 */
function codeBinaryBytes(input: Json[], index: Json, name: Json): number[] {
	const item: Json = input[index];
	if (item === undefined || item === null) throw new TypeError("Cannot read properties of undefined (reading 'binary')");
	const binary: Json = item.$binary;
	if (binary === undefined || binary === null) throw new TypeError("Cannot read properties of undefined (reading '" + String(name) + "')");
	const entry: Json = binary[String(name)];
	if (entry === undefined || entry === null) throw new TypeError("Cannot read properties of undefined (reading 'id')");
	return base64Bytes(String(entry.data));
}`,
	},
};
