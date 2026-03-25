import type { Readable } from "stream";
/**
 * @internal
 * @param stream - to be read.
 * @param bytes - read head bytes from the stream and discard the rest of it.
 *
 * Caution: the input stream must be destroyed separately, this function does not do so.
 */
export declare const headStream: (stream: Readable | ReadableStream, bytes: number) => Promise<Uint8Array>;
