"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocBlock = void 0;
const DocNode_1 = require("./DocNode");
const DocSection_1 = require("./DocSection");
/**
 * Represents a section that is introduced by a TSDoc block tag.
 * For example, an `@example` block.
 */
class DocBlock extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._blockTag = parameters.blockTag;
        this._content = new DocSection_1.DocSection({ configuration: this.configuration });
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.Block;
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
exports.DocBlock = DocBlock;
//# sourceMappingURL=DocBlock.js.map