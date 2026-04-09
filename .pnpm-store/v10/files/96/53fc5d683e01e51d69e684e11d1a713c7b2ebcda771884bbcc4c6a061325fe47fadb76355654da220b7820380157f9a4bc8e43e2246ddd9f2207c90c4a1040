import { StreamReader, makeWebStreamReader } from './stream/index.js';
import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { BufferTokenizer } from './BufferTokenizer.js';
import { BlobTokenizer } from './BlobTokenizer.js';
export { EndOfStreamError, AbortError } from './stream/index.js';
export { AbstractTokenizer } from './AbstractTokenizer.js';
/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromStream(stream, options) {
    const streamReader = new StreamReader(stream);
    const _options = options ?? {};
    const chainedClose = _options.onClose;
    _options.onClose = async () => {
        await streamReader.close();
        if (chainedClose) {
            return chainedClose();
        }
    };
    return new ReadStreamTokenizer(streamReader, _options);
}
/**
 * Construct ReadStreamTokenizer from given ReadableStream (WebStream API).
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param webStream - Read from Node.js Stream.Readable (must be a byte stream)
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export function fromWebStream(webStream, options) {
    const webStreamReader = makeWebStreamReader(webStream);
    const _options = options ?? {};
    const chainedClose = _options.onClose;
    _options.onClose = async () => {
        await webStreamReader.close();
        if (chainedClose) {
            return chainedClose();
        }
    };
    return new ReadStreamTokenizer(webStreamReader, _options);
}
/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param uint8Array - Uint8Array to tokenize
 * @param options - Tokenizer options
 * @returns BufferTokenizer
 */
export function fromBuffer(uint8Array, options) {
    return new BufferTokenizer(uint8Array, options);
}
/**
 * Construct ReadStreamTokenizer from given Blob.
 * @param blob - Uint8Array to tokenize
 * @param options - Tokenizer options
 * @returns BufferTokenizer
 */
export function fromBlob(blob, options) {
    return new BlobTokenizer(blob, options);
}
