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
 * The style of escaping to be used with DocEscapedText.
 */
export var EscapeStyle;
(function (EscapeStyle) {
    /**
     * Use a backslash symbol to escape the character.
     */
    EscapeStyle[EscapeStyle["CommonMarkBackslash"] = 0] = "CommonMarkBackslash";
})(EscapeStyle || (EscapeStyle = {}));
/**
 * Represents a text character that should be escaped as a TSDoc symbol.
 * @remarks
 * Note that renders will normally apply appropriate escaping when rendering
 * DocPlainText in a format such as HTML or TSDoc.  The DocEscapedText node
 * forces a specific escaping that may not be the default.
 */
var DocEscapedText = /** @class */ (function (_super) {
    __extends(DocEscapedText, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocEscapedText(parameters) {
        var _this = _super.call(this, parameters) || this;
        _this._escapeStyle = parameters.escapeStyle;
        _this._encodedTextExcerpt = new DocExcerpt({
            configuration: _this.configuration,
            excerptKind: ExcerptKind.EscapedText,
            content: parameters.encodedTextExcerpt
        });
        _this._decodedText = parameters.decodedText;
        return _this;
    }
    Object.defineProperty(DocEscapedText.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.EscapedText;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocEscapedText.prototype, "escapeStyle", {
        /**
         * The style of escaping to be performed.
         */
        get: function () {
            return this._escapeStyle;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocEscapedText.prototype, "encodedText", {
        /**
         * The text sequence including escapes.
         */
        get: function () {
            if (this._encodedText === undefined) {
                this._encodedText = this._encodedTextExcerpt.content.toString();
            }
            return this._encodedText;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocEscapedText.prototype, "decodedText", {
        /**
         * The text without escaping.
         */
        get: function () {
            return this._decodedText;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocEscapedText.prototype.onGetChildNodes = function () {
        return [this._encodedTextExcerpt];
    };
    return DocEscapedText;
}(DocNode));
export { DocEscapedText };
//# sourceMappingURL=DocEscapedText.js.map