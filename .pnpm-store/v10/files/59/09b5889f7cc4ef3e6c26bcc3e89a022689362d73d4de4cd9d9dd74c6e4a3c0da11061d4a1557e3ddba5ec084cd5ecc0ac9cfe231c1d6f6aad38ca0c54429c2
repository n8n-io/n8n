"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocFencedCode = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents CommonMark-style code fence, i.e. a block of program code that
 * starts and ends with a line comprised of three backticks.  The opening delimiter
 * can also specify a language for a syntax highlighter.
 */
class DocFencedCode extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._openingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_OpeningFence,
                content: parameters.openingFenceExcerpt
            });
            if (parameters.spacingAfterOpeningFenceExcerpt) {
                this._spacingAfterOpeningFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterOpeningFenceExcerpt
                });
            }
            if (parameters.languageExcerpt) {
                this._languageExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_Language,
                    content: parameters.languageExcerpt
                });
            }
            if (parameters.spacingAfterLanguageExcerpt) {
                this._spacingAfterLanguageExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterLanguageExcerpt
                });
            }
            this._codeExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_Code,
                content: parameters.codeExcerpt
            });
            if (parameters.spacingBeforeClosingFenceExcerpt) {
                this._spacingBeforeClosingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingBeforeClosingFenceExcerpt
                });
            }
            this._closingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_ClosingFence,
                content: parameters.closingFenceExcerpt
            });
            if (parameters.spacingAfterClosingFenceExcerpt) {
                this._spacingAfterClosingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterClosingFenceExcerpt
                });
            }
        }
        else {
            this._code = parameters.code;
            this._language = parameters.language;
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.FencedCode;
    }
    /**
     * A name that can optionally be included after the opening code fence delimiter,
     * on the same line as the three backticks.  This name indicates the programming language
     * for the code, which a syntax highlighter may use to style the code block.
     *
     * @remarks
     * The TSDoc standard requires that the language "ts" should be interpreted to mean TypeScript.
     * Other languages names may be supported, but this is implementation dependent.
     *
     * CommonMark refers to this field as the "info string".
     *
     * @privateRemarks
     * Examples of language strings supported by GitHub flavored markdown:
     * https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml
     */
    get language() {
        if (this._language === undefined) {
            if (this._languageExcerpt !== undefined) {
                this._language = this._languageExcerpt.content.toString();
            }
            else {
                this._language = '';
            }
        }
        return this._language;
    }
    /**
     * The text that should be rendered as code.
     */
    get code() {
        if (this._code === undefined) {
            if (this._codeExcerpt !== undefined) {
                this._code = this._codeExcerpt.content.toString();
            }
        }
        return this._code;
    }
    /** @override */
    onGetChildNodes() {
        return [
            this._openingFenceExcerpt,
            this._spacingAfterOpeningFenceExcerpt,
            this._languageExcerpt,
            this._spacingAfterLanguageExcerpt,
            this._codeExcerpt,
            this._spacingBeforeClosingFenceExcerpt,
            this._closingFenceExcerpt,
            this._spacingAfterClosingFenceExcerpt
        ];
    }
}
exports.DocFencedCode = DocFencedCode;
//# sourceMappingURL=DocFencedCode.js.map