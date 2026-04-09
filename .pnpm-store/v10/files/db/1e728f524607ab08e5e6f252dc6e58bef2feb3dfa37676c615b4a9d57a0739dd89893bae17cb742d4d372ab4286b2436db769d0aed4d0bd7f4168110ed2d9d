"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocParagraph = void 0;
const DocNode_1 = require("./DocNode");
const DocNodeContainer_1 = require("./DocNodeContainer");
/**
 * Represents a paragraph of text, similar to a `<p>` element in HTML.
 * Like CommonMark, the TSDoc syntax uses blank lines to delineate paragraphs
 * instead of explicitly notating them.
 */
class DocParagraph extends DocNodeContainer_1.DocNodeContainer {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters, childNodes) {
        super(parameters, childNodes);
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.Paragraph;
    }
}
exports.DocParagraph = DocParagraph;
//# sourceMappingURL=DocParagraph.js.map