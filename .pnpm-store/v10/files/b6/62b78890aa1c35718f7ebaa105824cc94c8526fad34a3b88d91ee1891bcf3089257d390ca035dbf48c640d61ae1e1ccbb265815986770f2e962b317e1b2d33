"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFragment = exports.parse = exports.TokenizerMode = exports.Tokenizer = exports.Token = exports.html = exports.foreignContent = exports.ErrorCodes = exports.serializeOuter = exports.serialize = exports.Parser = exports.defaultTreeAdapter = void 0;
const index_js_1 = require("./parser/index.js");
var default_js_1 = require("./tree-adapters/default.js");
Object.defineProperty(exports, "defaultTreeAdapter", { enumerable: true, get: function () { return default_js_1.defaultTreeAdapter; } });
var index_js_2 = require("./parser/index.js");
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return index_js_2.Parser; } });
var index_js_3 = require("./serializer/index.js");
Object.defineProperty(exports, "serialize", { enumerable: true, get: function () { return index_js_3.serialize; } });
Object.defineProperty(exports, "serializeOuter", { enumerable: true, get: function () { return index_js_3.serializeOuter; } });
var error_codes_js_1 = require("./common/error-codes.js");
Object.defineProperty(exports, "ErrorCodes", { enumerable: true, get: function () { return error_codes_js_1.ERR; } });
/** @internal */
exports.foreignContent = require("./common/foreign-content.js");
/** @internal */
exports.html = require("./common/html.js");
/** @internal */
exports.Token = require("./common/token.js");
/** @internal */
var index_js_4 = require("./tokenizer/index.js");
Object.defineProperty(exports, "Tokenizer", { enumerable: true, get: function () { return index_js_4.Tokenizer; } });
Object.defineProperty(exports, "TokenizerMode", { enumerable: true, get: function () { return index_js_4.TokenizerMode; } });
// Shorthands
/**
 * Parses an HTML string.
 *
 * @param html Input HTML string.
 * @param options Parsing options.
 * @returns Document
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * console.log(document.childNodes[1].tagName); //> 'html'
 *```
 */
function parse(html, options) {
    return index_js_1.Parser.parse(html, options);
}
exports.parse = parse;
function parseFragment(fragmentContext, html, options) {
    if (typeof fragmentContext === 'string') {
        options = html;
        html = fragmentContext;
        fragmentContext = null;
    }
    const parser = index_js_1.Parser.getFragmentParser(fragmentContext, options);
    parser.tokenizer.write(html, true);
    return parser.getFragment();
}
exports.parseFragment = parseFragment;
//# sourceMappingURL=index.js.map