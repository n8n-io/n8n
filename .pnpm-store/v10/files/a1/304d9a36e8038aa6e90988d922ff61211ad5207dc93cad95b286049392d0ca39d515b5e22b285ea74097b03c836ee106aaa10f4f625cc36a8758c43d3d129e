import type { ITokenizerOptions, IReadChunkOptions, IRandomAccessFileInfo, IRandomAccessTokenizer } from './types.js';
import { AbstractTokenizer } from './AbstractTokenizer.js';
export declare class BufferTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {
    private uint8Array;
    fileInfo: IRandomAccessFileInfo;
    /**
     * Construct BufferTokenizer
     * @param uint8Array - Uint8Array to tokenize
     * @param options Tokenizer options
     */
    constructor(uint8Array: Uint8Array, options?: ITokenizerOptions);
    /**
     * Read buffer from tokenizer
     * @param uint8Array - Uint8Array to tokenize
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    /**
     * Peek (read ahead) buffer from tokenizer
     * @param uint8Array
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    close(): Promise<void>;
    supportsRandomAccess(): boolean;
    setPosition(position: number): void;
}
