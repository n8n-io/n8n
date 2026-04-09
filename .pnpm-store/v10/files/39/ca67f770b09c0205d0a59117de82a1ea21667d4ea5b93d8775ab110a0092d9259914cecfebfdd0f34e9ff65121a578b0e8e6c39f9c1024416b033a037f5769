// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind } from './DocNode';
import { DocParagraph } from './DocParagraph';
import { DocNodeContainer } from './DocNodeContainer';
/**
 * Represents a general block of rich text.
 */
export class DocSection extends DocNodeContainer {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters, childNodes) {
        super(parameters, childNodes);
    }
    /** @override */
    get kind() {
        return DocNodeKind.Section;
    }
    /**
     * If the last item in DocSection.nodes is not a DocParagraph, a new paragraph
     * is started.  Either way, the provided docNode will be appended to the paragraph.
     */
    appendNodeInParagraph(docNode) {
        let paragraphNode = undefined;
        if (this.nodes.length > 0) {
            const lastNode = this.nodes[this.nodes.length - 1];
            if (lastNode.kind === DocNodeKind.Paragraph) {
                paragraphNode = lastNode;
            }
        }
        if (!paragraphNode) {
            paragraphNode = new DocParagraph({ configuration: this.configuration });
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
//# sourceMappingURL=DocSection.js.map