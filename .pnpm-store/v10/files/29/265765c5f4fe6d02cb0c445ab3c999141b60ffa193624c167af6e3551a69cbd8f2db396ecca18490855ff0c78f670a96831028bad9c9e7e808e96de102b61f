// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocBlock } from './DocBlock';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents a parsed `@param` or `@typeParam` block, which provides a description for a
 * function parameter.
 */
export class DocParamBlock extends DocBlock {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._parameterName = parameters.parameterName;
        if (DocNode.isParsedParameters(parameters)) {
            if (parameters.spacingBeforeParameterNameExcerpt) {
                this._spacingBeforeParameterNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingBeforeParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeBeforeParameterNameExcerpt) {
                this._unsupportedJsdocTypeBeforeParameterNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeBeforeParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocOptionalNameOpenBracketExcerpt) {
                this._unsupportedJsdocOptionalNameOpenBracketExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocOptionalNameOpenBracketExcerpt
                });
            }
            this._parameterNameExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.ParamBlock_ParameterName,
                content: parameters.parameterNameExcerpt
            });
            if (parameters.unsupportedJsdocOptionalNameRestExcerpt) {
                this._unsupportedJsdocOptionalNameRestExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocOptionalNameRestExcerpt
                });
            }
            if (parameters.spacingAfterParameterNameExcerpt) {
                this._spacingAfterParameterNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeAfterParameterNameExcerpt) {
                this._unsupportedJsdocTypeAfterParameterNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeAfterParameterNameExcerpt
                });
            }
            if (parameters.hyphenExcerpt) {
                this._hyphenExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.ParamBlock_Hyphen,
                    content: parameters.hyphenExcerpt
                });
            }
            if (parameters.spacingAfterHyphenExcerpt) {
                this._spacingAfterHyphenExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterHyphenExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeAfterHyphenExcerpt) {
                this._unsupportedJsdocTypeAfterHyphenExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeAfterHyphenExcerpt
                });
            }
        }
    }
    /** @override */
    get kind() {
        return DocNodeKind.ParamBlock;
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
//# sourceMappingURL=DocParamBlock.js.map