import type { Readable } from 'node:stream';
import { type AnyWebByteStream } from './stream/index.js';
import { ReadStreamTokenizer } from './ReadStreamTokenizer.js';
import { BufferTokenizer } from './BufferTokenizer.js';
import type { ITokenizerOptions } from './types.js';
import { BlobTokenizer } from './BlobTokenizer.js';
export { EndOfStreamError, AbortError, type AnyWebByteStream } from './stream/index.js';
export type { ITokenizer, IRandomAccessTokenizer, IFileInfo, IRandomAccessFileInfo, ITokenizerOptions, IReadChunkOptions, OnClose } from './types.js';
export type { IToken, IGetToken } from '@tokenizer/token';
export { AbstractTokenizer } from './AbstractTokenizer.js';
/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export declare function fromStream(stream: Readable, options?: ITokenizerOptions): ReadStreamTokenizer;
/**
 * Construct ReadStreamTokenizer from given ReadableStream (WebStream API).
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param webStream - Read from Node.js Stream.Readable (must be a byte stream)
 * @param options - Tokenizer options
 * @returns ReadStreamTokenizer
 */
export declare function fromWebStream(webStream: AnyWebByteStream, options?: ITokenizerOptions): ReadStreamTokenizer;
/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param uint8Array - Uint8Array to tokenize
 * @param options - Tokenizer options
 * @returns BufferTokenizer
 */
export declare function fromBuffer(uint8Array: Uint8Array, options?: ITokenizerOptions): BufferTokenizer;
/**
 * Construct ReadStreamTokenizer from given Blob.
 * @param blob - Uint8Array to tokenize
 * @param options - Tokenizer options
 * @returns BufferTokenizer
 */
export declare function fromBlob(blob: Blob, options?: ITokenizerOptions): BlobTokenizer;
