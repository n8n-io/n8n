/// <reference types="node" />
import { defaults, noop } from "./lodash";
import { Callback } from "../types";
import Debug from "./debug";
/**
 * Convert a buffer to string, supports buffer array
 *
 * @example
 * ```js
 * const input = [Buffer.from('foo'), [Buffer.from('bar')]]
 * const res = convertBufferToString(input, 'utf8')
 * expect(res).to.eql(['foo', ['bar']])
 * ```
 */
export declare function convertBufferToString(value: any, encoding?: BufferEncoding): any;
/**
 * Convert a list of results to node-style
 *
 * @example
 * ```js
 * const input = ['a', 'b', new Error('c'), 'd']
 * const output = exports.wrapMultiResult(input)
 * expect(output).to.eql([[null, 'a'], [null, 'b'], [new Error('c')], [null, 'd'])
 * ```
 */
export declare function wrapMultiResult(arr: unknown[] | null): unknown[][] | null;
/**
 * Detect if the argument is a int
 * @example
 * ```js
 * > isInt('123')
 * true
 * > isInt('123.3')
 * false
 * > isInt('1x')
 * false
 * > isInt(123)
 * true
 * > isInt(true)
 * false
 * ```
 */
export declare function isInt(value: any): value is string;
/**
 * Pack an array to an Object
 *
 * @example
 * ```js
 * > packObject(['a', 'b', 'c', 'd'])
 * { a: 'b', c: 'd' }
 * ```
 */
export declare function packObject(array: any[]): Record<string, any>;
/**
 * Return a callback with timeout
 */
export declare function timeout<T>(callback: Callback<T>, timeout: number): Callback<T>;
/**
 * Convert an object to an array
 * @example
 * ```js
 * > convertObjectToArray({ a: '1' })
 * ['a', '1']
 * ```
 */
export declare function convertObjectToArray<T>(obj: Record<string, T>): (string | T)[];
/**
 * Convert a map to an array
 * @example
 * ```js
 * > convertMapToArray(new Map([[1, '2']]))
 * [1, '2']
 * ```
 */
export declare function convertMapToArray<K, V>(map: Map<K, V>): (K | V)[];
/**
 * Convert a non-string arg to a string
 */
export declare function toArg(arg: any): string;
/**
 * Optimize error stack
 *
 * @param error actually error
 * @param friendlyStack the stack that more meaningful
 * @param filterPath only show stacks with the specified path
 */
export declare function optimizeErrorStack(error: Error, friendlyStack: string, filterPath: string): Error;
/**
 * Parse the redis protocol url
 */
export declare function parseURL(url: string): Record<string, unknown>;
interface TLSOptions {
    port: number;
    host: string;
    [key: string]: any;
}
/**
 * Resolve TLS profile shortcut in connection options
 */
export declare function resolveTLSProfile(options: TLSOptions): TLSOptions;
/**
 * Get a random element from `array`
 */
export declare function sample<T>(array: T[], from?: number): T;
/**
 * Shuffle the array using the Fisher-Yates Shuffle.
 * This method will mutate the original array.
 */
export declare function shuffle<T>(array: T[]): T[];
/**
 * Error message for connection being disconnected
 */
export declare const CONNECTION_CLOSED_ERROR_MSG = "Connection is closed.";
export declare function zipMap<K, V>(keys: K[], values: V[]): Map<K, V>;
export { Debug, defaults, noop };
