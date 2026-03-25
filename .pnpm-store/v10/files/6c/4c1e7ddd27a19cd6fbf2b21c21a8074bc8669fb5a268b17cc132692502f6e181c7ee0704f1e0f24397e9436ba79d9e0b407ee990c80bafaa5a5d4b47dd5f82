/// <reference types="node" />
import { Transform } from "stream";

export = comp;

type ComposableFunction = ((value: any) => any) | Promise<any> | Generator<any> | AsyncGenerator<any>;

/**
 * `comp()` chains functions provided as arguments and wraps the result in a
 * Transform stream. Functions in a list are efficiently wired together without
 * using streams making the whole construct more performant.
 *
 * The current version of `comp()` is based on `asFun()`.
 *
 * The better alternative to `comp()` is `gen()`. Please consider using it if you
 * target Node 10 and up. In general, both `gen()` and `comp()` are designed to be
 * drop-in replacements of each other.
 *
 * This function takes functions (including asynchronous functions, generators,
 * and asynchronous generators), filters out all falsy values, and if the
 * resulting array is not empty connects them together and wraps them in a
 * Transform stream. Otherwise, it returns null.
 *
 * Special values described in Chain are recognized:
 *
 *   * none
 *   * final(value)
 *   * many(array)
 *
 * The final value will be sanitized according to rules defined in Chain.sanitize().
 *
 * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-comp()}
 *
 * @example
 * ```javascript
 * const {chain, none} = require('stream-chain');
 * const comp = require('stream-chain/utils/comp');
 *
 * const pipeline1 = chain([
 *   comp(
 *     x => x * x,
 *     x => x + 1,
 *     x => x % 2 ? none : x
 *   ),
 *   // ... the rest of the pipeline
 * ]);
 * // input:  1, 2, 3, 4, 5
 * // output: 5, 17
 *
 * // less performant version:
 * const pipeline2 = chain([
 *   x => x * x,
 *   x => x + 1,
 *   x => x % 2 ? none : x,
 *   // ... the rest of the pipeline
 * ]);
 * // input:  1, 2, 3, 4, 5
 * // output: 5, 17
 * ```
 */
declare function comp(...fns: ComposableFunction[]): Transform | null;
