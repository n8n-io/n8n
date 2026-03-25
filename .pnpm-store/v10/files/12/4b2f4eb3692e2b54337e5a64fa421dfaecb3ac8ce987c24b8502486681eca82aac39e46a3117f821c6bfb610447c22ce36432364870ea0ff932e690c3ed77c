/// <reference types="node" />
import { Transform, TransformOptions } from "stream";

export = TakeWhile.make;

declare class TakeWhile extends Transform {
    constructor(options?: TakeWhile.Options);
}

declare namespace TakeWhile {
    interface Options extends TransformOptions {
        condition?: ((value: any) => boolean) | PromiseLike<boolean>;
    }

    /**
     * `takeWhile()` takes items as long as a function returns a truthy value, then
     * all items are ignored. It is based on Transform.
     *
     * @see {@link https://github.com/uhop/stream-chain/wiki/utils:-takeWhile()}
     *
     * @example
     * ```javascript
     * const {chain} = require('stream-chain');
     * const takeWhile = require('stream-chain/utils/takeWhile');
     *
     * // get numbers until we encounter 3
     * const pipeline = chain([
     *   takeWhile(item => item !== 3)
     *   // ... the rest of the pipeline
     * ]);
     * // input:  1, 2, 3, 4, 5
     * // output: 1, 2
     * ```
     */
    function make(
        condition: ((value: any) => boolean) | PromiseLike<boolean> | Required<Pick<Options, "condition">> & Options,
    ): TakeWhile;

    namespace make {
        const Constructor: TakeWhile;
    }
}
