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
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents CommonMark-style code span, i.e. code surrounded by
 * backtick characters.
 */
var DocCodeSpan = /** @class */ (function (_super) {
    __extends(DocCodeSpan, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocCodeSpan(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode.isParsedParameters(parameters)) {
            _this._openingDelimiterExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.CodeSpan_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            _this._codeExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.CodeSpan_Code,
                content: parameters.codeExcerpt
            });
            _this._closingDelimiterExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.CodeSpan_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            _this._code = parameters.code;
        }
        return _this;
    }
    Object.defineProperty(DocCodeSpan.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.CodeSpan;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocCodeSpan.prototype, "code", {
        /**
         * The text that should be rendered as code, excluding the backtick delimiters.
         */
        get: function () {
            if (this._code === undefined) {
                this._code = this._codeExcerpt.content.toString();
            }
            return this._code;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocCodeSpan.prototype.onGetChildNodes = function () {
        return [this._openingDelimiterExcerpt, this._codeExcerpt, this._closingDelimiterExcerpt];
    };
    return DocCodeSpan;
}(DocNode));
export { DocCodeSpan };
//# sourceMappingURL=DocCodeSpan.js.map