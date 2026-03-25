/// <reference types="node" />
import { Checksum, Encoder } from "@smithy/types";
import { Duplex, Readable } from "stream";
/**
 * @internal
 */
export interface ChecksumStreamInit<T extends Readable | ReadableStream> {
    /**
     * Base64 value of the expected checksum.
     */
    expectedChecksum: string;
    /**
     * For error messaging, the location from which the checksum value was read.
     */
    checksumSourceLocation: string;
    /**
     * The checksum calculator.
     */
    checksum: Checksum;
    /**
     * The stream to be checked.
     */
    source: T;
    /**
     * Optional base 64 encoder if calling from a request context.
     */
    base64Encoder?: Encoder;
}
/**
 * @internal
 *
 * Wrapper for throwing checksum errors for streams without
 * buffering the stream.
 *
 */
export declare class ChecksumStream extends Duplex {
    private expectedChecksum;
    private checksumSourceLocation;
    private checksum;
    private source?;
    private base64Encoder;
    constructor({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }: ChecksumStreamInit<Readable>);
    /**
     * @internal do not call this directly.
     */
    _read(size: number): void;
    /**
     * @internal do not call this directly.
     *
     * When the upstream source flows data to this stream,
     * calculate a step update of the checksum.
     */
    _write(chunk: Buffer, encoding: string, callback: (err?: Error) => void): void;
    /**
     * @internal do not call this directly.
     *
     * When the upstream source finishes, perform the checksum comparison.
     */
    _final(callback: (err?: Error) => void): Promise<void>;
}
