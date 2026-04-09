"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocParamBlock = void 0;
const DocNode_1 = require("./DocNode");
const DocBlock_1 = require("./DocBlock");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents a parsed `@param` or `@typeParam` block, which provides a description for a
 * function parameter.
 */
class DocParamBlock extends DocBlock_1.DocBlock {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._parameterName = parameters.parameterName;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            if (parameters.spacingBeforeParameterNameExcerpt) {
                this._spacingBeforeParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingBeforeParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeBeforeParameterNameExcerpt) {
                this._unsupportedJsdocTypeBeforeParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeBeforeParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocOptionalNameOpenBracketExcerpt) {
                this._unsupportedJsdocOptionalNameOpenBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocOptionalNameOpenBracketExcerpt
                });
            }
            this._parameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.ParamBlock_ParameterName,
                content: parameters.parameterNameExcerpt
            });
            if (parameters.unsupportedJsdocOptionalNameRestExcerpt) {
                this._unsupportedJsdocOptionalNameRestExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocOptionalNameRestExcerpt
                });
            }
            if (parameters.spacingAfterParameterNameExcerpt) {
                this._spacingAfterParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeAfterParameterNameExcerpt) {
                this._unsupportedJsdocTypeAfterParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeAfterParameterNameExcerpt
                });
            }
            if (parameters.hyphenExcerpt) {
                this._hyphenExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.ParamBlock_Hyphen,
                    content: parameters.hyphenExcerpt
                });
            }
            if (parameters.spacingAfterHyphenExcerpt) {
                this._spacingAfterHyphenExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterHyphenExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeAfterHyphenExcerpt) {
                this._unsupportedJsdocTypeAfterHyphenExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeAfterHyphenExcerpt
                });
            }
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.ParamBlock;
    }
    /**
     * The name of the parameter that is being documented.
     * For example "width" in `@param width - the width of the object`.
     */
    get parameterName() {
        return this._parameterName;
    }
    /** @override */
    onGetChildNodes() {
        return [
            this.blockTag,
            this._spacingBeforeParameterNameExcerpt,
            this._unsupportedJsdocTypeBeforeParameterNameExcerpt,
            this._unsupportedJsdocOptionalNameOpenBracketExcerpt,
            this._parameterNameExcerpt,
            this._unsupportedJsdocOptionalNameRestExcerpt,
            this._spacingAfterParameterNameExcerpt,
            this._unsupportedJsdocTypeAfterParameterNameExcerpt,
            this._hyphenExcerpt,
            this._spacingAfterHyphenExcerpt,
            this._unsupportedJsdocTypeAfterHyphenExcerpt,
            this.content
        ];
    }
}
exports.DocParamBlock = DocParamBlock;
//# sourceMappingURL=DocParamBlock.js.map