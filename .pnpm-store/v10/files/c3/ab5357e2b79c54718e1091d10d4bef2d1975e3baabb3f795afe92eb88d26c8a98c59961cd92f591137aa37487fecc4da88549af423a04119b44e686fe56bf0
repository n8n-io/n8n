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
exports.DocParamBlock = void 0;
var DocNode_1 = require("./DocNode");
var DocBlock_1 = require("./DocBlock");
var DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents a parsed `@param` or `@typeParam` block, which provides a description for a
 * function parameter.
 */
var DocParamBlock = /** @class */ (function (_super) {
    __extends(DocParamBlock, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocParamBlock(parameters) {
        var _this = _super.call(this, parameters) || this;
        _this._parameterName = parameters.parameterName;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            if (parameters.spacingBeforeParameterNameExcerpt) {
                _this._spacingBeforeParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingBeforeParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeBeforeParameterNameExcerpt) {
                _this._unsupportedJsdocTypeBeforeParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeBeforeParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocOptionalNameOpenBracketExcerpt) {
                _this._unsupportedJsdocOptionalNameOpenBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocOptionalNameOpenBracketExcerpt
                });
            }
            _this._parameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.ParamBlock_ParameterName,
                content: parameters.parameterNameExcerpt
            });
            if (parameters.unsupportedJsdocOptionalNameRestExcerpt) {
                _this._unsupportedJsdocOptionalNameRestExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocOptionalNameRestExcerpt
                });
            }
            if (parameters.spacingAfterParameterNameExcerpt) {
                _this._spacingAfterParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterParameterNameExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeAfterParameterNameExcerpt) {
                _this._unsupportedJsdocTypeAfterParameterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeAfterParameterNameExcerpt
                });
            }
            if (parameters.hyphenExcerpt) {
                _this._hyphenExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.ParamBlock_Hyphen,
                    content: parameters.hyphenExcerpt
                });
            }
            if (parameters.spacingAfterHyphenExcerpt) {
                _this._spacingAfterHyphenExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterHyphenExcerpt
                });
            }
            if (parameters.unsupportedJsdocTypeAfterHyphenExcerpt) {
                _this._unsupportedJsdocTypeAfterHyphenExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.NonstandardText,
                    content: parameters.unsupportedJsdocTypeAfterHyphenExcerpt
                });
            }
        }
        return _this;
    }
    Object.defineProperty(DocParamBlock.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.ParamBlock;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocParamBlock.prototype, "parameterName", {
        /**
         * The name of the parameter that is being documented.
         * For example "width" in `@param width - the width of the object`.
         */
        get: function () {
            return this._parameterName;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocParamBlock.prototype.onGetChildNodes = function () {
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
    };
    return DocParamBlock;
}(DocBlock_1.DocBlock));
exports.DocParamBlock = DocParamBlock;
//# sourceMappingURL=DocParamBlock.js.map