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
exports.DocPlainText = void 0;
var DocNode_1 = require("./DocNode");
var DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents a span of comment text that is considered by the parser
 * to contain no special symbols or meaning.
 *
 * @remarks
 * The text content must not contain newline characters.
 * Use DocSoftBreak to represent manual line splitting.
 */
var DocPlainText = /** @class */ (function (_super) {
    __extends(DocPlainText, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocPlainText(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            _this._textExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.PlainText,
                content: parameters.textExcerpt
            });
        }
        else {
            if (DocPlainText._newlineCharacterRegExp.test(parameters.text)) {
                // Use DocSoftBreak to represent manual line splitting
                throw new Error('The DocPlainText content must not contain newline characters');
            }
            _this._text = parameters.text;
        }
        return _this;
    }
    Object.defineProperty(DocPlainText.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.PlainText;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocPlainText.prototype, "text", {
        /**
         * The text content.
         */
        get: function () {
            if (this._text === undefined) {
                this._text = this._textExcerpt.content.toString();
            }
            return this._text;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocPlainText.prototype, "textExcerpt", {
        get: function () {
            if (this._textExcerpt) {
                return this._textExcerpt.content;
            }
            else {
                return undefined;
            }
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocPlainText.prototype.onGetChildNodes = function () {
        return [this._textExcerpt];
    };
    // TODO: We should also prohibit "\r", but this requires updating LineExtractor
    // to interpret a lone "\r" as a newline
    DocPlainText._newlineCharacterRegExp = /[\n]/;
    return DocPlainText;
}(DocNode_1.DocNode));
exports.DocPlainText = DocPlainText;
//# sourceMappingURL=DocPlainText.js.map