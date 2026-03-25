/// <reference types="node" />
import { Writable, WritableOptions } from "stream";

export = Reduce;

/**
 * `Reduce` takes and combines stream values using a reduce function supplied by
 * the user. The functionality is similar to `Array.prototype.reduce()`.
 *
 * Being Writable it always terminates a pipeline and does not produce any items.
 *
 * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-Reduce}
 *
 * @example
 * ```javascript
 * const {chain} = require('stream-chain');
 * const Reduce = require('stream-chain/utils/Reduce');
 *
 * const r = new Reduce({reducer: (acc, value) => acc + value, initial: 0});
 *
 * const pipeline = chain([
 *   // ... the rest of the pipeline
 *   r
 * ]);
 * // input: 1, 2, 3, 4, 5
 *
 * r.on('finish', () => {
 *   console.log(r.accumulator);
 *   // output: 15
 * });
 * ```
 */
declare class Reduce extends Writable {
    constructor(options?: Reduce.Options);
    accumulator: any;
}

declare namespace Reduce {
    type Reducer = (acc: any, initial: any) => any;

    interface Options extends WritableOptions {
        initial?: any;
        reducer?: Reducer;
    }

    function make(reducer: Reducer | Required<Pick<Options, "reducer" | "initial">> & Options, initial?: any): Reduce;

    namespace make {
        const Constructor: Reduce;
    }
}
