// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { StringChecks } from '../parser/StringChecks';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents a TSDoc block tag such as `@param` or `@public`.
 */
export class DocBlockTag extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        StringChecks.validateTSDocTagName(parameters.tagName);
        this._tagName = parameters.tagName;
        this._tagNameWithUpperCase = parameters.tagName.toUpperCase();
        if (DocNode.isParsedParameters(parameters)) {
            this._tagNameExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.BlockTag,
                content: parameters.tagNameExcerpt
            });
        }
    }
    /** @override */
    get kind() {
        return DocNodeKind.BlockTag;
    }
    /**
     * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
     * by ASCII letters using "camelCase" capitalization.
     */
    get tagName() {
        return this._tagName;
    }
    /**
     * The TSDoc tag name in all capitals, which is used for performing
     * case-insensitive comparisons or lookups.
     */
    get tagNameWithUpperCase() {
        return this._tagNameWithUpperCase;
    }
    /** @override */
    onGetChildNodes() {
        return [this._tagNameExcerpt];
    }
    getTokenSequence() {
        if (!this._tagNameExcerpt) {
            throw new Error('DocBlockTag.getTokenSequence() failed because this object did not originate from a parsed input');
        }
        return this._tagNameExcerpt.content;
    }
}
//# sourceMappingURL=DocBlockTag.js.map