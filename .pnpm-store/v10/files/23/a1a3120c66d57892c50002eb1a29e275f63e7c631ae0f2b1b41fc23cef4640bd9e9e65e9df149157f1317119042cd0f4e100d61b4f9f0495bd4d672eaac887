/**
 * @namespace Chart.helpers
 */
import type { AnyObject } from '../types/basic.js';
import type { ActiveDataPoint, ChartEvent } from '../types/index.js';
/**
 * An empty function that can be used, for example, for optional callback.
 */
export declare function noop(): void;
/**
 * Returns a unique id, sequentially generated from a global variable.
 */
export declare const uid: () => number;
/**
 * Returns true if `value` is neither null nor undefined, else returns false.
 * @param value - The value to test.
 * @since 2.7.0
 */
export declare function isNullOrUndef(value: unknown): value is null | undefined;
/**
 * Returns true if `value` is an array (including typed arrays), else returns false.
 * @param value - The value to test.
 * @function
 */
export declare function isArray<T = unknown>(value: unknown): value is T[];
/**
 * Returns true if `value` is an object (excluding null), else returns false.
 * @param value - The value to test.
 * @since 2.7.0
 */
export declare function isObject(value: unknown): value is AnyObject;
/**
 * Returns true if `value` is a finite number, else returns false
 * @param value  - The value to test.
 */
declare function isNumberFinite(value: unknown): value is number;
export { isNumberFinite as isFinite, };
/**
 * Returns `value` if finite, else returns `defaultValue`.
 * @param value - The value to return if defined.
 * @param defaultValue - The value to return if `value` is not finite.
 */
export declare function finiteOrDefault(value: unknown, defaultValue: number): number;
/**
 * Returns `value` if defined, else returns `defaultValue`.
 * @param value - The value to return if defined.
 * @param defaultValue - The value to return if `value` is undefined.
 */
export declare function valueOrDefault<T>(value: T | undefined, defaultValue: T): T;
export declare const toPercentage: (value: number | string, dimension: number) => number;
export declare const toDimension: (value: number | string, dimension: number) => number;
/**
 * Calls `fn` with the given `args` in the scope defined by `thisArg` and returns the
 * value returned by `fn`. If `fn` is not a function, this method returns undefined.
 * @param fn - The function to call.
 * @param args - The arguments with which `fn` should be called.
 * @param [thisArg] - The value of `this` provided for the call to `fn`.
 */
export declare function callback<T extends (this: TA, ...restArgs: unknown[]) => R, TA, R>(fn: T | undefined, args: unknown[], thisArg?: TA): R | undefined;
/**
 * Note(SB) for performance sake, this method should only be used when loopable type
 * is unknown or in none intensive code (not called often and small loopable). Else
 * it's preferable to use a regular for() loop and save extra function calls.
 * @param loopable - The object or array to be iterated.
 * @param fn - The function to call for each item.
 * @param [thisArg] - The value of `this` provided for the call to `fn`.
 * @param [reverse] - If true, iterates backward on the loopable.
 */
export declare function each<T, TA>(loopable: Record<string, T>, fn: (this: TA, v: T, i: string) => void, thisArg?: TA, reverse?: boolean): void;
export declare function each<T, TA>(loopable: T[], fn: (this: TA, v: T, i: number) => void, thisArg?: TA, reverse?: boolean): void;
/**
 * Returns true if the `a0` and `a1` arrays have the same content, else returns false.
 * @param a0 - The array to compare
 * @param a1 - The array to compare
 * @private
 */
export declare function _elementsEqual(a0: ActiveDataPoint[], a1: ActiveDataPoint[]): boolean;
/**
 * Returns a deep copy of `source` without keeping references on objects and arrays.
 * @param source - The value to clone.
 */
export declare function clone<T>(source: T): T;
/**
 * The default merger when Chart.helpers.merge is called without merger option.
 * Note(SB): also used by mergeConfig and mergeScaleConfig as fallback.
 * @private
 */
export declare function _merger(key: string, target: AnyObject, source: AnyObject, options: AnyObject): void;
export interface MergeOptions {
    merger?: (key: string, target: AnyObject, source: AnyObject, options?: AnyObject) => void;
}
/**
 * Recursively deep copies `source` properties into `target` with the given `options`.
 * IMPORTANT: `target` is not cloned and will be updated with `source` properties.
 * @param target - The target object in which all sources are merged into.
 * @param source - Object(s) to merge into `target`.
 * @param [options] - Merging options:
 * @param [options.merger] - The merge method (key, target, source, options)
 * @returns The `target` object.
 */
export declare function merge<T>(target: T, source: [], options?: MergeOptions): T;
export declare function merge<T, S1>(target: T, source: S1, options?: MergeOptions): T & S1;
export declare function merge<T, S1>(target: T, source: [S1], options?: MergeOptions): T & S1;
export declare function merge<T, S1, S2>(target: T, source: [S1, S2], options?: MergeOptions): T & S1 & S2;
export declare function merge<T, S1, S2, S3>(target: T, source: [S1, S2, S3], options?: MergeOptions): T & S1 & S2 & S3;
export declare function merge<T, S1, S2, S3, S4>(target: T, source: [S1, S2, S3, S4], options?: MergeOptions): T & S1 & S2 & S3 & S4;
export declare function merge<T>(target: T, source: AnyObject[], options?: MergeOptions): AnyObject;
/**
 * Recursively deep copies `source` properties into `target` *only* if not defined in target.
 * IMPORTANT: `target` is not cloned and will be updated with `source` properties.
 * @param target - The target object in which all sources are merged into.
 * @param source - Object(s) to merge into `target`.
 * @returns The `target` object.
 */
export declare function mergeIf<T>(target: T, source: []): T;
export declare function mergeIf<T, S1>(target: T, source: S1): T & S1;
export declare function mergeIf<T, S1>(target: T, source: [S1]): T & S1;
export declare function mergeIf<T, S1, S2>(target: T, source: [S1, S2]): T & S1 & S2;
export declare function mergeIf<T, S1, S2, S3>(target: T, source: [S1, S2, S3]): T & S1 & S2 & S3;
export declare function mergeIf<T, S1, S2, S3, S4>(target: T, source: [S1, S2, S3, S4]): T & S1 & S2 & S3 & S4;
export declare function mergeIf<T>(target: T, source: AnyObject[]): AnyObject;
/**
 * Merges source[key] in target[key] only if target[key] is undefined.
 * @private
 */
export declare function _mergerIf(key: string, target: AnyObject, source: AnyObject): void;
/**
 * @private
 */
export declare function _deprecated(scope: string, value: unknown, previous: string, current: string): void;
/**
 * @private
 */
export declare function _splitKey(key: string): string[];
export declare function resolveObjectKey(obj: AnyObject, key: string): any;
/**
 * @private
 */
export declare function _capitalize(str: string): string;
export declare const defined: (value: unknown) => boolean;
export declare const isFunction: (value: unknown) => value is (...args: any[]) => any;
export declare const setsEqual: <T>(a: Set<T>, b: Set<T>) => boolean;
/**
 * @param e - The event
 * @private
 */
export declare function _isClickEvent(e: ChartEvent): boolean;
