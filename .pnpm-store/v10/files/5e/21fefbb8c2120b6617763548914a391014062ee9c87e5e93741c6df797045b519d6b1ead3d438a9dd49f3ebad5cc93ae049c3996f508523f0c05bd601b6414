import { ChecksumStreamInit } from "./ChecksumStream.browser";
/**
 * @internal
 * Alias prevents compiler from turning
 * ReadableStream into ReadableStream<any>, which is incompatible
 * with the NodeJS.ReadableStream global type.
 */
export type ReadableStreamType = ReadableStream;
/**
 * @internal
 *
 * Creates a stream adapter for throwing checksum errors for streams without
 * buffering the stream.
 */
export declare const createChecksumStream: ({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }: ChecksumStreamInit) => ReadableStreamType;
