/**
 * Prelude: higher-order array methods in the workflow subset.
 *
 * The compiler links these functions into each module that uses them. It
 * lowers `arr.map(f)` to `map(arr, f)`, and so on. The runtime never calls
 * back into bytecode from native code.
 *
 * Each function checks that its receiver is an array: code with untyped values
 * (converted Code nodes) can call `map` on an object or a string, and
 * JavaScript then throws.
 */

/** The TypeError of JavaScript for an array method called on another value. */
function notArray(value: unknown, method: string): Error {
	return new TypeError(
		value === undefined || value === null
			? `Cannot read properties of ${String(value)} (reading '${method}')`
			: `${method} is not a function`,
	);
}

export function map<T, U>(arr: T[], f: (value: T, index: number, array: T[]) => U): U[] {
	if (!Array.isArray(arr)) throw notArray(arr, 'map');
	const out: U[] = [];
	for (let i = 0; i < arr.length; i++) out.push(f(arr[i], i, arr));
	return out;
}

export function filter<T>(arr: T[], f: (value: T, index: number, array: T[]) => unknown): T[] {
	if (!Array.isArray(arr)) throw notArray(arr, 'filter');
	const out: T[] = [];
	for (let i = 0; i < arr.length; i++) {
		const value = arr[i];
		if (f(value, i, arr)) out.push(value);
	}
	return out;
}

export function forEach<T>(arr: T[], f: (value: T, index: number, array: T[]) => void): void {
	if (!Array.isArray(arr)) throw notArray(arr, 'forEach');
	for (let i = 0; i < arr.length; i++) f(arr[i], i, arr);
}

export function reduce<T, U>(
	arr: T[],
	f: (acc: U, value: T, index: number, array: T[]) => U,
	initial: U,
	hasInitial: boolean,
): U {
	if (!Array.isArray(arr)) throw notArray(arr, 'reduce');
	let i = 0;
	let acc = initial;
	if (!hasInitial) {
		if (arr.length === 0) throw new TypeError('Reduce of empty array with no initial value');
		acc = arr[0] as unknown as U;
		i = 1;
	}
	for (; i < arr.length; i++) acc = f(acc, arr[i], i, arr);
	return acc;
}

export function some<T>(arr: T[], f: (value: T, index: number, array: T[]) => unknown): boolean {
	if (!Array.isArray(arr)) throw notArray(arr, 'some');
	for (let i = 0; i < arr.length; i++) {
		if (f(arr[i], i, arr)) return true;
	}
	return false;
}

export function every<T>(arr: T[], f: (value: T, index: number, array: T[]) => unknown): boolean {
	if (!Array.isArray(arr)) throw notArray(arr, 'every');
	for (let i = 0; i < arr.length; i++) {
		if (!f(arr[i], i, arr)) return false;
	}
	return true;
}

export function find<T>(
	arr: T[],
	f: (value: T, index: number, array: T[]) => unknown,
): T | undefined {
	if (!Array.isArray(arr)) throw notArray(arr, 'find');
	for (let i = 0; i < arr.length; i++) {
		const value = arr[i];
		if (f(value, i, arr)) return value;
	}
	return undefined;
}

export function findIndex<T>(
	arr: T[],
	f: (value: T, index: number, array: T[]) => unknown,
): number {
	if (!Array.isArray(arr)) throw notArray(arr, 'findIndex');
	for (let i = 0; i < arr.length; i++) {
		if (f(arr[i], i, arr)) return i;
	}
	return -1;
}

export function flatMap<T, U>(arr: T[], f: (value: T, index: number, array: T[]) => U | U[]): U[] {
	if (!Array.isArray(arr)) throw notArray(arr, 'flatMap');
	const out: U[] = [];
	for (let i = 0; i < arr.length; i++) {
		const value = f(arr[i], i, arr);
		if (Array.isArray(value)) {
			for (let j = 0; j < value.length; j++) out.push(value[j]);
		} else {
			out.push(value);
		}
	}
	return out;
}

function mergeSort<T>(values: T[], compare: (a: T, b: T) => number): T[] {
	if (values.length <= 1) return values;
	const middle = Math.floor(values.length / 2);
	const left = mergeSort(values.slice(0, middle), compare);
	const right = mergeSort(values.slice(middle), compare);
	const out: T[] = [];
	let i = 0;
	let j = 0;
	while (i < left.length && j < right.length) {
		// Take from the left unless the right is strictly smaller: this keeps the sort stable.
		if (compare(right[j], left[i]) < 0) {
			out.push(right[j]);
			j++;
		} else {
			out.push(left[i]);
			i++;
		}
	}
	while (i < left.length) {
		out.push(left[i]);
		i++;
	}
	while (j < right.length) {
		out.push(right[j]);
		j++;
	}
	return out;
}

/** Stable in-place sort with a comparator. `undefined` values go last, as in JS. */
export function sort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
	if (!Array.isArray(arr)) throw notArray(arr, 'sort');
	const defined: T[] = [];
	let undefinedCount = 0;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] === undefined) undefinedCount++;
		else defined.push(arr[i]);
	}
	const sorted = mergeSort(defined, compare);
	for (let i = 0; i < sorted.length; i++) arr[i] = sorted[i];
	for (let i = 0; i < undefinedCount; i++) arr[sorted.length + i] = undefined as T;
	return arr;
}

/** Object rest in destructuring: copies all keys except `excluded`. */
export function objectRest(
	source: Record<string, unknown>,
	excluded: string[],
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const keys = Object.keys(source);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!excluded.includes(key)) out[key] = source[key];
	}
	return out;
}
