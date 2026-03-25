/// <reference types="node" />
import { Transform, TransformOptions } from "stream";

export = Fold.make;

declare class Fold extends Transform {
    constructor(options?: Fold.Options);
}

declare namespace Fold {
    type Reducer = (acc: any, initial: any) => any;

    interface Options extends TransformOptions {
        reducer?: Reducer;
        initial?: any;
    }

    /**
     * `fold()` takes and combines values using a reduce function supplied by a user.
     * When a stream is ended, `fold()` passes through a single value: the last value
     * of an accumulator. The functionality is similar to `Array.prototype.reduce()`.
     * It is based on Transform.
     *
     * It takes one or two arguments and returns a Transform stream.
     *
     * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-fold()}
     *
     * @param reducer a reducer function (sync or async) or a Transform config object
     * containing the options .reducer and .initial
     * @param initial the initial value of the accumulator
     *
     * @example
     * ```javascript
     * const {chain} = require('stream-chain');
     * const fold = require('stream-chain/utils/fold');
     *
     * const pipeline = chain([
     *   fold((acc, value) => acc + value, 0)
     *   // ... the rest of the pipeline
     * ]);
     * // input:  1, 2, 3, 4, 5
     * // output: 15
     * ```
     */
    function make(reducer: Reducer | Required<Pick<Options, "reducer" | "initial">> & Options, initial?: any): Fold;

    namespace make {
        const Constructor: Fold;
    }
}
