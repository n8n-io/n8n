"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWithParse5 = exports.parseWithParse5 = void 0;
var domhandler_1 = require("domhandler");
var parse5_1 = require("parse5");
var parse5_htmlparser2_tree_adapter_1 = require("parse5-htmlparser2-tree-adapter");
/**
 * Parse the content with `parse5` in the context of the given `ParentNode`.
 *
 * @param content - The content to parse.
 * @param options - A set of options to use to parse.
 * @param isDocument - Whether to parse the content as a full HTML document.
 * @param context - The context in which to parse the content.
 * @returns The parsed content.
 */
function parseWithParse5(content, options, isDocument, context) {
    var opts = {
        scriptingEnabled: typeof options.scriptingEnabled === 'boolean'
            ? options.scriptingEnabled
            : true,
        treeAdapter: parse5_htmlparser2_tree_adapter_1.adapter,
        sourceCodeLocationInfo: options.sourceCodeLocationInfo,
    };
    return isDocument
        ? (0, parse5_1.parse)(content, opts)
        : (0, parse5_1.parseFragment)(context, content, opts);
}
exports.parseWithParse5 = parseWithParse5;
var renderOpts = { treeAdapter: parse5_htmlparser2_tree_adapter_1.adapter };
/**
 * Renders the given DOM tree with `parse5` and returns the result as a string.
 *
 * @param dom - The DOM tree to render.
 * @returns The rendered document.
 */
function renderWithParse5(dom) {
    var _a;
    /*
     * `dom-serializer` passes over the special "root" node and renders the
     * node's children in its place. To mimic this behavior with `parse5`, an
     * equivalent operation must be applied to the input array.
     */
    var nodes = 'length' in dom ? dom : [dom];
    for (var index = 0; index < nodes.length; index += 1) {
        var node = nodes[index];
        if ((0, domhandler_1.isDocument)(node)) {
            (_a = Array.prototype.splice).call.apply(_a, __spreadArray([nodes, index, 1], node.children, false));
        }
    }
    var result = '';
    for (var index = 0; index < nodes.length; index += 1) {
        var node = nodes[index];
        result += (0, parse5_1.serializeOuter)(node, renderOpts);
    }
    return result;
}
exports.renderWithParse5 = renderWithParse5;
//# sourceMappingURL=parse5-adapter.js.map