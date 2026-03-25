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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocInlineTagBase = void 0;
var DocNode_1 = require("./DocNode");
var StringChecks_1 = require("../parser/StringChecks");
var DocExcerpt_1 = require("./DocExcerpt");
/**
 * The abstract base class for {@link DocInlineTag}, {@link DocLinkTag}, and {@link DocInheritDocTag}.
 */
var DocInlineTagBase = /** @class */ (function (_super) {
    __extends(DocInlineTagBase, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocInlineTagBase(parameters) {
        var _this = _super.call(this, parameters) || this;
        StringChecks_1.StringChecks.validateTSDocTagName(parameters.tagName);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            _this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            _this._tagNameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_TagName,
                content: parameters.tagNameExcerpt
            });
            if (parameters.spacingAfterTagNameExcerpt) {
                _this._spacingAfterTagNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterTagNameExcerpt
                });
            }
            _this._closingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        _this._tagName = parameters.tagName;
        _this._tagNameWithUpperCase = parameters.tagName.toUpperCase();
        return _this;
    }
    Object.defineProperty(DocInlineTagBase.prototype, "tagName", {
        /**
         * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
         * by ASCII letters using "camelCase" capitalization.
         *
         * @remarks
         * For example, if the inline tag is `{@link Guid.toString | the toString() method}`
         * then the tag name would be `@link`.
         */
        get: function () {
            return this._tagName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocInlineTagBase.prototype, "tagNameWithUpperCase", {
        /**
         * The TSDoc tag name in all capitals, which is used for performing
         * case-insensitive comparisons or lookups.
         */
        get: function () {
            return this._tagNameWithUpperCase;
        },
        enumerable: false,
        configurable: true
    });
    /** @override @sealed */
    DocInlineTagBase.prototype.onGetChildNodes = function () {
        return __spreadArray(__spreadArray([
            this._openingDelimiterExcerpt,
            this._tagNameExcerpt,
            this._spacingAfterTagNameExcerpt
        ], this.getChildNodesForContent(), true), [
            this._closingDelimiterExcerpt
        ], false);
    };
    return DocInlineTagBase;
}(DocNode_1.DocNode));
exports.DocInlineTagBase = DocInlineTagBase;
//# sourceMappingURL=DocInlineTagBase.js.map