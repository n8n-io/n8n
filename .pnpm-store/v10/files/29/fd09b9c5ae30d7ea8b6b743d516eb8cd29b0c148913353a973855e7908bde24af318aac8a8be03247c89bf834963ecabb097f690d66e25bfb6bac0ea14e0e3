import { Logger } from "@smithy/types";
import { ByteArrayCollector } from "./ByteArrayCollector";
export type BufferStore = [
    string,
    ByteArrayCollector,
    ByteArrayCollector?
];
export type BufferUnion = string | Uint8Array;
export type Modes = 0 | 1 | 2;
/**
 * @internal
 * @param upstream - any ReadableStream.
 * @param size - byte or character length minimum. Buffering occurs when a chunk fails to meet this value.
 * @param logger - for emitting warnings when buffering occurs.
 * @returns another stream of the same data, but buffers chunks until
 * the minimum size is met, except for the last chunk.
 */
export declare function createBufferedReadableStream(upstream: ReadableStream, size: number, logger?: Logger): ReadableStream;
/**
 * Replaces R/RS polymorphic implementation in environments with only ReadableStream.
 * @internal
 */
export declare const createBufferedReadable: typeof createBufferedReadableStream;
/**
 * @internal
 * @param buffers
 * @param mode
 * @param chunk
 * @returns the new buffer size after merging the chunk with its appropriate buffer.
 */
export declare function merge(buffers: BufferStore, mode: Modes, chunk: string | Uint8Array): number;
/**
 * @internal
 * @param buffers
 * @param mode
 * @returns the buffer matching the mode.
 */
export declare function flush(buffers: BufferStore, mode: Modes | -1): BufferUnion;
/**
 * @internal
 * @param chunk
 * @returns size of the chunk in bytes or characters.
 */
export declare function sizeOf(chunk?: {
    byteLength?: number;
    length?: number;
}): number;
/**
 * @internal
 * @param chunk - from upstream Readable.
 * @param allowBuffer - allow mode 2 (Buffer), otherwise Buffer will return mode 1.
 * @returns type index of the chunk.
 */
export declare function modeOf(chunk: BufferUnion, allowBuffer?: boolean): Modes | -1;
