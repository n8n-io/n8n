/**
 * Promise, or maybe not
 */
type Awaitable<T> = T | PromiseLike<T>;
/**
 * Null or whatever
 */
type Nullable<T> = T | null | undefined;
/**
 * Array, or not yet
 */
type Arrayable<T> = T | Array<T>;
/**
 * Function
 */
type Fn<T = void> = () => T;
/**
 * Constructor
 */
type Constructor<T = void> = new (...args: any[]) => T;
/**
 * Infers the element type of an array
 */
type ElementOf<T> = T extends (infer E)[] ? E : never;
/**
 * Defines an intersection type of all union items.
 *
 * @param U Union of any types that will be intersected.
 * @returns U items intersected
 * @see https://stackoverflow.com/a/50375286/9259330
 */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
/**
 * Infers the arguments type of a function
 */
type ArgumentsType<T> = T extends ((...args: infer A) => any) ? A : never;
type MergeInsertions<T> = T extends object ? {
    [K in keyof T]: MergeInsertions<T[K]>;
} : T;
type DeepMerge<F, S> = MergeInsertions<{
    [K in keyof F | keyof S]: K extends keyof S & keyof F ? DeepMerge<F[K], S[K]> : K extends keyof S ? S[K] : K extends keyof F ? F[K] : never;
}>;

/**
 * Convert `Arrayable<T>` to `Array<T>`
 *
 * @category Array
 */
declare function toArray<T>(array?: Nullable<Arrayable<T>>): Array<T>;
/**
 * Convert `Arrayable<T>` to `Array<T>` and flatten it
 *
 * @category Array
 */
declare function flattenArrayable<T>(array?: Nullable<Arrayable<T | Array<T>>>): Array<T>;
/**
 * Use rest arguments to merge arrays
 *
 * @category Array
 */
declare function mergeArrayable<T>(...args: Nullable<Arrayable<T>>[]): Array<T>;
type PartitionFilter<T> = (i: T, idx: number, arr: readonly T[]) => any;
/**
 * Divide an array into two parts by a filter function
 *
 * @category Array
 * @example const [odd, even] = partition([1, 2, 3, 4], i => i % 2 != 0)
 */
declare function partition<T>(array: readonly T[], f1: PartitionFilter<T>): [T[], T[]];
declare function partition<T>(array: readonly T[], f1: PartitionFilter<T>, f2: PartitionFilter<T>): [T[], T[], T[]];
declare function partition<T>(array: readonly T[], f1: PartitionFilter<T>, f2: PartitionFilter<T>, f3: PartitionFilter<T>): [T[], T[], T[], T[]];
declare function partition<T>(array: readonly T[], f1: PartitionFilter<T>, f2: PartitionFilter<T>, f3: PartitionFilter<T>, f4: PartitionFilter<T>): [T[], T[], T[], T[], T[]];
declare function partition<T>(array: readonly T[], f1: PartitionFilter<T>, f2: PartitionFilter<T>, f3: PartitionFilter<T>, f4: PartitionFilter<T>, f5: PartitionFilter<T>): [T[], T[], T[], T[], T[], T[]];
declare function partition<T>(array: readonly T[], f1: PartitionFilter<T>, f2: PartitionFilter<T>, f3: PartitionFilter<T>, f4: PartitionFilter<T>, f5: PartitionFilter<T>, f6: PartitionFilter<T>): [T[], T[], T[], T[], T[], T[], T[]];
/**
 * Unique an Array
 *
 * @category Array
 */
declare function uniq<T>(array: readonly T[]): T[];
/**
 * Unique an Array by a custom equality function
 *
 * @category Array
 */
declare function uniqueBy<T>(array: readonly T[], equalFn: (a: any, b: any) => boolean): T[];
/**
 * Get last item
 *
 * @category Array
 */
declare function last(array: readonly []): undefined;
declare function last<T>(array: readonly T[]): T;
/**
 * Remove an item from Array
 *
 * @category Array
 */
declare function remove<T>(array: T[], value: T): boolean;
/**
 * Get nth item of Array. Negative for backward
 *
 * @category Array
 */
declare function at(array: readonly [], index: number): undefined;
declare function at<T>(array: readonly T[], index: number): T;
/**
 * Genrate a range array of numbers. The `stop` is exclusive.
 *
 * @category Array
 */
declare function range(stop: number): number[];
declare function range(start: number, stop: number, step?: number): number[];
/**
 * Move element in an Array
 *
 * @category Array
 * @param arr
 * @param from
 * @param to
 */
declare function move<T>(arr: T[], from: number, to: number): T[];
/**
 * Clamp a number to the index range of an array
 *
 * @category Array
 */
declare function clampArrayRange(n: number, arr: readonly unknown[]): number;
/**
 * Get random item(s) from an array
 *
 * @param arr
 * @param quantity - quantity of random items which will be returned
 */
declare function sample<T>(arr: T[], quantity: number): T[];
/**
 * Shuffle an array. This function mutates the array.
 *
 * @category Array
 */
declare function shuffle<T>(array: T[]): T[];
/**
 * Filter out items from an array in place.
 * This function mutates the array.
 * `predicate` get through the array from the end to the start for performance.
 *
 * Expect this function to be faster than using `Array.prototype.filter` on large arrays.
 *
 * @category Array
 */
declare function filterInPlace<T>(array: T[], predicate: (item: T, index: number, arr: T[]) => unknown): T[];

declare function assert(condition: boolean, message: string): asserts condition;
declare const toString: (v: any) => string;
declare function getTypeName(v: any): string;
declare function noop(): void;

declare function isDeepEqual(value1: any, value2: any): boolean;

/**
 * Call every function in an array
 */
declare function batchInvoke(functions: Nullable<Fn>[]): void;
/**
 * Call the function, returning the result
 */
declare function invoke<T>(fn: () => T): T;
/**
 * Pass the value through the callback, and return the value
 *
 * @example
 * ```
 * function createUser(name: string): User {
 *   return tap(new User, user => {
 *     user.name = name
 *   })
 * }
 * ```
 */
declare function tap<T>(value: T, callback: (value: T) => void): T;

/**
 * Type guard to filter out null-ish values
 *
 * @category Guards
 * @example array.filter(notNullish)
 */
declare function notNullish<T>(v: T | null | undefined): v is NonNullable<T>;
/**
 * Type guard to filter out null values
 *
 * @category Guards
 * @example array.filter(noNull)
 */
declare function noNull<T>(v: T | null): v is Exclude<T, null>;
/**
 * Type guard to filter out null-ish values
 *
 * @category Guards
 * @example array.filter(notUndefined)
 */
declare function notUndefined<T>(v: T): v is Exclude<T, undefined>;
/**
 * Type guard to filter out falsy values
 *
 * @category Guards
 * @example array.filter(isTruthy)
 */
declare function isTruthy<T>(v: T): v is NonNullable<T>;

declare const isDef: <T = any>(val?: T) => val is T;
declare const isBoolean: (val: any) => val is boolean;
declare const isFunction: <T extends Function>(val: any) => val is T;
declare const isNumber: (val: any) => val is number;
declare const isString: (val: unknown) => val is string;
declare const isObject: (val: any) => val is object;
declare const isUndefined: (val: any) => val is undefined;
declare const isNull: (val: any) => val is null;
declare const isRegExp: (val: any) => val is RegExp;
declare const isDate: (val: any) => val is Date;
declare const isWindow: (val: any) => boolean;
declare const isBrowser: boolean;

declare function clamp(n: number, min: number, max: number): number;
declare function sum(...args: number[] | number[][]): number;
/**
 * Linearly interpolates between `min` and `max` based on `t`
 *
 * @category Math
 * @param min The minimum value
 * @param max The maximum value
 * @param t The interpolation value clamped between 0 and 1
 * @example
 * ```
 * const value = lerp(0, 2, 0.5) // value will be 1
 * ```
 */
declare function lerp(min: number, max: number, t: number): number;
/**
 * Linearly remaps a clamped value from its source range [`inMin`, `inMax`] to the destination range [`outMin`, `outMax`]
 *
 * @category Math
 * @example
 * ```
 * const value = remap(0.5, 0, 1, 200, 400) // value will be 300
 * ```
 */
declare function remap(n: number, inMin: number, inMax: number, outMin: number, outMax: number): number;

/**
 * Map key/value pairs for an object, and construct a new one
 *
 *
 * @category Object
 *
 * Transform:
 * @example
 * ```
 * objectMap({ a: 1, b: 2 }, (k, v) => [k.toString().toUpperCase(), v.toString()])
 * // { A: '1', B: '2' }
 * ```
 *
 * Swap key/value:
 * @example
 * ```
 * objectMap({ a: 1, b: 2 }, (k, v) => [v, k])
 * // { 1: 'a', 2: 'b' }
 * ```
 *
 * Filter keys:
 * @example
 * ```
 * objectMap({ a: 1, b: 2 }, (k, v) => k === 'a' ? undefined : [k, v])
 * // { b: 2 }
 * ```
 */
declare function objectMap<K extends string, V, NK extends string | number | symbol = K, NV = V>(obj: Record<K, V>, fn: (key: K, value: V) => [NK, NV] | undefined): Record<NK, NV>;
/**
 * Type guard for any key, `k`.
 * Marks `k` as a key of `T` if `k` is in `obj`.
 *
 * @category Object
 * @param obj object to query for key `k`
 * @param k key to check existence in `obj`
 */
declare function isKeyOf<T extends object>(obj: T, k: keyof any): k is keyof T;
/**
 * Strict typed `Object.keys`
 *
 * @category Object
 */
declare function objectKeys<T extends object>(obj: T): Array<`${keyof T & (string | number | boolean | null | undefined)}`>;
/**
 * Strict typed `Object.entries`
 *
 * @category Object
 */
declare function objectEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]>;
/**
 * Deep merge
 *
 * The first argument is the target object, the rest are the sources.
 * The target object will be mutated and returned.
 *
 * @category Object
 */
declare function deepMerge<T extends object = object, S extends object = T>(target: T, ...sources: S[]): DeepMerge<T, S>;
/**
 * Deep merge
 *
 * Differs from `deepMerge` in that it merges arrays instead of overriding them.
 *
 * The first argument is the target object, the rest are the sources.
 * The target object will be mutated and returned.
 *
 * @category Object
 */
declare function deepMergeWithArray<T extends object = object, S extends object = T>(target: T, ...sources: S[]): DeepMerge<T, S>;
/**
 * Create a new subset object by giving keys
 *
 * @category Object
 */
declare function objectPick<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined?: boolean): Pick<O, T>;
/**
 * Clear undefined fields from an object. It mutates the object
 *
 * @category Object
 */
declare function clearUndefined<T extends object>(obj: T): T;
/**
 * Determines whether an object has a property with the specified name
 *
 * @see https://eslint.org/docs/rules/no-prototype-builtins
 * @category Object
 */
declare function hasOwnProperty<T>(obj: T, v: PropertyKey): boolean;

interface POptions {
    /**
     * How many promises are resolved at the same time.
     */
    concurrency?: number | undefined;
}
declare class PInstance<T = any> extends Promise<Awaited<T>[]> {
    items: Iterable<T>;
    options?: POptions | undefined;
    private promises;
    get promise(): Promise<Awaited<T>[]>;
    constructor(items?: Iterable<T>, options?: POptions | undefined);
    add(...args: (T | Promise<T>)[]): void;
    map<U>(fn: (value: Awaited<T>, index: number) => U): PInstance<Promise<U>>;
    filter(fn: (value: Awaited<T>, index: number) => boolean | Promise<boolean>): PInstance<Promise<T>>;
    forEach(fn: (value: Awaited<T>, index: number) => void): Promise<void>;
    reduce<U>(fn: (previousValue: U, currentValue: Awaited<T>, currentIndex: number, array: Awaited<T>[]) => U, initialValue: U): Promise<U>;
    clear(): void;
    then(fn?: () => PromiseLike<any>): Promise<any>;
    catch(fn?: (err: unknown) => PromiseLike<any>): Promise<any>;
    finally(fn?: () => void): Promise<Awaited<T>[]>;
}
/**
 * Utility for managing multiple promises.
 *
 * @see https://github.com/antfu/utils/tree/main/docs/p.md
 * @category Promise
 * @example
 * ```
 * import { p } from '@antfu/utils'
 *
 * const items = [1, 2, 3, 4, 5]
 *
 * await p(items)
 *   .map(async i => await multiply(i, 3))
 *   .filter(async i => await isEven(i))
 * // [6, 12]
 * ```
 */
declare function p<T = any>(items?: Iterable<T>, options?: POptions): PInstance<T>;

interface SingletonPromiseReturn<T> {
    (): Promise<T>;
    /**
     * Reset current staled promise.
     * Await it to have proper shutdown.
     */
    reset: () => Promise<void>;
}
/**
 * Create singleton promise function
 *
 * @category Promise
 */
declare function createSingletonPromise<T>(fn: () => Promise<T>): SingletonPromiseReturn<T>;
/**
 * Promised `setTimeout`
 *
 * @category Promise
 */
declare function sleep(ms: number, callback?: Fn<any>): Promise<void>;
/**
 * Create a promise lock
 *
 * @category Promise
 * @example
 * ```
 * const lock = createPromiseLock()
 *
 * lock.run(async () => {
 *   await doSomething()
 * })
 *
 * // in anther context:
 * await lock.wait() // it will wait all tasking finished
 * ```
 */
declare function createPromiseLock(): {
    run<T = void>(fn: () => Promise<T>): Promise<T>;
    wait(): Promise<void>;
    isWaiting(): boolean;
    clear(): void;
};
/**
 * Promise with `resolve` and `reject` methods of itself
 */
interface ControlledPromise<T = void> extends Promise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}
/**
 * Return a Promise with `resolve` and `reject` methods
 *
 * @category Promise
 * @example
 * ```
 * const promise = createControlledPromise()
 *
 * await promise
 *
 * // in anther context:
 * promise.resolve(data)
 * ```
 */
declare function createControlledPromise<T>(): ControlledPromise<T>;

/**
 * Replace backslash to slash
 *
 * @category String
 */
declare function slash(str: string): string;
/**
 * Ensure prefix of a string
 *
 * @category String
 */
declare function ensurePrefix(prefix: string, str: string): string;
/**
 * Ensure suffix of a string
 *
 * @category String
 */
declare function ensureSuffix(suffix: string, str: string): string;
/**
 * Dead simple template engine, just like Python's `.format()`
 * Support passing variables as either in index based or object/name based approach
 * While using object/name based approach, you can pass a fallback value as the third argument
 *
 * @category String
 * @example
 * ```
 * const result = template(
 *   'Hello {0}! My name is {1}.',
 *   'Inès',
 *   'Anthony'
 * ) // Hello Inès! My name is Anthony.
 * ```
 *
 * ```
 * const result = namedTemplate(
 *   '{greet}! My name is {name}.',
 *   { greet: 'Hello', name: 'Anthony' }
 * ) // Hello! My name is Anthony.
 * ```
 *
 * const result = namedTemplate(
 *   '{greet}! My name is {name}.',
 *   { greet: 'Hello' }, // name isn't passed hence fallback will be used for name
 *   'placeholder'
 * ) // Hello! My name is placeholder.
 * ```
 */
declare function template(str: string, object: Record<string | number, any>, fallback?: string | ((key: string) => string)): string;
declare function template(str: string, ...args: (string | number | bigint | undefined | null)[]): string;
/**
 * Generate a random string
 * @category String
 */
declare function randomStr(size?: number, dict?: string): string;
/**
 * First letter uppercase, other lowercase
 * @category string
 * @example
 * ```
 * capitalize('hello') => 'Hello'
 * ```
 */
declare function capitalize(str: string): string;
/**
 * Remove common leading whitespace from a template string.
 * Will also remove empty lines at the beginning and end.
 * @category string
 * @example
 * ```ts
 * const str = unindent`
 *   if (a) {
 *     b()
 *   }
 * `
 */
declare function unindent(str: TemplateStringsArray | string): string;

declare const timestamp: () => number;

interface CancelOptions {
    upcomingOnly?: boolean;
}

interface Cancel {
    cancel: (options?: CancelOptions) => void;
}

interface NoReturn<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
}

interface ThrottleOptions {
    noTrailing?: boolean;
    noLeading?: boolean;
    debounceMode?: boolean;
}

interface DebounceOptions {
    atBegin?: boolean;
}

type throttle<T extends (...args: any[]) => any> = NoReturn<T> & Cancel;

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param delay
 * A zero-or-greater delay in milliseconds. For event callbacks, values around
 * 100 or 250 (or even higher) are most useful.
 *
 * @param callback
 * A function to be executed after delay milliseconds. The `this` context and
 * all arguments are passed through, as-is, to `callback` when the
 * throttled-function is executed.
 *
 * @param options
 * An object to configure options.
 *
 * @param options.noTrailing
 * Optional, defaults to false. If noTrailing is true, callback will only execute
 * every `delay` milliseconds while the throttled-function is being called. If
 * noTrailing is false or unspecified, callback will be executed one final time
 * after the last throttled-function call. (After the throttled-function has not
 * been called for `delay` milliseconds, the internal counter is reset)
 *
 * @param options.noLeading
 * Optional, defaults to false. If noLeading is false, the first throttled-function
 * call will execute callback immediately. If noLeading is true, the first the
 * callback execution will be skipped. It should be noted that callback will never
 * executed if both noLeading = true and noTrailing = true.
 *
 * @param options.debounceMode If `debounceMode` is true (at begin), schedule
 * `callback` to execute after `delay` ms. If `debounceMode` is false (at end),
 * schedule `callback` to execute after `delay` ms.
 *
 * @return
 * A new, throttled, function.
 */
declare function throttle<T extends (...args: any[]) => any>(
    delay: number,
    callback: T,
    options?: ThrottleOptions,
): throttle<T>;
type debounce<T extends (...args: any[]) => any> = NoReturn<T> & Cancel;

/**
 * Debounce execution of a function. Debouncing, unlike throttling,
 * guarantees that a function is only executed a single time, either at the
 * very beginning of a series of calls, or at the very end.
 *
 * @param delay
 * A zero-or-greater delay in milliseconds. For event callbacks, values around
 * 100 or 250 (or even higher) are most useful.
 *
 * @param callback
 * A function to be executed after delay milliseconds. The `this` context and
 * all arguments are passed through, as-is, to `callback` when the
 * debounced-function is executed.
 *
 * @param options
 * An object to configure options.
 *
 * @param options.atBegin
 * If atBegin is false or unspecified, callback will only be executed `delay`
 * milliseconds after the last debounced-function call. If atBegin is true,
 * callback will be executed only at the first debounced-function call. (After
 * the throttled-function has not been called for `delay` milliseconds, the
 * internal counter is reset).
 *
 * @return
 * A new, debounced function.
 */
declare function debounce<T extends (...args: any[]) => any>(
    delay: number,
    callback: T,
    options?: DebounceOptions,
): debounce<T>;

export { type ArgumentsType, type Arrayable, type Awaitable, type Constructor, type ControlledPromise, type DeepMerge, type ElementOf, type Fn, type MergeInsertions, type Nullable, type PartitionFilter, type SingletonPromiseReturn, type UnionToIntersection, assert, at, batchInvoke, capitalize, clamp, clampArrayRange, clearUndefined, createControlledPromise, createPromiseLock, createSingletonPromise, debounce, deepMerge, deepMergeWithArray, ensurePrefix, ensureSuffix, filterInPlace, flattenArrayable, getTypeName, hasOwnProperty, invoke, isBoolean, isBrowser, isDate, isDeepEqual, isDef, isFunction, isKeyOf, isNull, isNumber, isObject, isRegExp, isString, isTruthy, isUndefined, isWindow, last, lerp, mergeArrayable, move, noNull, noop, notNullish, notUndefined, objectEntries, objectKeys, objectMap, objectPick, p, partition, randomStr, range, remap, remove, sample, shuffle, slash, sleep, sum, tap, template, throttle, timestamp, toArray, toString, unindent, uniq, uniqueBy };
