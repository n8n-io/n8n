import { AbstractStreamReader } from "./AbstractStreamReader.js";
export declare class WebStreamDefaultReader extends AbstractStreamReader {
    private reader;
    private buffer;
    constructor(reader: ReadableStreamDefaultReader<Uint8Array>);
    /**
     * Copy chunk to target, and store the remainder in this.buffer
     */
    private writeChunk;
    /**
     * Read from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @param mayBeLess - If true, may fill the buffer partially
     * @protected Bytes read
     */
    protected readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;
    abort(): Promise<void>;
    close(): Promise<void>;
}
