"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocInlineTagBase = void 0;
const DocNode_1 = require("./DocNode");
const StringChecks_1 = require("../parser/StringChecks");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * The abstract base class for {@link DocInlineTag}, {@link DocLinkTag}, and {@link DocInheritDocTag}.
 */
class DocInlineTagBase extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        StringChecks_1.StringChecks.validateTSDocTagName(parameters.tagName);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._tagNameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_TagName,
                content: parameters.tagNameExcerpt
            });
            if (parameters.spacingAfterTagNameExcerpt) {
                this._spacingAfterTagNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterTagNameExcerpt
                });
            }
            this._closingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        this._tagName = parameters.tagName;
        this._tagNameWithUpperCase = parameters.tagName.toUpperCase();
    }
    /**
     * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
     * by ASCII letters using "camelCase" capitalization.
     *
     * @remarks
     * For example, if the inline tag is `{@link Guid.toString | the toString() method}`
     * then the tag name would be `@link`.
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
    /** @override @sealed */
    onGetChildNodes() {
        return [
            this._openingDelimiterExcerpt,
            this._tagNameExcerpt,
            this._spacingAfterTagNameExcerpt,
            ...this.getChildNodesForContent(),
            this._closingDelimiterExcerpt
        ];
    }
}
exports.DocInlineTagBase = DocInlineTagBase;
//# sourceMappingURL=DocInlineTagBase.js.map