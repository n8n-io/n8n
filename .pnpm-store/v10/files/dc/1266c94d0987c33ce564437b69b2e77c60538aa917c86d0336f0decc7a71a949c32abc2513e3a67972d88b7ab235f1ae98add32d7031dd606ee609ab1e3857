import { WebStreamReader } from './WebStreamReader.js';
/**
 * Read from a WebStream using a BYOB reader
 * Reference: https://nodejs.org/api/webstreams.html#class-readablestreambyobreader
 */
export declare class WebStreamByobReader extends WebStreamReader {
    /**
     * Read from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @param mayBeLess - If true, may fill the buffer partially
     * @protected Bytes read
     */
    protected readFromStream(buffer: Uint8Array, mayBeLess: boolean): Promise<number>;
}
