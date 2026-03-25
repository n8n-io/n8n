/// <reference types="node" />
/**
 * The main types of Cheerio objects.
 *
 * @category Cheerio
 */
export type { Cheerio } from './cheerio.js';
/**
 * Types used in signatures of Cheerio methods.
 *
 * @category Cheerio
 */
export * from './types.js';
export type { CheerioOptions, HTMLParser2Options, Parse5Options, } from './options.js';
/**
 * Re-exporting all of the node types.
 *
 * @category DOM Node
 */
export type { Node, AnyNode, ParentNode, Element, Document } from 'domhandler';
export type { CheerioAPI } from './load.js';
/**
 * Create a querying function, bound to a document created from the provided markup.
 *
 * Note that similar to web browser contexts, this operation may introduce
 * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
 * switch to fragment mode and disable this.
 *
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Allows parser to be switched to fragment mode.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
export declare const load: (content: string | import("domhandler").AnyNode | import("domhandler").AnyNode[] | Buffer, options?: import("./options.js").CheerioOptions | null | undefined, isDocument?: boolean) => import("./load.js").CheerioAPI;
/**
 * The default cheerio instance.
 *
 * @deprecated Use the function returned by `load` instead.
 */
declare const _default: import("./load.js").CheerioAPI;
export default _default;
export { html, xml, text } from './static.js';
import * as staticMethods from './static.js';
/**
 * In order to promote consistency with the jQuery library, users are encouraged
 * to instead use the static method of the same name.
 *
 * @deprecated
 * @example
 *
 * ```js
 * const $ = cheerio.load('<div><p></p></div>');
 *
 * $.contains($('div').get(0), $('p').get(0));
 * //=> true
 *
 * $.contains($('p').get(0), $('div').get(0));
 * //=> false
 * ```
 *
 * @returns {boolean}
 */
export declare const contains: typeof staticMethods.contains;
/**
 * In order to promote consistency with the jQuery library, users are encouraged
 * to instead use the static method of the same name.
 *
 * @deprecated
 * @example
 *
 * ```js
 * const $ = cheerio.load('');
 *
 * $.merge([1, 2], [3, 4]);
 * //=> [1, 2, 3, 4]
 * ```
 */
export declare const merge: typeof staticMethods.merge;
/**
 * In order to promote consistency with the jQuery library, users are encouraged
 * to instead use the static method of the same name as it is defined on the
 * "loaded" Cheerio factory function.
 *
 * @deprecated See {@link static/parseHTML}.
 * @example
 *
 * ```js
 * const $ = cheerio.load('');
 * $.parseHTML('<b>markup</b>');
 * ```
 */
export declare const parseHTML: typeof staticMethods.parseHTML;
/**
 * Users seeking to access the top-level element of a parsed document should
 * instead use the `root` static method of a "loaded" Cheerio function.
 *
 * @deprecated
 * @example
 *
 * ```js
 * const $ = cheerio.load('');
 * $.root();
 * ```
 */
export declare const root: typeof staticMethods.root;
//# sourceMappingURL=index.d.ts.map