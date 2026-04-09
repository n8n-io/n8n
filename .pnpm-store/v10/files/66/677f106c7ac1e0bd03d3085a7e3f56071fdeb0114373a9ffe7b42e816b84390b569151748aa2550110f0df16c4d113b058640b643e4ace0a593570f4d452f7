"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocHtmlStartTag = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
const StringBuilder_1 = require("../emitters/StringBuilder");
const TSDocEmitter_1 = require("../emitters/TSDocEmitter");
/**
 * Represents an HTML start tag, which may or may not be self-closing.
 *
 * Example: `<a href="#" />`
 */
class DocHtmlStartTag extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlStartTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._nameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlStartTag_Name,
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
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlStartTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            this._name = parameters.name;
            this._spacingAfterName = parameters.spacingAfterName;
        }
        this._htmlAttributes = [];
        if (parameters.htmlAttributes) {
            this._htmlAttributes.push(...parameters.htmlAttributes);
        }
        this._selfClosingTag = !!parameters.selfClosingTag;
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.HtmlStartTag;
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
     * The HTML attributes belonging to this HTML element.
     */
    get htmlAttributes() {
        return this._htmlAttributes;
    }
    /**
     * If true, then the HTML tag ends with `/>` instead of `>`.
     */
    get selfClosingTag() {
        return this._selfClosingTag;
    }
    /**
     * Explicit whitespace that a renderer should insert after the HTML element name.
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterName() {
        if (this._spacingAfterName === undefined) {
            if (this._spacingAfterNameExcerpt !== undefined) {
                this._spacingAfterName = this._spacingAfterNameExcerpt.content.toString();
            }
        }
        return this._spacingAfterName;
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
            ...this._htmlAttributes,
            this._closingDelimiterExcerpt
        ];
    }
}
exports.DocHtmlStartTag = DocHtmlStartTag;
//# sourceMappingURL=DocHtmlStartTag.js.map