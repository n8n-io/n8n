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

export = asGen;

/**
 * `asGen()` is a utility to build pipelines from a list of functions (including
 * asynchronous ones, generators, and asynchronous generators) bypassing the
 * streaming framework and packaging it as an asynchronous generator function,
 * which can work on Node 10 and up.
 *
 * If your target is Node 8 or in general you don't want to deal with generators,
 * you may consider `asFun()`, which wraps everything in an asynchronous function.
 *
 * `asGen()` takes functions as arguments and builds a pipeline connecting them.
 * The result is presented as an asynchronous generator function.
 *
 * The first argument can be an iterator object or an asynchronous iterator
 * object, which serves as a source of data. Usually, in this case, the returned
 * function is called without a value (because it will be ignored anyway).
 *
 * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-asGen()}
 *
 * @example
 * ```javascript
 * const {chain, none, final} = require('stream-chain');
 * const {asGen} = require('stream-chain/utils/asGen');
 *
 * const pipeline = asGen(
 *   x => x % 2 == 0 ? none : x,
 *   x => x === 1 ? final(1) : x;
 *   x => x * x
 * );
 *
 * // in async context:
 * const data = [1, 2, 3, 4, 5];
 * for (const value of data) {
 *   for await (const result of pipeline(value)) {
 *     console.log(result);
 *   }
 * }
 * // 1, 9, 25
 * ```
 */
declare function asGen(...fns: asGen.ComposableFunction[]): (value: any) => AsyncGenerator<any, void, any>;

declare namespace asGen {
    type ComposableFunction = ((value: any) => any) | Promise<any> | Generator<any> | AsyncGenerator<any>;

    /**
     * This is the workhorse of the module. It takes the following arguments:
     * @param value any suitable value for processing
     * @param fns an array of functions to pass value through. It can be any function
     *   including async, generators, or async generators
     * @param index a non-negative integer, which serves as an index in fns to start
     *   processing from. Usually it is used for recursive calls, whle users start
     *   processing from 0.
     */
    function next(value: any, fns: any[], index: number): AsyncGenerator<any, void, any>;

    // all of the utilities from defs
    const none: typeof noneType;
    const final: typeof finalType;
    const isFinal: typeof isFinalType;
    const getFinalValue: typeof getFinalValueType;
    const many: typeof manyType;
    const isMany: typeof isManyType;
    const getManyValues: typeof getManyValuesType;
}
