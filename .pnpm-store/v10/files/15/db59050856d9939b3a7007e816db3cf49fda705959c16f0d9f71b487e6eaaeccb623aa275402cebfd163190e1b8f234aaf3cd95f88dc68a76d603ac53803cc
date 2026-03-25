"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParse = getParse;
exports.update = update;
const domutils_1 = require("domutils");
const domhandler_1 = require("domhandler");
/**
 * Get the parse function with options.
 *
 * @param parser - The parser function.
 * @returns The parse function with options.
 */
function getParse(parser) {
    /**
     * Parse a HTML string or a node.
     *
     * @param content - The HTML string or node.
     * @param options - The parser options.
     * @param isDocument - If `content` is a document.
     * @param context - The context node in the DOM tree.
     * @returns The parsed document node.
     */
    return function parse(content, options, isDocument, context) {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
            content = content.toString();
        }
        if (typeof content === 'string') {
            return parser(content, options, isDocument, context);
        }
        const doc = content;
        if (!Array.isArray(doc) && (0, domhandler_1.isDocument)(doc)) {
            // If `doc` is already a root, just return it
            return doc;
        }
        // Add conent to new root element
        const root = new domhandler_1.Document([]);
        // Update the DOM using the root
        update(doc, root);
        return root;
    };
}
/**
 * Update the dom structure, for one changed layer.
 *
 * @param newChilds - The new children.
 * @param parent - The new parent.
 * @returns The parent node.
 */
function update(newChilds, parent) {
    // Normalize
    const arr = Array.isArray(newChilds) ? newChilds : [newChilds];
    // Update parent
    if (parent) {
        parent.children = arr;
    }
    else {
        parent = null;
    }
    // Update neighbors
    for (let i = 0; i < arr.length; i++) {
        const node = arr[i];
        // Cleanly remove existing nodes from their previous structures.
        if (node.parent && node.parent.children !== arr) {
            (0, domutils_1.removeElement)(node);
        }
        if (parent) {
            node.prev = arr[i - 1] || null;
            node.next = arr[i + 1] || null;
        }
        else {
            node.prev = node.next = null;
        }
        node.parent = parent;
    }
    return parent;
}
//# sourceMappingURL=parse.js.map