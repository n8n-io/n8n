"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocSection = void 0;
const DocNode_1 = require("./DocNode");
const DocParagraph_1 = require("./DocParagraph");
const DocNodeContainer_1 = require("./DocNodeContainer");
/**
 * Represents a general block of rich text.
 */
class DocSection extends DocNodeContainer_1.DocNodeContainer {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters, childNodes) {
        super(parameters, childNodes);
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.Section;
    }
    /**
     * If the last item in DocSection.nodes is not a DocParagraph, a new paragraph
     * is started.  Either way, the provided docNode will be appended to the paragraph.
     */
    appendNodeInParagraph(docNode) {
        let paragraphNode = undefined;
        if (this.nodes.length > 0) {
            const lastNode = this.nodes[this.nodes.length - 1];
            if (lastNode.kind === DocNode_1.DocNodeKind.Paragraph) {
                paragraphNode = lastNode;
            }
        }
        if (!paragraphNode) {
            paragraphNode = new DocParagraph_1.DocParagraph({ configuration: this.configuration });
            this.appendNode(paragraphNode);
        }
        paragraphNode.appendNode(docNode);
    }
    appendNodesInParagraph(docNodes) {
        for (const docNode of docNodes) {
            this.appendNodeInParagraph(docNode);
        }
    }
}
exports.DocSection = DocSection;
//# sourceMappingURL=DocSection.js.map