import { isDocument, } from 'domhandler';
import { parse as parseDocument, parseFragment, serializeOuter } from 'parse5';
import { adapter as htmlparser2Adapter } from 'parse5-htmlparser2-tree-adapter';
/**
 * Parse the content with `parse5` in the context of the given `ParentNode`.
 *
 * @param content - The content to parse.
 * @param options - A set of options to use to parse.
 * @param isDocument - Whether to parse the content as a full HTML document.
 * @param context - The context in which to parse the content.
 * @returns The parsed content.
 */
export function parseWithParse5(content, options, isDocument, context) {
    var _a;
    (_a = options.treeAdapter) !== null && _a !== void 0 ? _a : (options.treeAdapter = htmlparser2Adapter);
    if (options.scriptingEnabled !== false) {
        options.scriptingEnabled = true;
    }
    return isDocument
        ? parseDocument(content, options)
        : parseFragment(context, content, options);
}
const renderOpts = { treeAdapter: htmlparser2Adapter };
/**
 * Renders the given DOM tree with `parse5` and returns the result as a string.
 *
 * @param dom - The DOM tree to render.
 * @returns The rendered document.
 */
export function renderWithParse5(dom) {
    /*
     * `dom-serializer` passes over the special "root" node and renders the
     * node's children in its place. To mimic this behavior with `parse5`, an
     * equivalent operation must be applied to the input array.
     */
    const nodes = 'length' in dom ? dom : [dom];
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (isDocument(node)) {
            Array.prototype.splice.call(nodes, index, 1, ...node.children);
        }
    }
    let result = '';
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        result += serializeOuter(node, renderOpts);
    }
    return result;
}
//# sourceMappingURL=parse5-adapter.js.map