"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = void 0;
const load_js_1 = require("./load.js");
const parse_js_1 = require("./parse.js");
const parse5_adapter_js_1 = require("./parsers/parse5-adapter.js");
const dom_serializer_1 = __importDefault(require("dom-serializer"));
const htmlparser2_1 = require("htmlparser2");
const parse = (0, parse_js_1.getParse)((content, options, isDocument, context) => options._useHtmlParser2
    ? (0, htmlparser2_1.parseDocument)(content, options)
    : (0, parse5_adapter_js_1.parseWithParse5)(content, options, isDocument, context));
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
exports.load = (0, load_js_1.getLoad)(parse, (dom, options) => options._useHtmlParser2
    ? (0, dom_serializer_1.default)(dom, options)
    : (0, parse5_adapter_js_1.renderWithParse5)(dom));
//# sourceMappingURL=load-parse.js.map