/**
 * Helpers for `Uint8Array` values of Code nodes, as subset source (`helpers.ts` holds the table).
 *
 * A typed array of the code is a plain object of its bytes by index (`{"0":1,"1":2}`). v1
 * gives the same object as the data of the item: the task runner sends the value as JSON.
 * The translation lets such a value go only to the places that these helpers serve
 * (`translate.ts`, "Typed array values"), so the code cannot see that the value has no
 * `length` of its own and no methods.
 */
import type { CodeHelperSource } from './helpers.ts';

export const TYPED_ARRAY_HELPERS: Record<string, CodeHelperSource> = {
	taByte: {
		uses: [],
		source: `/** A value as one byte of a typed array: ToNumber, then modulo 256. */
function taByte(x: Json): number {
	const n = Math.trunc(Number(x));
	return isNaN(n) || !Number.isFinite(n) ? 0 : ((n % 256) + 256) % 256;
}`,
	},
	taMaxLength: {
		uses: [],
		source: `/** The largest length of a typed array that Node.js makes, and the error of one above it. */
function taMaxLength(n: number): number {
	if (n > 4294967295) throw new RangeError('Invalid typed array length: ' + String(n));
	return n;
}`,
	},
	taLengthOf: {
		uses: [],
		source: `/** ToLength: a length as \`{ length: … }\` takes it. */
function taLengthOf(value: Json): number {
	const n = Number(value);
	if (isNaN(n) || n <= 0) return 0;
	const t = Math.trunc(n);
	if (t > 4294967295) throw new RangeError('Array buffer allocation failed');
	return t;
}`,
	},
	taIndex: {
		uses: ['taMaxLength'],
		source: `/** ToIndex: the length that a value of \`new Uint8Array(value)\` means, or its error. */
function taIndex(value: Json): number {
	const n = Number(value);
	if (isNaN(n)) return 0;
	const t = Math.trunc(n);
	if (t < 0) throw new RangeError('Invalid typed array length: ' + String(n));
	return taMaxLength(t);
}`,
	},
	taLen: {
		uses: [],
		source: `/** The length of a typed array: the count of its bytes by index. */
function taLen(value: Json): number {
	let n = 0;
	while (value[String(n)] !== undefined) n++;
	return n;
}`,
	},
	taNew: {
		uses: ['taByte', 'taIndex', 'taLengthOf'],
		source: `/** \`new Uint8Array()\`, \`new Uint8Array(count)\` and \`new Uint8Array(list)\`. */
function taNew(value: Json): Json {
	const out: Json = {};
	if (value !== null && typeof value === 'object') {
		const list = Array.isArray(value) ? value : undefined;
		const n = list === undefined ? taLengthOf(value.length) : list.length;
		for (let k = 0; k < n; k++) {
			out[String(k)] = taByte(list === undefined ? value[String(k)] : list[k]);
		}
		return out;
	}
	const n = taIndex(value);
	for (let k = 0; k < n; k++) out[String(k)] = 0;
	return out;
}`,
	},
	taCopy: {
		uses: ['taLen'],
		source: `/** \`new Uint8Array(other)\` of another typed array. */
function taCopy(value: Json): Json {
	const out: Json = {};
	const n = taLen(value);
	for (let k = 0; k < n; k++) out[String(k)] = value[String(k)];
	return out;
}`,
	},
	taSet: {
		uses: ['taByte', 'taLen'],
		source: `/** \`value[index] = given\`: a byte inside the length, else nothing. The value of the assignment. */
function taSet(value: Json, index: Json, given: Json): Json {
	const i = Math.trunc(Number(index));
	if (!isNaN(i) && i >= 0 && i < taLen(value)) value[String(i)] = taByte(given);
	return given;
}`,
	},
	taFrom: {
		uses: ['taLen'],
		source: `/** \`Array.from(value)\` and \`Array.from(value, mapper)\` of a typed array. */
function taFrom(value: Json, mapper: Json): Json[] {
	const out: Json[] = [];
	const n = taLen(value);
	for (let k = 0; k < n; k++) out.push(mapper === undefined ? value[String(k)] : mapper(value[String(k)], k));
	return out;
}`,
	},
};
