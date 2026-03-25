/**
 * Types used in signatures of Cheerio methods.
 *
 * @category Cheerio
 */
export * from './types.js';
import { getLoad } from './load.js';
import { getParse } from './parse.js';
import { renderWithParse5, parseWithParse5 } from './parsers/parse5-adapter.js';
import renderWithHtmlparser2 from 'dom-serializer';
import { parseDocument as parseWithHtmlparser2 } from 'htmlparser2';
const parse = getParse((content, options, isDocument, context) => options.xmlMode || options._useHtmlParser2
    ? parseWithHtmlparser2(content, options)
    : parseWithParse5(content, options, isDocument, context));
// Duplicate docs due to https://github.com/TypeStrong/typedoc/issues/1616
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
export const load = getLoad(parse, (dom, options) => options.xmlMode || options._useHtmlParser2
    ? renderWithHtmlparser2(dom, options)
    : renderWithParse5(dom));
/**
 * The default cheerio instance.
 *
 * @deprecated Use the function returned by `load` instead.
 */
export default load([]);
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
export const { contains } = staticMethods;
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
export const { merge } = staticMethods;
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
export const { parseHTML } = staticMethods;
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
export const { root } = staticMethods;
//# sourceMappingURL=index.js.map