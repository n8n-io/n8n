// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind } from './DocNode';
import { DocNodeContainer } from './DocNodeContainer';
/**
 * Represents a paragraph of text, similar to a `<p>` element in HTML.
 * Like CommonMark, the TSDoc syntax uses blank lines to delineate paragraphs
 * instead of explicitly notating them.
 */
export class DocParagraph extends DocNodeContainer {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters, childNodes) {
        super(parameters, childNodes);
    }
    /** @override */
    get kind() {
        return DocNodeKind.Paragraph;
    }
}
//# sourceMappingURL=DocParagraph.js.map