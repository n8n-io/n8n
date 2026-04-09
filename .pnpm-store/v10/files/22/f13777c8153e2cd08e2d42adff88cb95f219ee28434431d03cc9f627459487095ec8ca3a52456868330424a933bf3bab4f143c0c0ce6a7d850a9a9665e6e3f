import type { ChecksumStreamInit } from "./ChecksumStream.browser";
/**
 * Alias prevents compiler from turning
 * ReadableStream into ReadableStream<any>, which is incompatible
 * with the NodeJS.ReadableStream global type.
 * @internal
 */
export type ReadableStreamType = ReadableStream;
/**
 * Creates a stream adapter for throwing checksum errors for streams without
 * buffering the stream.
 * @internal
 */
export declare const createChecksumStream: ({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }: ChecksumStreamInit) => ReadableStreamType;
