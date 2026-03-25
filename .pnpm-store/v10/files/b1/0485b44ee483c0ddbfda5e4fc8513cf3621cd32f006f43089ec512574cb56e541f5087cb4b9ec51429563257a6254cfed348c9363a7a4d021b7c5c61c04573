import { Buffer } from 'node:buffer';
import type { Maybe } from '../types';
type Callable = (...args: unknown[]) => unknown;
export declare const NULL = "\0";
export declare const NOOP: Callable;
/**
 * Returns either the source argument when it is a `Function`, or the default
 * `NOOP` function constant
 */
export declare function asFunction<T>(source: T | unknown): Callable;
/**
 * Determines whether the supplied argument is both a function, and is not
 * the `NOOP` function.
 */
export declare function isUserFunction<T extends Function>(source: T | unknown): source is T;
export declare function splitOn(input: string, char: string): [string, string];
export declare function first<T extends unknown[]>(input: T, offset?: number): Maybe<T[number]>;
export declare function first<T extends IArguments>(input: T, offset?: number): Maybe<unknown>;
export declare function last<T extends unknown[]>(input: T, offset?: number): Maybe<T[number]>;
export declare function last<T extends IArguments>(input: T, offset?: number): Maybe<unknown>;
export declare function last<T>(input: T, offset?: number): Maybe<unknown>;
export declare function toLinesWithContent(input?: string, trimmed?: boolean, separator?: string): string[];
type LineWithContentCallback<T = void> = (line: string) => T;
export declare function forEachLineWithContent<T>(input: string, callback: LineWithContentCallback<T>): T[];
export declare function folderExists(path: string): boolean;
/**
 * Adds `item` into the `target` `Array` or `Set` when it is not already present and returns the `item`.
 */
export declare function append<T>(target: T[] | Set<T>, item: T): typeof item;
/**
 * Adds `item` into the `target` `Array` when it is not already present and returns the `target`.
 */
export declare function including<T>(target: T[], item: T): typeof target;
export declare function remove<T>(target: Set<T> | T[], item: T): T;
export declare const objectToString: (input: unknown) => string;
export declare function asArray<T>(source: T | T[]): T[];
export declare function asCamelCase(str: string): string;
export declare function asStringArray<T>(source: T | T[]): string[];
export declare function asNumber(source: string | null | undefined, onNaN?: number): number;
export declare function prefixedArray<T>(input: T[], prefix: T): T[];
export declare function bufferToString(input: Buffer | Buffer[]): string;
/**
 * Get a new object from a source object with only the listed properties.
 */
export declare function pick<T, K extends keyof T>(source: T, properties: readonly K[]): Partial<Pick<T, K>>;
export declare function delay(duration?: number): Promise<void>;
export declare function orVoid<T>(input: T | false): T | undefined;
export {};
