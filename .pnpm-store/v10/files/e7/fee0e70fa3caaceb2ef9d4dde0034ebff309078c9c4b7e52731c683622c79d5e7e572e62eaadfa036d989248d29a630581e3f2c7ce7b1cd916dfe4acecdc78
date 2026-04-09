"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocBlockTag = void 0;
const DocNode_1 = require("./DocNode");
const StringChecks_1 = require("../parser/StringChecks");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents a TSDoc block tag such as `@param` or `@public`.
 */
class DocBlockTag extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        StringChecks_1.StringChecks.validateTSDocTagName(parameters.tagName);
        this._tagName = parameters.tagName;
        this._tagNameWithUpperCase = parameters.tagName.toUpperCase();
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._tagNameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.BlockTag,
                content: parameters.tagNameExcerpt
            });
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.BlockTag;
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
exports.DocBlockTag = DocBlockTag;
//# sourceMappingURL=DocBlockTag.js.map