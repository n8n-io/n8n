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
exports.DocInlineTag = void 0;
var DocNode_1 = require("./DocNode");
var DocExcerpt_1 = require("./DocExcerpt");
var DocInlineTagBase_1 = require("./DocInlineTagBase");
/**
 * Represents a generic TSDoc inline tag, including custom tags.
 *
 * @remarks
 * NOTE: Certain tags such as `{@link}` and `{@inheritDoc}` have specialized structures and parser rules,
 * and thus are represented using {@link DocLinkTag} or {@link DocInheritDocTag} instead.  However, if the
 * specialized parser rule encounters a syntax error, but the outer framing is correct, then the parser constructs
 * a generic `DocInlineTag` instead of `DocErrorText`.  This means, for example, that it is possible sometimes for
 * `DocInlineTag.tagName` to be `"@link"`.
 */
var DocInlineTag = /** @class */ (function (_super) {
    __extends(DocInlineTag, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocInlineTag(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            if (parameters.tagContentExcerpt) {
                _this._tagContentExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.InlineTag_TagContent,
                    content: parameters.tagContentExcerpt
                });
            }
        }
        else {
            _this._tagContent = parameters.tagContent;
        }
        return _this;
    }
    Object.defineProperty(DocInlineTag.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.InlineTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocInlineTag.prototype, "tagContent", {
        /**
         * The tag content.
         * @remarks
         * For example, if the tag is `{@myTag x=12.34 y=56.78 }` then the tag content
         * would be `x=12.34 y=56.78 `, including the trailing space but not the leading space.
         */
        get: function () {
            if (this._tagContent === undefined) {
                if (this._tagContentExcerpt) {
                    this._tagContent = this._tagContentExcerpt.content.toString();
                }
                else {
                    return '';
                }
            }
            return this._tagContent;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocInlineTag.prototype.getChildNodesForContent = function () {
        // abstract
        return [this._tagContentExcerpt];
    };
    return DocInlineTag;
}(DocInlineTagBase_1.DocInlineTagBase));
exports.DocInlineTag = DocInlineTag;
//# sourceMappingURL=DocInlineTag.js.map