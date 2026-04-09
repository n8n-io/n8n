"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocInheritDocTag = void 0;
const DocNode_1 = require("./DocNode");
const DocInlineTagBase_1 = require("./DocInlineTagBase");
/**
 * Represents an `{@inheritDoc}` tag.
 */
class DocInheritDocTag extends DocInlineTagBase_1.DocInlineTagBase {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (this.tagNameWithUpperCase !== '@INHERITDOC') {
            throw new Error('DocInheritDocTag requires the tag name to be "{@inheritDoc}"');
        }
        this._declarationReference = parameters.declarationReference;
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.InheritDocTag;
    }
    /**
     * The declaration that the documentation will be inherited from.
     * If omitted, the documentation will be inherited from the parent class.
     */
    get declarationReference() {
        return this._declarationReference;
    }
    /** @override */
    getChildNodesForContent() {
        // abstract
        return [this._declarationReference];
    }
}
exports.DocInheritDocTag = DocInheritDocTag;
//# sourceMappingURL=DocInheritDocTag.js.map