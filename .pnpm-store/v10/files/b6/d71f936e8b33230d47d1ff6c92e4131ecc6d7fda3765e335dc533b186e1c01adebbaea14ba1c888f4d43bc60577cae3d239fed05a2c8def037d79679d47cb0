import { AbstractTokenizer } from './AbstractTokenizer.js';
import { EndOfStreamError } from './stream/index.js';
import { open as fsOpen } from 'node:fs/promises';
export class FileTokenizer extends AbstractTokenizer {
    /**
     * Create tokenizer from provided file path
     * @param sourceFilePath File path
     */
    static async fromFile(sourceFilePath) {
        const fileHandle = await fsOpen(sourceFilePath, 'r');
        const stat = await fileHandle.stat();
        return new FileTokenizer(fileHandle, { fileInfo: { path: sourceFilePath, size: stat.size } });
    }
    constructor(fileHandle, options) {
        super(options);
        this.fileHandle = fileHandle;
        this.fileInfo = options.fileInfo;
    }
    /**
     * Read buffer from file
     * @param uint8Array - Uint8Array to write result to
     * @param options - Read behaviour options
     * @returns Promise number of bytes read
     */
    async readBuffer(uint8Array, options) {
        const normOptions = this.normalizeOptions(uint8Array, options);
        this.position = normOptions.position;
        if (normOptions.length === 0)
            return 0;
        const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
        this.position += res.bytesRead;
        if (res.bytesRead < normOptions.length && (!options || !options.mayBeLess)) {
            throw new EndOfStreamError();
        }
        return res.bytesRead;
    }
    /**
     * Peek buffer from file
     * @param uint8Array - Uint8Array (or Buffer) to write data to
     * @param options - Read behaviour options
     * @returns Promise number of bytes read
     */
    async peekBuffer(uint8Array, options) {
        const normOptions = this.normalizeOptions(uint8Array, options);
        const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
        if ((!normOptions.mayBeLess) && res.bytesRead < normOptions.length) {
            throw new EndOfStreamError();
        }
        return res.bytesRead;
    }
    async close() {
        await this.fileHandle.close();
        return super.close();
    }
    setPosition(position) {
        this.position = position;
    }
    supportsRandomAccess() {
        return true;
    }
}
