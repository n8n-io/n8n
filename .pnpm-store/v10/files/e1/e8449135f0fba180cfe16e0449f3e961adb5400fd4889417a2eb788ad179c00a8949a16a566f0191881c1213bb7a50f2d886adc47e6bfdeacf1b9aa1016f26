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
import { DocNodeKind, DocNode } from './DocNode';
import { DocInlineTagBase } from './DocInlineTagBase';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents an `{@link}` tag.
 */
var DocLinkTag = /** @class */ (function (_super) {
    __extends(DocLinkTag, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocLinkTag(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (_this.tagNameWithUpperCase !== '@LINK') {
            throw new Error('DocLinkTag requires the tag name to be "{@link}"');
        }
        _this._codeDestination = parameters.codeDestination;
        if (DocNode.isParsedParameters(parameters)) {
            if (parameters.codeDestination !== undefined && parameters.urlDestinationExcerpt !== undefined) {
                throw new Error('Either the codeDestination or the urlDestination may be specified, but not both');
            }
            if (parameters.urlDestinationExcerpt) {
                _this._urlDestinationExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.LinkTag_UrlDestination,
                    content: parameters.urlDestinationExcerpt
                });
            }
            if (parameters.spacingAfterDestinationExcerpt) {
                _this._spacingAfterDestinationExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterDestinationExcerpt
                });
            }
            if (parameters.pipeExcerpt) {
                _this._pipeExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.LinkTag_Pipe,
                    content: parameters.pipeExcerpt
                });
            }
            if (parameters.spacingAfterPipeExcerpt) {
                _this._spacingAfterPipeExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterPipeExcerpt
                });
            }
            if (parameters.linkTextExcerpt) {
                _this._linkTextExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.LinkTag_LinkText,
                    content: parameters.linkTextExcerpt
                });
            }
            if (parameters.spacingAfterLinkTextExcerpt) {
                _this._spacingAfterLinkTextExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterLinkTextExcerpt
                });
            }
        }
        else {
            if (parameters.codeDestination !== undefined && parameters.urlDestination !== undefined) {
                throw new Error('Either the codeDestination or the urlDestination may be specified, but not both');
            }
            _this._urlDestination = parameters.urlDestination;
            _this._linkText = parameters.linkText;
        }
        return _this;
    }
    Object.defineProperty(DocLinkTag.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.LinkTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocLinkTag.prototype, "codeDestination", {
        /**
         * If the link tag refers to a declaration, this returns the declaration reference object;
         * otherwise this property is undefined.
         * @remarks
         * Either the `codeDestination` or the `urlDestination` property will be defined, but never both.
         */
        get: function () {
            return this._codeDestination;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocLinkTag.prototype, "urlDestination", {
        /**
         * If the link tag was an ordinary URI, this returns the URL string;
         * otherwise this property is undefined.
         * @remarks
         * Either the `codeDestination` or the `urlDestination` property will be defined, but never both.
         */
        get: function () {
            if (this._urlDestination === undefined) {
                if (this._urlDestinationExcerpt !== undefined) {
                    this._urlDestination = this._urlDestinationExcerpt.content.toString();
                }
            }
            return this._urlDestination;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocLinkTag.prototype, "linkText", {
        /**
         * An optional text string that is the hyperlink text.  If omitted, the documentation
         * renderer will use a default string based on the link itself (e.g. the URL text
         * or the declaration identifier).
         *
         * @remarks
         *
         * In HTML, the hyperlink can include leading/trailing space characters around the link text.
         * For example, this HTML will cause a web browser to `y` and also the space character before
         * and after it:
         *
         * ```html
         * x<a href="#Button"> y </a> z
         * ```
         *
         * Unlike HTML, TSDoc trims leading/trailing spaces.  For example, this TSDoc will be
         * displayed `xy z` and underline only the `y` character:
         *
         * ```
         * x{@link Button | y } z
         * ```
         */
        get: function () {
            if (this._linkText === undefined) {
                if (this._linkTextExcerpt !== undefined) {
                    this._linkText = this._linkTextExcerpt.content.toString();
                }
            }
            return this._linkText;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocLinkTag.prototype.getChildNodesForContent = function () {
        // abstract
        return [
            this._codeDestination,
            this._urlDestinationExcerpt,
            this._spacingAfterDestinationExcerpt,
            this._pipeExcerpt,
            this._spacingAfterPipeExcerpt,
            this._linkTextExcerpt,
            this._spacingAfterLinkTextExcerpt
        ];
    };
    return DocLinkTag;
}(DocInlineTagBase));
export { DocLinkTag };
//# sourceMappingURL=DocLinkTag.js.map