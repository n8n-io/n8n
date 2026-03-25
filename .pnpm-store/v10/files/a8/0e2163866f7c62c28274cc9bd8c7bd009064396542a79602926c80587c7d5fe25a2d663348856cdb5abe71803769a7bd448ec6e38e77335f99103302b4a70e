/**
 * @file Alternative entry point for Cheerio that always uses htmlparser2. This
 *   way, parse5 won't be loaded, saving some memory.
 */
import { type CheerioAPI } from './load.js';
import { type CheerioOptions } from './options.js';
import type { AnyNode } from 'domhandler';
export { contains, merge } from './static.js';
export type * from './types.js';
export type { Cheerio } from './cheerio.js';
export type { CheerioOptions, HTMLParser2Options } from './options.js';
export type { CheerioAPI } from './load.js';
/**
 * Create a querying function, bound to a document created from the provided
 * markup.
 *
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Always `false` here, as we are always using
 *   `htmlparser2`.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
export declare const load: (content: string | AnyNode | AnyNode[] | Buffer, options?: CheerioOptions | null, isDocument?: boolean) => CheerioAPI;
//# sourceMappingURL=slim.d.ts.map