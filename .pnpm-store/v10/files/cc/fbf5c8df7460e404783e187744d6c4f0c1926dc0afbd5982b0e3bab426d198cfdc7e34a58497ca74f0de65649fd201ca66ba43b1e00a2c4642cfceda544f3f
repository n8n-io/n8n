/// <reference types="node" />
import { Transform, TransformOptions } from "stream";

export = Skip.make;

declare class Skip extends Transform {
    constructor(options?: Skip.Options);
}

declare namespace Skip {
    interface Options extends TransformOptions {
        n?: number;
    }

    /**
     * `skip()` skips a given number of items from a stream. It is based on Transform.
     *
     * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-skip()}
     *
     * @example
     * ```javascript
     * const {chain} = require('stream-chain');
     * const skip = require('stream-chain/utils/skip');
     *
     * // skip 10 items
     * const pipeline = chain([
     *   skip(10)
     *   // ... the rest of the pipeline
     * ]);
     * ```
     */
    function make(n: number | Required<Pick<Options, "n">> & Options): Skip;

    namespace make {
        const Constructor: Skip;
    }
}
