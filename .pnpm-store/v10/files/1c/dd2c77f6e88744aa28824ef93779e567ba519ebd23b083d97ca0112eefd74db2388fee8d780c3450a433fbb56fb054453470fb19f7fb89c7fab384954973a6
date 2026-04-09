import { Transform, type TransformCallback } from "node:stream";
import type { SnifferOptions } from "./sniffer.js";
/**
 * Sniff the encoding of a buffer, then decode it.
 *
 * @param buffer Buffer to be decoded
 * @param options Options for the sniffer
 * @returns The decoded buffer
 */
export declare function decodeBuffer(buffer: Buffer, options?: SnifferOptions): string;
/**
 * Decodes a stream of buffers into a stream of strings.
 *
 * Reads the first 1024 bytes and passes them to the sniffer. Once an encoding
 * has been determined, it passes all data to iconv-lite's stream and outputs
 * the results.
 */
export declare class DecodeStream extends Transform {
    private readonly sniffer;
    private readonly buffers;
    /** The iconv decode stream. If it is set, we have read more than `options.maxBytes` bytes. */
    private iconv;
    private readonly maxBytes;
    private readBytes;
    constructor(options?: SnifferOptions);
    _transform(chunk: Uint8Array, _encoding: string, callback: TransformCallback): void;
    private getIconvStream;
    _flush(callback: TransformCallback): void;
}
export { type SnifferOptions, getEncoding } from "./sniffer.js";
//# sourceMappingURL=index.d.ts.map