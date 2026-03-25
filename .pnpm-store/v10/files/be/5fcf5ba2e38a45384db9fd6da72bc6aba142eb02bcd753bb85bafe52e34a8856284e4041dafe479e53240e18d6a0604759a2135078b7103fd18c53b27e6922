/// <reference types="node" />
import { Transform, TransformOptions } from "stream";

export = Take.make;

declare class Take extends Transform {
    constructor(options?: Take.Options);
}

declare namespace Take {
    interface Options extends TransformOptions {
        /** positive integer indicating how many items to take. Default 1 */
        n?: number;
        /** non-negative integer indicating how many items to skip from the beginning before starting to take. Default 0 */
        skip?: number;
    }

    /**
     * `take()` takes a given number of items from a stream optionally skipping some
     * elements before that. It is based on Transform.
     *
     * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-take()}
     *
     * @example
     * ```javascript
     * const {chain} = require('stream-chain');
     * const take = require('stream-chain/utils/take');
     *
     * // get 5 items from the top
     * const pipeline = chain([
     *   take(5)
     *   // ... the rest of the pipeline
     * ]);
     *
     * // skip 10, then get 5 items
     * const pipeline = chain([
     *   take({skip: 10, n: 5})
     *   // ... the rest of the pipeline
     * ]);
     * ```
     */
    function make(n: number | Required<Pick<Options, "n">> & Options): Take;

    namespace make {
        const Constructor: Take;
    }
}
