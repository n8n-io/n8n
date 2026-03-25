/// <reference types="node" />
import type { Logger } from "@smithy/types";
import { Readable } from "node:stream";
/**
 * @internal
 * @param upstream - any Readable or ReadableStream.
 * @param size - byte or character length minimum. Buffering occurs when a chunk fails to meet this value.
 * @param onBuffer - for emitting warnings when buffering occurs.
 * @returns another stream of the same data and stream class, but buffers chunks until
 * the minimum size is met, except for the last chunk.
 */
export declare function createBufferedReadable(upstream: Readable, size: number, logger?: Logger): Readable;
export declare function createBufferedReadable(upstream: ReadableStream, size: number, logger?: Logger): ReadableStream;
