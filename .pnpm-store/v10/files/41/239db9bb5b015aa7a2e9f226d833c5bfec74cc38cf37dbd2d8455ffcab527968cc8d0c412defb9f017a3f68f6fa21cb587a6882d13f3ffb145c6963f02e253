import { AbstractTokenizer } from './AbstractTokenizer.js';
import { type IStreamReader } from './stream/index.js';
import type { IFileInfo, IReadChunkOptions, ITokenizerOptions } from './types.js';
export declare class ReadStreamTokenizer extends AbstractTokenizer {
    private streamReader;
    fileInfo: IFileInfo;
    /**
     * Constructor
     * @param streamReader stream-reader to read from
     * @param options Tokenizer options
     */
    constructor(streamReader: IStreamReader, options?: ITokenizerOptions);
    /**
     * Read buffer from tokenizer
     * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
     * @param options - Read behaviour options
     * @returns Promise with number of bytes read
     */
    readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    /**
     * Peek (read ahead) buffer from tokenizer
     * @param uint8Array - Uint8Array (or Buffer) to write data to
     * @param options - Read behaviour options
     * @returns Promise with number of bytes peeked
     */
    peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    /**
     * @param length Number of bytes to ignore. Must be ≥ 0.
     */
    ignore(length: number): Promise<number>;
    abort(): Promise<void>;
    close(): Promise<void>;
    supportsRandomAccess(): boolean;
}
