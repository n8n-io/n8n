"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocHtmlEndTag = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
const StringBuilder_1 = require("../emitters/StringBuilder");
const TSDocEmitter_1 = require("../emitters/TSDocEmitter");
/**
 * Represents an HTML end tag.  Example: `</a>`
 */
class DocHtmlEndTag extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlEndTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._nameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlEndTag_Name,
                content: parameters.nameExcerpt
            });
            if (parameters.spacingAfterNameExcerpt) {
                this._spacingAfterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterNameExcerpt
                });
            }
            this._closingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlEndTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            this._name = parameters.name;
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.HtmlEndTag;
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
        const stringBuilder = new StringBuilder_1.StringBuilder();
        const emitter = new TSDocEmitter_1.TSDocEmitter();
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
exports.DocHtmlEndTag = DocHtmlEndTag;
//# sourceMappingURL=DocHtmlEndTag.js.map