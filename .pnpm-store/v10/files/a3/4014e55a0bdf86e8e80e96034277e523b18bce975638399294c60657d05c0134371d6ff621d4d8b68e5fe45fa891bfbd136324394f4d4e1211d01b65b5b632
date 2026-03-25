/// <reference types="node" />
import { Transform, TransformOptions } from "stream";

export = Scan.make;

declare class Scan extends Transform {
    constructor(options?: Scan.Options);
}

declare namespace Scan {
    type Reducer = (acc: any, initial: any) => any;

    interface Options extends TransformOptions {
        initial?: any;
        reducer?: Reducer;
    }

    /**
     * `scan()` takes and combines stream values using a reduce function supplied by
     * the user, passing through the latest (running) value of an accumulator
     * unlike fold(), which passes it through only once when a stream ends.
     *
     * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-scan()}
     *
     * @example
     * ```javascript
     * const {chain} = require('stream-chain');
     * const scan = require('stream-chain/utils/scan');
     *
     * const pipeline = chain([
     *   scan((acc, value) => acc + value, 0)
     *   // ... the rest of the pipeline
     * ]);
     * // input:  1, 2, 3, 4, 5
     * // output: 1, 3, 6, 10, 15
     * ```
     */
    function make(reducer: Reducer | Required<Pick<Options, "reducer" | "initial">> & Options, initial?: any): Scan;

    namespace make {
        const Constructor: Scan;
    }
}
