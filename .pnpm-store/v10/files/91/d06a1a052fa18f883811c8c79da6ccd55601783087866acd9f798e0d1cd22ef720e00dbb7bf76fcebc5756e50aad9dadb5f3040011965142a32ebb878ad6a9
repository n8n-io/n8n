"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.root = exports.parseHTML = exports.merge = exports.contains = exports.text = exports.xml = exports.html = exports.load = void 0;
/**
 * Types used in signatures of Cheerio methods.
 *
 * @category Cheerio
 */
__exportStar(require("./types.js"), exports);
var load_js_1 = require("./load.js");
var parse_js_1 = require("./parse.js");
var parse5_adapter_js_1 = require("./parsers/parse5-adapter.js");
var dom_serializer_1 = __importDefault(require("dom-serializer"));
var htmlparser2_1 = require("htmlparser2");
var parse = (0, parse_js_1.getParse)(function (content, options, isDocument, context) {
    return options.xmlMode || options._useHtmlParser2
        ? (0, htmlparser2_1.parseDocument)(content, options)
        : (0, parse5_adapter_js_1.parseWithParse5)(content, options, isDocument, context);
});
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
exports.load = (0, load_js_1.getLoad)(parse, function (dom, options) {
    return options.xmlMode || options._useHtmlParser2
        ? (0, dom_serializer_1.default)(dom, options)
        : (0, parse5_adapter_js_1.renderWithParse5)(dom);
});
/**
 * The default cheerio instance.
 *
 * @deprecated Use the function returned by `load` instead.
 */
exports.default = (0, exports.load)([]);
var static_js_1 = require("./static.js");
Object.defineProperty(exports, "html", { enumerable: true, get: function () { return static_js_1.html; } });
Object.defineProperty(exports, "xml", { enumerable: true, get: function () { return static_js_1.xml; } });
Object.defineProperty(exports, "text", { enumerable: true, get: function () { return static_js_1.text; } });
var staticMethods = __importStar(require("./static.js"));
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
exports.contains = staticMethods.contains;
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
exports.merge = staticMethods.merge;
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
exports.parseHTML = staticMethods.parseHTML;
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
exports.root = staticMethods.root;
//# sourceMappingURL=index.js.map