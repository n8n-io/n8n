import Chain = require("stream-chain");
import { Transform, TransformOptions } from "stream";

export = Batch;

declare class Batch extends Transform {
    constructor(options?: Batch.BatchOptions);
}

declare namespace Batch {
    interface BatchOptions extends TransformOptions {
        /**
         * The size of each batch. Defaults to 1000. Ignored
         * if not a positive number.
         */
        batchSize?: number | undefined;
    }

    function make(options?: BatchOptions): Batch;

    namespace make {
        type Constructor = Batch;
        const Constructor: typeof Batch;
    }

    function batch(options?: BatchOptions): Batch;

    namespace batch {
        type Constructor = Batch;
        const Constructor: typeof Batch;
    }

    function withParser(options?: BatchOptions): Chain;
}
