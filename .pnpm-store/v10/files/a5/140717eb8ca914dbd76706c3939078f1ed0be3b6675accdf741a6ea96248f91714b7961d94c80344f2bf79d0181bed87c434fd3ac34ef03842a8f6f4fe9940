import { Transform, TransformCallback, TransformOptions } from "stream";
import Assembler = require("../Assembler");

export = StreamBase;

declare class StreamBase extends Transform {
    constructor(options?: StreamBase.StreamOptions);
    _assembler: Assembler;
    _filter: (chunk: any, encoding: BufferEncoding, callback: TransformCallback) => void;
}

declare namespace StreamBase {
    type ObjectFilterFunction = (asm: Assembler) => boolean | undefined;

    interface StreamOptions extends TransformOptions {
        objectFilter?: ObjectFilterFunction | undefined;
        includeUndecided?: boolean | undefined;
    }
}
