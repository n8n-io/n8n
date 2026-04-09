"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocHtmlAttribute = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents an HTML attribute inside a DocHtmlStartTag or DocHtmlEndTag.
 *
 * Example: `href="#"` inside `<a href="#" />`
 */
class DocHtmlAttribute extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._nameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlAttribute_Name,
                content: parameters.nameExcerpt
            });
            if (parameters.spacingAfterNameExcerpt) {
                this._spacingAfterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterNameExcerpt
                });
            }
            this._equalsExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlAttribute_Equals,
                content: parameters.equalsExcerpt
            });
            if (parameters.spacingAfterEqualsExcerpt) {
                this._spacingAfterEqualsExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterEqualsExcerpt
                });
            }
            this._valueExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlAttribute_Value,
                content: parameters.valueExcerpt
            });
            if (parameters.spacingAfterValueExcerpt) {
                this._spacingAfterValueExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterValueExcerpt
                });
            }
        }
        else {
            this._name = parameters.name;
            this._spacingAfterName = parameters.spacingAfterName;
            this._spacingAfterEquals = parameters.spacingAfterEquals;
            this._value = parameters.value;
            this._spacingAfterValue = parameters.spacingAfterValue;
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.HtmlAttribute;
    }
    /**
     * The HTML attribute name.
     */
    get name() {
        if (this._name === undefined) {
            this._name = this._nameExcerpt.content.toString();
        }
        return this._name;
    }
    /**
     * Explicit whitespace that a renderer should insert after the HTML attribute name.
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
     * Explicit whitespace that a renderer should insert after the "=".
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterEquals() {
        if (this._spacingAfterEquals === undefined) {
            if (this._spacingAfterEqualsExcerpt !== undefined) {
                this._spacingAfterEquals = this._spacingAfterEqualsExcerpt.content.toString();
            }
        }
        return this._spacingAfterEquals;
    }
    /**
     * The HTML attribute value.
     */
    get value() {
        if (this._value === undefined) {
            this._value = this._valueExcerpt.content.toString();
        }
        return this._value;
    }
    /**
     * Explicit whitespace that a renderer should insert after the HTML attribute name.
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterValue() {
        if (this._spacingAfterValue === undefined) {
            if (this._spacingAfterValueExcerpt !== undefined) {
                this._spacingAfterValue = this._spacingAfterValueExcerpt.content.toString();
            }
        }
        return this._spacingAfterValue;
    }
    /** @override */
    onGetChildNodes() {
        return [
            this._nameExcerpt,
            this._spacingAfterNameExcerpt,
            this._equalsExcerpt,
            this._spacingAfterEqualsExcerpt,
            this._valueExcerpt,
            this._spacingAfterValueExcerpt
        ];
    }
}
exports.DocHtmlAttribute = DocHtmlAttribute;
//# sourceMappingURL=DocHtmlAttribute.js.map