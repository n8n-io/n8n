/// <reference types="node" />
import { Transform, TransformOptions } from "stream";

export = SkipWhile.make;

declare class SkipWhile extends Transform {
    constructor(options?: SkipWhile.Options);
}

declare namespace SkipWhile {
    interface Options extends TransformOptions {
        condition?: ((value: any) => boolean) | PromiseLike<boolean>;
    }

    /**
     * `skipWhile()` skips items as long as a function returns a truthy value, then
     * all items are passed. It is based on Transform.
     *
     * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-skipWhile()}
     *
     * @example
     * ```javascript
     * const {chain} = require('stream-chain');
     * const skipWhile = require('stream-chain/utils/skipWhile');
     *
     * // get numbers until we encounter 3
     * const pipeline = chain([
     *   skipWhile(item => item !== 3)
     *   // ... the rest of the pipeline
     * ]);
     * // input:  1, 2, 3, 4, 5
     * // output: 3, 4, 5
     * ```
     */
    function make(
        condition: ((value: any) => boolean) | PromiseLike<boolean> | Required<Pick<Options, "condition">> & Options,
    ): SkipWhile;

    namespace make {
        const Constructor: SkipWhile;
    }
}
