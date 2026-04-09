export interface IStreamReader {
    /**
     * Peak ahead (peek) from stream. Subsequent read or peeks will return the same data.
     * @param uint8Array - Uint8Array (or Buffer) to store data read from stream in
     * @param mayBeLess - Allow the read to complete, without the buffer being fully filled (length may be smaller)
     * @returns Number of bytes peeked. If `maybeLess` is set, this shall be the `uint8Array.length`.
     */
    peek(uint8Array: Uint8Array, mayBeLess?: boolean): Promise<number>;
    /**
     * Read from stream the stream.
     * @param uint8Array - Uint8Array (or Buffer) to store data read from stream in
     * @param mayBeLess - Allow the read to complete, without the buffer being fully filled (length may be smaller)
     * @returns Number of actually bytes read. If `maybeLess` is set, this shall be the `uint8Array.length`.
     */
    read(uint8Array: Uint8Array, mayBeLess?: boolean): Promise<number>;
    close(): Promise<void>;
    /**
     * Abort any active asynchronous operation are active, abort those before they may have completed.
     */
    abort(): Promise<void>;
}
export declare abstract class AbstractStreamReader implements IStreamReader {
    protected endOfStream: boolean;
    protected interrupted: boolean;
    /**
     * Store peeked data
     * @type {Array}
     */
    protected peekQueue: Uint8Array[];
    peek(uint8Array: Uint8Array, mayBeLess?: boolean): Promise<number>;
    read(buffer: Uint8Array, mayBeLess?: boolean): Promise<number>;
    /**
     * Read chunk from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @returns Number of bytes read
     */
    protected readFromPeekBuffer(buffer: Uint8Array): number;
    readRemainderFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;
    /**
     * Read from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @param mayBeLess - If true, may fill the buffer partially
     * @protected Bytes read
     */
    protected abstract readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;
    /**
     * abort synchronous operations
     */
    abstract close(): Promise<void>;
    /**
     * Abort any active asynchronous operation are active, abort those before they may have completed.
     */
    abstract abort(): Promise<void>;
}
