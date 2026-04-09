import type { UnionToTuple } from './types.js';

export function filterObject<O extends object, R extends object>(
	object: O,
	predicate: (key: keyof O, value: O[keyof O]) => boolean
): R {
	const entries = Object.entries(object) as [keyof O, O[keyof O]][];
	return Object.fromEntries(entries.filter(([key, value]) => predicate(key, value))) as R;
}

export function pick<T extends object, K extends keyof T>(object: T, ...keys: readonly K[]): Pick<T, K>;
export function pick<T extends object, K extends keyof T>(object: T, ...keys: readonly (readonly K[])[]): Pick<T, K>;
export function pick<T extends object, K extends keyof T>(
	object: T,
	...keys: readonly K[] | readonly (readonly K[])[]
): Pick<T, K> {
	const picked = {} as Pick<T, K>;
	for (const key of keys.flat() as K[]) {
		picked[key] = object[key];
	}
	return picked;
}

export function omit<T extends object, K extends keyof T>(object: T, ...keys: readonly K[]): Omit<T, K>;
export function omit<T extends object, K extends keyof T>(object: T, ...keys: readonly (readonly K[])[]): Omit<T, K>;
export function omit<T extends object, K extends keyof T>(
	object: T,
	...keys: readonly K[] | readonly (readonly K[])[]
): Omit<T, K> {
	return filterObject<T, Omit<T, K>>(object, key => !keys.flat().includes(key as K));
}

export function assignWithDefaults<To extends Record<keyof any, any>, From extends Partial<To>>(
	to: To,
	from: From,
	defaults: Partial<To> = to
): void {
	const keys = new Set<keyof To | keyof From>([...Object.keys(to), ...Object.keys(from)]);
	for (const key of keys) {
		try {
			to[key] = from[key] ?? defaults[key] ?? to[key];
		} catch {
			// Do nothing
		}
	}
}

/**
 * Entries of T
 */
export type EntriesTuple<T extends object> = UnionToTuple<{ [K in keyof T]: [K, T[K]] }[keyof T]>
	& [unknown, unknown][];

/**
 * Entries of T
 */
export type Entries<T extends object> = ({ [K in keyof T]: [K, T[K]] }[keyof T] & unknown[])[];

export function isJSON(str: string) {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}

export function resolveConstructors(object: object): string[] {
	const constructors = [];
	for (
		let prototype = object;
		prototype && !['Function', 'Object'].includes(prototype.constructor.name);
		prototype = Object.getPrototypeOf(prototype)
	) {
		constructors.push(prototype.constructor.name);
	}
	return constructors;
}

export function* getAllPrototypes(object: object): IterableIterator<object> {
	for (let prototype = object; prototype; prototype = Object.getPrototypeOf(prototype)) {
		yield prototype;
	}
}

/**
 * Allows you to convert an object with specific member types into a Map that will give you the correct type for the correct member
 */
export interface ConstMap<T extends Partial<Record<keyof any, any>>, K extends keyof any = keyof T, V = T[keyof T]>
	extends Map<K, V> {
	get<TK extends keyof T>(key: TK): T[TK];
	get(key: K): V;
	set<TK extends keyof T>(key: TK, value: T[TK]): this;
	set(key: K, value: V): this;
	has(key: keyof T | K): boolean;
}

export function map<const T extends Partial<Record<any, any>>>(items: T): Map<keyof T, T[keyof T]> {
	return new Map(Object.entries(items) as [keyof T, T[keyof T]][]);
}

export function getByString(object: Record<string, any>, path: string, separator = /[.[\]'"]/) {
	return path
		.split(separator)
		.filter(p => p)
		.reduce((o, p) => o?.[p], object);
}

export function setByString(object: Record<string, any>, path: string, value: unknown, separator = /[.[\]'"]/) {
	return path
		.split(separator)
		.filter(p => p)
		.reduce((o, p, i) => (o[p] = path.split(separator).filter(p => p).length === ++i ? value : o[p] || {}), object);
}

export type JSONPrimitive = null | string | number | boolean;

export type JSONObject = { [K in string]: JSONValue };

export type JSONValue = JSONPrimitive | JSONObject | JSONValue[];

/**
 * An object `T` with all of its functions bound to a `This` value
 */
export type Bound<T extends object, This = any> = T & {
	[k in keyof T]: T[k] extends (...args: any[]) => any
		? (this: This, ...args: Parameters<T[k]>) => ReturnType<T[k]>
		: T[k];
};

/**
 * Binds a this value for all of the functions in an object (not recursive)
 */
export function bindFunctions<T extends object, This = any>(fns: T, thisValue: This): Bound<T, This> {
	return Object.fromEntries(
		Object.entries(fns).map(([k, v]) => [k, typeof v == 'function' ? v.bind(thisValue) : v])
	) as Bound<T, This>;
}
