import type { Checksum, Encoder } from "@smithy/types";
import type { Readable } from "stream";
import { Duplex } from "stream";
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
 * Wrapper for throwing checksum errors for streams without
 * buffering the stream.
 *
 * @internal
 */
export declare class ChecksumStream extends Duplex {
    private expectedChecksum;
    private checksumSourceLocation;
    private checksum;
    private source?;
    private base64Encoder;
    private pendingCallback;
    constructor({ expectedChecksum, checksum, source, checksumSourceLocation, base64Encoder, }: ChecksumStreamInit<Readable>);
    /**
     * Do not call this directly.
     * @internal
     */
    _read(size: number): void;
    /**
     * When the upstream source flows data to this stream,
     * calculate a step update of the checksum.
     * Do not call this directly.
     * @internal
     */
    _write(chunk: Buffer, encoding: string, callback: (err?: Error) => void): void;
    /**
     * When the upstream source finishes, perform the checksum comparison.
     * Do not call this directly.
     * @internal
     */
    _final(callback: (err?: Error) => void): Promise<void>;
}
