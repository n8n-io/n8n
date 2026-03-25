/// <reference types="node" />
import { Readable, ReadableOptions } from "stream";

export = FromIterable;

declare class FromIterable extends Readable {
    constructor(options?: FromIterable.Options);
}

declare namespace FromIterable {
    type IterableType = Iterable<any> | AsyncIterable<any> | PromiseLike<any>;

    interface Options extends ReadableOptions {
        iterable?: IterableType;
    }

    function make(iterable: IterableType | Options): FromIterable;

    namespace make {
        const Constructor: FromIterable;
    }
}
