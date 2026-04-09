import { EndOfStreamError } from './stream/index.js';
import { AbstractTokenizer } from './AbstractTokenizer.js';
export class BlobTokenizer extends AbstractTokenizer {
    /**
     * Construct BufferTokenizer
     * @param blob - Uint8Array to tokenize
     * @param options Tokenizer options
     */
    constructor(blob, options) {
        super(options);
        this.blob = blob;
        this.fileInfo = { ...options?.fileInfo ?? {}, ...{ size: blob.size, mimeType: blob.type } };
    }
    /**
     * Read buffer from tokenizer
     * @param uint8Array - Uint8Array to tokenize
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    async readBuffer(uint8Array, options) {
        if (options?.position) {
            this.position = options.position;
        }
        const bytesRead = await this.peekBuffer(uint8Array, options);
        this.position += bytesRead;
        return bytesRead;
    }
    /**
     * Peek (read ahead) buffer from tokenizer
     * @param buffer
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    async peekBuffer(buffer, options) {
        const normOptions = this.normalizeOptions(buffer, options);
        const bytes2read = Math.min(this.blob.size - normOptions.position, normOptions.length);
        if ((!normOptions.mayBeLess) && bytes2read < normOptions.length) {
            throw new EndOfStreamError();
        }
        const arrayBuffer = await this.blob.slice(normOptions.position, normOptions.position + bytes2read).arrayBuffer();
        buffer.set(new Uint8Array(arrayBuffer));
        return bytes2read;
    }
    close() {
        return super.close();
    }
    supportsRandomAccess() {
        return true;
    }
    setPosition(position) {
        this.position = position;
    }
}
