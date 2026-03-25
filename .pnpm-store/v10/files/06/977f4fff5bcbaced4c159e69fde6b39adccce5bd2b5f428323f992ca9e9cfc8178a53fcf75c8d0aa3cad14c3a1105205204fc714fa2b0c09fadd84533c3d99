/// <reference types="node" />
import { Readable } from "stream";
import { ChecksumStreamInit } from "./ChecksumStream";
import { ReadableStreamType } from "./createChecksumStream.browser";
/**
 * @internal
 *
 * Creates a stream mirroring the input stream's interface, but
 * performs checksumming when reading to the end of the stream.
 */
export declare function createChecksumStream(init: ChecksumStreamInit<ReadableStreamType>): ReadableStreamType;
export declare function createChecksumStream(init: ChecksumStreamInit<Readable>): Readable;
