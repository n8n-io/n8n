import { AbstractTokenizer } from './AbstractTokenizer.js';
import type { IRandomAccessTokenizer, IRandomAccessFileInfo, IReadChunkOptions, ITokenizerOptions } from './types.js';
import { type FileHandle } from 'node:fs/promises';
interface IFileTokenizerOptions extends ITokenizerOptions {
    /**
     * Pass additional file information to the tokenizer
     */
    fileInfo: IRandomAccessFileInfo;
}
export declare class FileTokenizer extends AbstractTokenizer implements IRandomAccessTokenizer {
    private fileHandle;
    fileInfo: IRandomAccessFileInfo;
    /**
     * Create tokenizer from provided file path
     * @param sourceFilePath File path
     */
    static fromFile(sourceFilePath: string): Promise<FileTokenizer>;
    protected constructor(fileHandle: FileHandle, options: IFileTokenizerOptions);
    /**
     * Read buffer from file
     * @param uint8Array - Uint8Array to write result to
     * @param options - Read behaviour options
     * @returns Promise number of bytes read
     */
    readBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    /**
     * Peek buffer from file
     * @param uint8Array - Uint8Array (or Buffer) to write data to
     * @param options - Read behaviour options
     * @returns Promise number of bytes read
     */
    peekBuffer(uint8Array: Uint8Array, options?: IReadChunkOptions): Promise<number>;
    close(): Promise<void>;
    setPosition(position: number): void;
    supportsRandomAccess(): boolean;
}
export {};
