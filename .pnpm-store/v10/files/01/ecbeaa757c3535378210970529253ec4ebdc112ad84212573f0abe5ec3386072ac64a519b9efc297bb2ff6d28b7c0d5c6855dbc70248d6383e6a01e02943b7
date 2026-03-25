import { Writable, WritableOptions } from "stream";

export = Emitter;

declare class Emitter extends Writable {
    constructor(options?: WritableOptions);
}

declare namespace Emitter {
    function make(options?: WritableOptions): Emitter;

    namespace make {
        type Constructor = Emitter;
        const Constructor: typeof Emitter;
    }

    function emitter(options?: WritableOptions): Emitter;

    namespace emitter {
        type Constructor = Emitter;
        const Constructor: typeof Emitter;
    }
}
