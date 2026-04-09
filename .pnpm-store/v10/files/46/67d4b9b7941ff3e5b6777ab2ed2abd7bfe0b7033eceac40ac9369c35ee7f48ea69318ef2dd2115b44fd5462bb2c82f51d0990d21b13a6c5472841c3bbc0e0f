// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNode } from './DocNode';
import { StringChecks } from '../parser/StringChecks';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * The abstract base class for {@link DocInlineTag}, {@link DocLinkTag}, and {@link DocInheritDocTag}.
 */
export class DocInlineTagBase extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        StringChecks.validateTSDocTagName(parameters.tagName);
        if (DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.InlineTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._tagNameExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.InlineTag_TagName,
                content: parameters.tagNameExcerpt
            });
            if (parameters.spacingAfterTagNameExcerpt) {
                this._spacingAfterTagNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterTagNameExcerpt
                });
            }
            this._closingDelimiterExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.InlineTag_ClosingDelimiter,
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
//# sourceMappingURL=DocInlineTagBase.js.map