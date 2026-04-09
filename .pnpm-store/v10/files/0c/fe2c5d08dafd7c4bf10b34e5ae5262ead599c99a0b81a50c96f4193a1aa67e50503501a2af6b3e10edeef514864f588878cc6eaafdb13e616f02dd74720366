import type { ITokenizerOptions, IReadChunkOptions, IRandomAccessFileInfo, IRandomAccessTokenizer } from './types.js';
import { AbstractTokenizer } from './AbstractTokenizer.js';
export declare class BlobTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {
    private blob;
    fileInfo: IRandomAccessFileInfo;
    /**
     * Construct BufferTokenizer
     * @param blob - Uint8Array to tokenize
     * @param options Tokenizer options
     */
    constructor(blob: Blob, options?: ITokenizerOptions);
    /**
     * Read buffer from tokenizer
     * @param uint8Array - Uint8Array to tokenize
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    /**
     * Peek (read ahead) buffer from tokenizer
     * @param buffer
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    close(): Promise<void>;
    supportsRandomAccess(): boolean;
    setPosition(position: number): void;
}
