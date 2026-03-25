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
exports.DocHtmlEndTag = void 0;
var DocNode_1 = require("./DocNode");
var DocExcerpt_1 = require("./DocExcerpt");
var StringBuilder_1 = require("../emitters/StringBuilder");
var TSDocEmitter_1 = require("../emitters/TSDocEmitter");
/**
 * Represents an HTML end tag.  Example: `</a>`
 */
var DocHtmlEndTag = /** @class */ (function (_super) {
    __extends(DocHtmlEndTag, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocHtmlEndTag(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            _this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlEndTag_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            _this._nameExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlEndTag_Name,
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
                excerptKind: DocExcerpt_1.ExcerptKind.HtmlEndTag_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            _this._name = parameters.name;
        }
        return _this;
    }
    Object.defineProperty(DocHtmlEndTag.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.HtmlEndTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlEndTag.prototype, "name", {
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
    /**
     * Generates the HTML for this tag.
     */
    DocHtmlEndTag.prototype.emitAsHtml = function () {
        // NOTE: Here we're assuming that the TSDoc representation for a tag is also a valid HTML expression.
        var stringBuilder = new StringBuilder_1.StringBuilder();
        var emitter = new TSDocEmitter_1.TSDocEmitter();
        emitter.renderHtmlTag(stringBuilder, this);
        return stringBuilder.toString();
    };
    /** @override */
    DocHtmlEndTag.prototype.onGetChildNodes = function () {
        return [
            this._openingDelimiterExcerpt,
            this._nameExcerpt,
            this._spacingAfterNameExcerpt,
            this._closingDelimiterExcerpt
        ];
    };
    return DocHtmlEndTag;
}(DocNode_1.DocNode));
exports.DocHtmlEndTag = DocHtmlEndTag;
//# sourceMappingURL=DocHtmlEndTag.js.map