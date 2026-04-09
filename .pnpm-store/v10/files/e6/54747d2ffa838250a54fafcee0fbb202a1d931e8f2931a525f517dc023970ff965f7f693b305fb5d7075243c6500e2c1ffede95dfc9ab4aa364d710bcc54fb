"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocNodeContainer = void 0;
const DocNode_1 = require("./DocNode");
/**
 * DocNodeContainer is the base class for DocNode classes that allow arbitrary child nodes to be added by the consumer.
 * The child classes are {@link DocParagraph} and {@link DocSection}.
 */
class DocNodeContainer extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters, childNodes) {
        super(parameters);
        this._nodes = [];
        if (childNodes !== undefined && childNodes.length > 0) {
            this.appendNodes(childNodes);
        }
    }
    /**
     * The nodes that were added to this container.
     */
    get nodes() {
        return this._nodes;
    }
    /**
     * Append a node to the container.
     */
    appendNode(docNode) {
        if (!this.configuration.docNodeManager.isAllowedChild(this.kind, docNode.kind)) {
            throw new Error(`The TSDocConfiguration does not allow a ${this.kind} node to` +
                ` contain a node of type ${docNode.kind}`);
        }
        this._nodes.push(docNode);
    }
    /**
     * Append nodes to the container.
     */
    appendNodes(docNodes) {
        for (const docNode of docNodes) {
            this.appendNode(docNode);
        }
    }
    /**
     * Remove all nodes from the container.
     */
    clearNodes() {
        this._nodes.length = 0;
    }
    /** @override */
    onGetChildNodes() {
        return this._nodes;
    }
}
exports.DocNodeContainer = DocNodeContainer;
//# sourceMappingURL=DocNodeContainer.js.map