"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocFencedCode = void 0;
var DocNode_1 = require("./DocNode");
var DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents CommonMark-style code fence, i.e. a block of program code that
 * starts and ends with a line comprised of three backticks.  The opening delimiter
 * can also specify a language for a syntax highlighter.
 */
var DocFencedCode = /** @class */ (function (_super) {
    __extends(DocFencedCode, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocFencedCode(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            _this._openingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_OpeningFence,
                content: parameters.openingFenceExcerpt
            });
            if (parameters.spacingAfterOpeningFenceExcerpt) {
                _this._spacingAfterOpeningFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterOpeningFenceExcerpt
                });
            }
            if (parameters.languageExcerpt) {
                _this._languageExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_Language,
                    content: parameters.languageExcerpt
                });
            }
            if (parameters.spacingAfterLanguageExcerpt) {
                _this._spacingAfterLanguageExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterLanguageExcerpt
                });
            }
            _this._codeExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_Code,
                content: parameters.codeExcerpt
            });
            if (parameters.spacingBeforeClosingFenceExcerpt) {
                _this._spacingBeforeClosingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingBeforeClosingFenceExcerpt
                });
            }
            _this._closingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.FencedCode_ClosingFence,
                content: parameters.closingFenceExcerpt
            });
            if (parameters.spacingAfterClosingFenceExcerpt) {
                _this._spacingAfterClosingFenceExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterClosingFenceExcerpt
                });
            }
        }
        else {
            _this._code = parameters.code;
            _this._language = parameters.language;
        }
        return _this;
    }
    Object.defineProperty(DocFencedCode.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.FencedCode;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocFencedCode.prototype, "language", {
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
        get: function () {
            if (this._language === undefined) {
                if (this._languageExcerpt !== undefined) {
                    this._language = this._languageExcerpt.content.toString();
                }
                else {
                    this._language = '';
                }
            }
            return this._language;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocFencedCode.prototype, "code", {
        /**
         * The text that should be rendered as code.
         */
        get: function () {
            if (this._code === undefined) {
                if (this._codeExcerpt !== undefined) {
                    this._code = this._codeExcerpt.content.toString();
                }
            }
            return this._code;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocFencedCode.prototype.onGetChildNodes = function () {
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
    };
    return DocFencedCode;
}(DocNode_1.DocNode));
exports.DocFencedCode = DocFencedCode;
//# sourceMappingURL=DocFencedCode.js.map