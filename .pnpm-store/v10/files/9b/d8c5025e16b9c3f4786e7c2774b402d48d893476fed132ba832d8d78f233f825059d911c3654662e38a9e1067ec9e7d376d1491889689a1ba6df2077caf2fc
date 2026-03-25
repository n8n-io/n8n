import { getLoad } from './load.js';
import { getParse } from './parse.js';
import { renderWithParse5, parseWithParse5 } from './parsers/parse5-adapter.js';
import renderWithHtmlparser2 from 'dom-serializer';
import { parseDocument as parseWithHtmlparser2 } from 'htmlparser2';
const parse = getParse((content, options, isDocument, context) => options._useHtmlParser2
    ? parseWithHtmlparser2(content, options)
    : parseWithParse5(content, options, isDocument, context));
// Duplicate docs due to https://github.com/TypeStrong/typedoc/issues/1616
/**
 * Create a querying function, bound to a document created from the provided
 * markup.
 *
 * Note that similar to web browser contexts, this operation may introduce
 * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
 * switch to fragment mode and disable this.
 *
 * @category Loading
 * @param content - Markup to be loaded.
 * @param options - Options for the created instance.
 * @param isDocument - Allows parser to be switched to fragment mode.
 * @returns The loaded document.
 * @see {@link https://cheerio.js.org#loading} for additional usage information.
 */
export const load = getLoad(parse, (dom, options) => options._useHtmlParser2
    ? renderWithHtmlparser2(dom, options)
    : renderWithParse5(dom));
//# sourceMappingURL=load-parse.js.map