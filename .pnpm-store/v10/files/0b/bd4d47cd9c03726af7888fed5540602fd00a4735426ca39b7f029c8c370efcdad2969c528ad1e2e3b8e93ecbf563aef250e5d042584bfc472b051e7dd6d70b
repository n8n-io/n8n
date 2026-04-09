import type { ReadableOptions } from "node:stream";
import { Readable } from "node:stream";
export interface ReadFromBuffersOptions extends ReadableOptions {
    buffers: Buffer[];
    errorAfter?: number;
}
export declare class ReadFromBuffers extends Readable {
    private buffersToRead;
    private numBuffersRead;
    private errorAfter;
    constructor(options: ReadFromBuffersOptions);
    _read(): boolean | undefined;
}
