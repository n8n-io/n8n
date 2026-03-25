/**
 * @module
 * Stream utility.
 */
export declare class StreamingApi {
    private writer;
    private encoder;
    private writable;
    private abortSubscribers;
    responseReadable: ReadableStream;
    /**
     * Whether the stream has been aborted.
     */
    aborted: boolean;
    /**
     * Whether the stream has been closed normally.
     */
    closed: boolean;
    constructor(writable: WritableStream, _readable: ReadableStream);
    write(input: Uint8Array | string): Promise<StreamingApi>;
    writeln(input: string): Promise<StreamingApi>;
    sleep(ms: number): Promise<unknown>;
    close(): Promise<void>;
    pipe(body: ReadableStream): Promise<void>;
    onAbort(listener: () => void | Promise<void>): void;
    /**
     * Abort the stream.
     * You can call this method when stream is aborted by external event.
     */
    abort(): void;
}
