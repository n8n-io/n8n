import type { UnionToTuple } from './types.js';
export declare function filterObject<O extends object, R extends object>(object: O, predicate: (key: keyof O, value: O[keyof O]) => boolean): R;
export declare function pick<T extends object, K extends keyof T>(object: T, ...keys: readonly K[]): Pick<T, K>;
export declare function pick<T extends object, K extends keyof T>(object: T, ...keys: readonly (readonly K[])[]): Pick<T, K>;
export declare function omit<T extends object, K extends keyof T>(object: T, ...keys: readonly K[]): Omit<T, K>;
export declare function omit<T extends object, K extends keyof T>(object: T, ...keys: readonly (readonly K[])[]): Omit<T, K>;
export declare function assignWithDefaults<To extends Record<keyof any, any>, From extends Partial<To>>(to: To, from: From, defaults?: Partial<To>): void;
/**
 * Entries of T
 */
export type EntriesTuple<T extends object> = UnionToTuple<{
    [K in keyof T]: [K, T[K]];
}[keyof T]> & [unknown, unknown][];
/**
 * Entries of T
 */
export type Entries<T extends object> = ({
    [K in keyof T]: [K, T[K]];
}[keyof T] & unknown[])[];
export declare function isJSON(str: string): boolean;
export declare function resolveConstructors(object: object): string[];
export declare function getAllPrototypes(object: object): IterableIterator<object>;
/**
 * Allows you to convert an object with specific member types into a Map that will give you the correct type for the correct member
 */
export interface ConstMap<T extends Partial<Record<keyof any, any>>, K extends keyof any = keyof T, V = T[keyof T]> extends Map<K, V> {
    get<TK extends keyof T>(key: TK): T[TK];
    get(key: K): V;
    set<TK extends keyof T>(key: TK, value: T[TK]): this;
    set(key: K, value: V): this;
    has(key: keyof T | K): boolean;
}
export declare function map<const T extends Partial<Record<any, any>>>(items: T): Map<keyof T, T[keyof T]>;
export declare function getByString(object: Record<string, any>, path: string, separator?: RegExp): Record<string, any>;
export declare function setByString(object: Record<string, any>, path: string, value: unknown, separator?: RegExp): Record<string, any>;
export type JSONPrimitive = null | string | number | boolean;
export type JSONObject = {
    [K in string]: JSONValue;
};
export type JSONValue = JSONPrimitive | JSONObject | JSONValue[];
/**
 * An object `T` with all of its functions bound to a `This` value
 */
export type Bound<T extends object, This = any> = T & {
    [k in keyof T]: T[k] extends (...args: any[]) => any ? (this: This, ...args: Parameters<T[k]>) => ReturnType<T[k]> : T[k];
};
/**
 * Binds a this value for all of the functions in an object (not recursive)
 */
export declare function bindFunctions<T extends object, This = any>(fns: T, thisValue: This): Bound<T, This>;
