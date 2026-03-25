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
exports.DocHtmlStartTag = void 0;
var DocNode_1 = require("./DocNode");
var DocExcerpt_1 = require("./DocExcerpt");
var StringBuilder_1 = require("../emitters/StringBuilder");
var TSDocEmitter_1 = require("../emitters/TSDocEmitter");
/**
 * Represents an HTML start tag, which may or may not be self-closing.
 *
 * Example: `<a href="#" />`
 */
var DocHtmlStartTag = /** @class */ (function (_super) {
    __extends(DocHtmlStartTag, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocHtmlStartTag(parameters) {
        var _a;
        var _this = _super.call(this, parameters) || this;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            _this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlStartTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            _this._nameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlStartTag_Name,
                content: parameters.nameExcerpt
            });
            if (parameters.spacingAfterNameExcerpt) {
                _this._spacingAfterNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterNameExcerpt
                });
            }
            _this._closingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlStartTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            _this._name = parameters.name;
            _this._spacingAfterName = parameters.spacingAfterName;
        }
        _this._htmlAttributes = [];
        if (parameters.htmlAttributes) {
            (_a = _this._htmlAttributes).push.apply(_a, parameters.htmlAttributes);
        }
        _this._selfClosingTag = !!parameters.selfClosingTag;
        return _this;
    }
    Object.defineProperty(DocHtmlStartTag.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.HtmlStartTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlStartTag.prototype, "name", {
        /**
         * The HTML element name.
         */
        get: function () {
            if (this._name === undefined) {
                this._name = this._nameExcerpt.content.toString();
            }
            return this._name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlStartTag.prototype, "htmlAttributes", {
        /**
         * The HTML attributes belonging to this HTML element.
         */
        get: function () {
            return this._htmlAttributes;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlStartTag.prototype, "selfClosingTag", {
        /**
         * If true, then the HTML tag ends with `/>` instead of `>`.
         */
        get: function () {
            return this._selfClosingTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlStartTag.prototype, "spacingAfterName", {
        /**
         * Explicit whitespace that a renderer should insert after the HTML element name.
         * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
         */
        get: function () {
            if (this._spacingAfterName === undefined) {
                if (this._spacingAfterNameExcerpt !== undefined) {
                    this._spacingAfterName = this._spacingAfterNameExcerpt.content.toString();
                }
            }
            return this._spacingAfterName;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Generates the HTML for this tag.
     */
    DocHtmlStartTag.prototype.emitAsHtml = function () {
        // NOTE: Here we're assuming that the TSDoc representation for a tag is also a valid HTML expression.
        var stringBuilder = new StringBuilder_1.StringBuilder();
        var emitter = new TSDocEmitter_1.TSDocEmitter();
        emitter.renderHtmlTag(stringBuilder, this);
        return stringBuilder.toString();
    };
    /** @override */
    DocHtmlStartTag.prototype.onGetChildNodes = function () {
        return __spreadArray(__spreadArray([
            this._openingDelimiterExcerpt,
            this._nameExcerpt,
            this._spacingAfterNameExcerpt
        ], this._htmlAttributes, true), [
            this._closingDelimiterExcerpt
        ], false);
    };
    return DocHtmlStartTag;
}(DocNode_1.DocNode));
exports.DocHtmlStartTag = DocHtmlStartTag;
//# sourceMappingURL=DocHtmlStartTag.js.map