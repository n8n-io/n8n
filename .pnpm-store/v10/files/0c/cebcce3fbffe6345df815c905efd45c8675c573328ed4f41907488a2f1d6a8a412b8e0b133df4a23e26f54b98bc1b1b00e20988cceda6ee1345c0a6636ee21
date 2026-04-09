// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind } from './DocNode';
import { DocInlineTagBase } from './DocInlineTagBase';
/**
 * Represents an `{@inheritDoc}` tag.
 */
export class DocInheritDocTag extends DocInlineTagBase {
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
        return DocNodeKind.InheritDocTag;
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
//# sourceMappingURL=DocInheritDocTag.js.map