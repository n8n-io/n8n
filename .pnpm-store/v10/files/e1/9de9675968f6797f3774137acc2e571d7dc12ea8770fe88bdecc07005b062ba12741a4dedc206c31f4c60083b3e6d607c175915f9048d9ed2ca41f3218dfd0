// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNode, DocNodeKind } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
import { StringBuilder } from '../emitters/StringBuilder';
import { TSDocEmitter } from '../emitters/TSDocEmitter';
/**
 * Represents an HTML end tag.  Example: `</a>`
 */
export class DocHtmlEndTag extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.HtmlEndTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._nameExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.HtmlEndTag_Name,
                content: parameters.nameExcerpt
            });
            if (parameters.spacingAfterNameExcerpt) {
                this._spacingAfterNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterNameExcerpt
                });
            }
            this._closingDelimiterExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.HtmlEndTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            this._name = parameters.name;
        }
    }
    /** @override */
    get kind() {
        return DocNodeKind.HtmlEndTag;
    }
    /**
     * The HTML element name.
     */
    get name() {
        if (this._name === undefined) {
            this._name = this._nameExcerpt.content.toString();
        }
        return this._name;
    }
    /**
     * Generates the HTML for this tag.
     */
    emitAsHtml() {
        // NOTE: Here we're assuming that the TSDoc representation for a tag is also a valid HTML expression.
        const stringBuilder = new StringBuilder();
        const emitter = new TSDocEmitter();
        emitter.renderHtmlTag(stringBuilder, this);
        return stringBuilder.toString();
    }
    /** @override */
    onGetChildNodes() {
        return [
            this._openingDelimiterExcerpt,
            this._nameExcerpt,
            this._spacingAfterNameExcerpt,
            this._closingDelimiterExcerpt
        ];
    }
}
//# sourceMappingURL=DocHtmlEndTag.js.map