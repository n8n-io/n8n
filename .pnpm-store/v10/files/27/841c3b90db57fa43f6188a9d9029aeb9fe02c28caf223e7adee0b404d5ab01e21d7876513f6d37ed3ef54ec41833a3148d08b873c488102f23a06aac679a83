/**
 * @file Batteries-included version of Cheerio. This module includes several
 *   convenience methods for loading documents from various sources.
 */
export * from './load-parse.js';
export { contains, merge } from './static.js';
export type * from './types.js';
export type { Cheerio, CheerioAPI, CheerioOptions, HTMLParser2Options, } from './slim.js';
import { type SnifferOptions } from 'encoding-sniffer';
import * as undici from 'undici';
import { Writable } from 'node:stream';
import type { CheerioAPI } from './load.js';
import { type CheerioOptions } from './options.js';
/**
 * Sniffs the encoding of a buffer, then creates a querying function bound to a
 * document created from the buffer.
 *
 * @category Loading
 * @example
 *
 * ```js
 * import * as cheerio from 'cheerio';
 *
 * const buffer = fs.readFileSync('index.html');
 * const $ = cheerio.fromBuffer(buffer);
 * ```
 *
 * @param buffer - The buffer to sniff the encoding of.
 * @param options - The options to pass to Cheerio.
 * @returns The loaded document.
 */
export declare function loadBuffer(buffer: Buffer, options?: DecodeStreamOptions): CheerioAPI;
/**
 * Creates a stream that parses a sequence of strings into a document.
 *
 * The stream is a `Writable` stream that accepts strings. When the stream is
 * finished, the callback is called with the loaded document.
 *
 * @category Loading
 * @example
 *
 * ```js
 * import * as cheerio from 'cheerio';
 * import * as fs from 'fs';
 *
 * const writeStream = cheerio.stringStream({}, (err, $) => {
 *   if (err) {
 *     // Handle error
 *   }
 *
 *   console.log($('h1').text());
 *   // Output: Hello, world!
 * });
 *
 * fs.createReadStream('my-document.html', { encoding: 'utf8' }).pipe(
 *   writeStream,
 * );
 * ```
 *
 * @param options - The options to pass to Cheerio.
 * @param cb - The callback to call when the stream is finished.
 * @returns The writable stream.
 */
export declare function stringStream(options: CheerioOptions, cb: (err: Error | null | undefined, $: CheerioAPI) => void): Writable;
export interface DecodeStreamOptions extends CheerioOptions {
    encoding?: SnifferOptions;
}
/**
 * Parses a stream of buffers into a document.
 *
 * The stream is a `Writable` stream that accepts buffers. When the stream is
 * finished, the callback is called with the loaded document.
 *
 * @category Loading
 * @param options - The options to pass to Cheerio.
 * @param cb - The callback to call when the stream is finished.
 * @returns The writable stream.
 */
export declare function decodeStream(options: DecodeStreamOptions, cb: (err: Error | null | undefined, $: CheerioAPI) => void): Writable;
type UndiciStreamOptions = Parameters<typeof undici.stream>[1];
export interface CheerioRequestOptions extends DecodeStreamOptions {
    /** The options passed to `undici`'s `stream` method. */
    requestOptions?: UndiciStreamOptions;
}
/**
 * `fromURL` loads a document from a URL.
 *
 * By default, redirects are allowed and non-2xx responses are rejected.
 *
 * @category Loading
 * @example
 *
 * ```js
 * import * as cheerio from 'cheerio';
 *
 * const $ = await cheerio.fromURL('https://example.com');
 * ```
 *
 * @param url - The URL to load the document from.
 * @param options - The options to pass to Cheerio.
 * @returns The loaded document.
 */
export declare function fromURL(url: string | URL, options?: CheerioRequestOptions): Promise<CheerioAPI>;
//# sourceMappingURL=index.d.ts.map