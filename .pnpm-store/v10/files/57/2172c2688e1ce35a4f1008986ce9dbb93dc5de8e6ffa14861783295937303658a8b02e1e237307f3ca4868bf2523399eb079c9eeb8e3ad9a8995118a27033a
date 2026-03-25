import Chain = require("stream-chain");
import StreamBase = require("./StreamBase");

export = StreamObject;

declare class StreamObject extends StreamBase {
    constructor(options?: StreamBase.StreamOptions);
}

declare namespace StreamObject {
    function make(options?: StreamBase.StreamOptions): StreamObject;

    namespace make {
        type Constructor = StreamObject;
        const Constructor: typeof StreamObject;
    }

    function streamObject(options?: StreamBase.StreamOptions): StreamObject;

    namespace streamObject {
        type Constructor = StreamObject;
        const Constructor: typeof StreamObject;
    }

    function withParser(options?: StreamBase.StreamOptions): Chain;
}
