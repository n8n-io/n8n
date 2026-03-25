export declare const versionMajorMinor = "4.9";
/** The version of the TypeScript compiler release */
export declare const version: string;
/**
 * Type of objects whose values are all of the same type.
 * The `in` and `for-in` operators can *not* be safely used,
 * since `Object.prototype` may be modified by outside code.
 */
export interface MapLike<T> {
    [index: string]: T;
}
export interface SortedReadonlyArray<T> extends ReadonlyArray<T> {
    " __sortedArrayBrand": any;
}
export interface SortedArray<T> extends Array<T> {
    " __sortedArrayBrand": any;
}
/** Common read methods for ES6 Map/Set. */
export interface ReadonlyCollection<K> {
    readonly size: number;
    has(key: K): boolean;
    keys(): Iterator<K>;
}
/** Common write methods for ES6 Map/Set. */
export interface Collection<K> extends ReadonlyCollection<K> {
    delete(key: K): boolean;
    clear(): void;
}
/** ES6 Map interface, only read methods included. */
export interface ReadonlyESMap<K, V> extends ReadonlyCollection<K> {
    get(key: K): V | undefined;
    values(): Iterator<V>;
    entries(): Iterator<[K, V]>;
    forEach(action: (value: V, key: K) => void): void;
}
/**
 * ES6 Map interface, only read methods included.
 */
export interface ReadonlyMap<T> extends ReadonlyESMap<string, T> {
}
/** ES6 Map interface. */
export interface ESMap<K, V> extends ReadonlyESMap<K, V>, Collection<K> {
    set(key: K, value: V): this;
}
/**
 * ES6 Map interface.
 */
export interface Map<T> extends ESMap<string, T> {
}
export interface MapConstructor {
    new <K, V>(iterable?: readonly (readonly [K, V])[] | ReadonlyESMap<K, V>): ESMap<K, V>;
}
/** ES6 Set interface, only read methods included. */
export interface ReadonlySet<T> extends ReadonlyCollection<T> {
    has(value: T): boolean;
    values(): Iterator<T>;
    entries(): Iterator<[T, T]>;
    forEach(action: (value: T, key: T) => void): void;
}
/** ES6 Set interface. */
export interface Set<T> extends ReadonlySet<T>, Collection<T> {
    add(value: T): this;
    delete(value: T): boolean;
}
export interface SetConstructor {
    new <T>(iterable?: readonly T[] | ReadonlySet<T>): Set<T>;
}
/** ES6 Iterator type. */
export interface Iterator<T> {
    next(): {
        value: T;
        done?: false;
    } | {
        value: void;
        done: true;
    };
}
/** Array that is only intended to be pushed to, never read. */
export interface Push<T> {
    push(...values: T[]): void;
    readonly length: number;
}
export type EqualityComparer<T> = (a: T, b: T) => boolean;
export type Comparer<T> = (a: T, b: T) => Comparison;
export declare const enum Comparison {
    LessThan = -1,
    EqualTo = 0,
    GreaterThan = 1
}
export declare const Map: MapConstructor;
export declare const Set: SetConstructor;
