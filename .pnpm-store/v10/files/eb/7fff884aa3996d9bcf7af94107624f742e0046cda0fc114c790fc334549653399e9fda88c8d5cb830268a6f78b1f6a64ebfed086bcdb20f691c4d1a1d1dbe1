/// <reference types="node" />
import {
    final as finalType,
    getFinalValue as getFinalValueType,
    getManyValues as getManyValuesType,
    isFinal as isFinalType,
    isMany as isManyType,
    many as manyType,
    none as noneType,
} from "../defs";

export = asFun;

/**
 * `asFun()` is a utility to build pipelines from a list of functions (including
 * asynchronous ones, generators, and asynchronous generators) bypassing the
 * streaming framework and packaging it as an asynchronous function, which can
 * work on Node 8 and up.
 *
 * If your target is Node 10 and up, you may consider `asGen()`, which wraps
 * everything in an asynchronous generator.
 *
 * `asFun()` takes functions as arguments and builds a pipeline connecting them.
 * The result is presented as an asynchronous function, which can return:
 *
 *   * none when no result was produced.
 *   * a value wrapped in many() for multiple results.
 *   * any other value for a singular as-is value.
 *
 * The first argument can be an iterator object or an asynchronous iterator
 * object, which serves as a source of data. Usually, in this case, the returned
 * function is called without a value (because it will be ignored anyway).
 *
 * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-asFun()}
 *
 * @example
 * ```javascript
 * const {chain, none, final} = require('stream-chain');
 * const {asFun} = require('stream-chain/utils/asFun');
 *
 * const pipeline = asFun(
 *   x => x % 2 == 0 ? none : x,
 *   x => x === 1 ? final(1) : x;
 *   x => x * x
 * );
 *
 * // in async context:
 * const data = [1, 2, 3, 4, 5];
 * for (const value of data) {
 *   const result = await pipeline(value);
 *   if (result === none) continue;
 *   console.log(result);
 * }
 * // 1, 9, 25
 * ```
 */
declare function asFun(...fns: asFun.ComposableFunction[]): (() => void) | ((value: any) => Promise<any>);

declare namespace asFun {
    type ComposableFunction = ((value: any) => any) | Promise<any> | Generator<any> | AsyncGenerator<any>;

    /**
     * This is the workhorse of the module. It takes the following arguments:
     * @param value any suitable value for processing
     * @param fns array of functions to pass value through. It can be any function
     * including async, generators, or async generators
     * @param index a non-negative integer value, which serves as an index in fns to
     * start the processing from. Usually it is used for recursive calls, while users
     * start processing from 0
     * @param push a function that takes one processed value
     */
    function next(value: any, fns: any[], index: number, push: (val: any) => void): Promise<void>;

    // all of the utilities from defs
    const none: typeof noneType;
    const final: typeof finalType;
    const isFinal: typeof isFinalType;
    const getFinalValue: typeof getFinalValueType;
    const many: typeof manyType;
    const isMany: typeof isManyType;
    const getManyValues: typeof getManyValuesType;
}
