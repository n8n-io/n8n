// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocSection } from './DocSection';
/**
 * Represents a section that is introduced by a TSDoc block tag.
 * For example, an `@example` block.
 */
export class DocBlock extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._blockTag = parameters.blockTag;
        this._content = new DocSection({ configuration: this.configuration });
    }
    /** @override */
    get kind() {
        return DocNodeKind.Block;
    }
    /**
     * The TSDoc tag that introduces this section.
     */
    get blockTag() {
        return this._blockTag;
    }
    /**
     * The TSDoc tag that introduces this section.
     */
    get content() {
        return this._content;
    }
    /** @override */
    onGetChildNodes() {
        return [this.blockTag, this._content];
    }
}
//# sourceMappingURL=DocBlock.js.map