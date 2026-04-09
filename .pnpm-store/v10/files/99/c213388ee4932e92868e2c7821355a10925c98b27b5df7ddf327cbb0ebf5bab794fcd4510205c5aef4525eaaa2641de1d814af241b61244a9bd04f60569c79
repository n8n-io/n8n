import { AbstractStreamReader } from "./AbstractStreamReader.js";
export declare abstract class WebStreamReader extends AbstractStreamReader {
    protected reader: ReadableStreamDefaultReader | ReadableStreamBYOBReader;
    constructor(reader: ReadableStreamDefaultReader | ReadableStreamBYOBReader);
    /**
     * Read from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @param mayBeLess - If true, may fill the buffer partially
     * @protected Bytes read
     */
    protected abstract readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;
    abort(): Promise<void>;
    close(): Promise<void>;
}
